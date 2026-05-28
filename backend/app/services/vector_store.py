from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import chromadb
from chromadb import PersistentClient
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


@dataclass
class VectorRecord:
    id: str
    document: str
    metadata: dict


@dataclass
class VectorSearchResult:
    id: str
    document: str
    metadata: dict
    distance: float
    semantic_score: float
    # Derived fields (no BM25 yet — keyword score defaults to 0)
    keyword_score: float = field(default=0.0)

    @property
    def combined_score(self) -> float:
        """Weighted combination of semantic + keyword scores."""
        return 0.7 * self.semantic_score + 0.3 * self.keyword_score


class VectorStoreService:
    """
    Vector store service using ChromaDB and Sentence-Transformers for semantic search.

    Embedding model is loaded lazily — synchronously for sync callers, asynchronously
    for async callers — to avoid blocking the event loop on first use.
    """

    def __init__(
        self,
        persist_directory: str = "storage/chromadb",
        model_name: str = "all-MiniLM-L6-v2",
    ) -> None:
        persist_path = Path(persist_directory)
        persist_path.mkdir(parents=True, exist_ok=True)

        self.client: PersistentClient = chromadb.PersistentClient(path=str(persist_path))
        self.model_name = model_name
        self._embedding_model: SentenceTransformer | None = None

    # ------------------------------------------------------------------
    # Embedding model loading — sync and async variants
    # ------------------------------------------------------------------

    def _get_embedding_model_sync(self) -> SentenceTransformer:
        """Load (or return cached) embedding model synchronously.

        Safe to call from regular (blocking) code paths such as document
        upload post-processing or the threadpool inside ``similarity_search``.
        """
        if self._embedding_model is None:
            logger.info("Loading sentence-transformer model '%s' (sync)…", self.model_name)
            self._embedding_model = SentenceTransformer(self.model_name)
            logger.info("Embedding model loaded.")
        return self._embedding_model

    async def _get_embedding_model_async(self) -> SentenceTransformer:
        """Load (or return cached) embedding model without blocking the event loop."""
        if self._embedding_model is None:
            logger.info("Loading sentence-transformer model '%s' (async)…", self.model_name)
            self._embedding_model = await asyncio.to_thread(
                SentenceTransformer, self.model_name
            )
            logger.info("Embedding model loaded.")
        return self._embedding_model

    # ------------------------------------------------------------------
    # Collection helpers
    # ------------------------------------------------------------------

    def _collection_name(self, user_id: uuid.UUID) -> str:
        return f"user_collection_{user_id}"

    def _get_or_create_collection(self, user_id: uuid.UUID):
        return self.client.get_or_create_collection(name=self._collection_name(user_id))

    # ------------------------------------------------------------------
    # Write operations (synchronous — called from upload/ingestion paths)
    # ------------------------------------------------------------------

    def add_documents_to_vector_store(
        self,
        user_id: uuid.UUID,
        chunks_list: list[dict[str, Any]],
    ) -> None:
        """Vectorize text chunks and upsert into ChromaDB.

        This is a **synchronous** method.  Call it from a threadpool or from
        regular (non-async) ingestion code.  Do NOT ``await`` it.
        """
        if not chunks_list:
            return

        model = self._get_embedding_model_sync()
        collection = self._get_or_create_collection(user_id)

        ids = [str(chunk.get("id", "")) for chunk in chunks_list]
        documents = [chunk.get("content", "") for chunk in chunks_list]

        metadatas: list[dict] = []
        for chunk in chunks_list:
            metadata = dict(chunk.get("metadata", {}))
            metadata["user_id"] = str(user_id)
            metadata.setdefault("document_id", chunk.get("document_id", ""))
            metadata.setdefault("filename", chunk.get("filename", ""))
            metadata.setdefault("chunk_index", chunk.get("chunk_index", 0))
            # Stringify any list/dict values — ChromaDB only supports scalar metadata
            for k, v in list(metadata.items()):
                if not isinstance(v, (str, int, float, bool)):
                    metadata[k] = str(v)
            metadatas.append(metadata)

        logger.debug(
            "Generating embeddings for %d chunks (user=%s)…", len(documents), user_id
        )
        embeddings = model.encode(documents, show_progress_bar=False).tolist()

        print(f"[INDEX] Collection: {collection.name}")
        if metadatas:
            print(f"[INDEX] Metadata on chunks: {metadatas[0]}")
        print(f"[INDEX] Upserting {len(ids)} vectors into ChromaDB")

        collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
            embeddings=embeddings,
        )
        print(f"[INDEX] Upsert complete. Collection now has {collection.count()} total vectors.")
        logger.info("Upserted %d vectors for user %s.", len(ids), user_id)

    def upsert_vectors(self, user_id: uuid.UUID, records: list[VectorRecord]) -> None:
        """Upsert pre-built VectorRecord objects into the user's collection."""
        if not records:
            return

        chunks_list = [
            {
                "id": r.id,
                "content": r.document,
                "metadata": r.metadata,
                "document_id": r.metadata.get("document_id", ""),
                "filename": r.metadata.get("filename", ""),
                "chunk_index": r.metadata.get("chunk_index", 0),
            }
            for r in records
        ]
        self.add_documents_to_vector_store(user_id, chunks_list)

    def delete_vectors(self, user_id: uuid.UUID, ids: list[str]) -> None:
        """Delete specific vectors by ID."""
        if not ids:
            return
        collection = self._get_or_create_collection(user_id)
        collection.delete(ids=ids)

    def delete_documents(
        self,
        user_id: uuid.UUID,
        document_ids: list[str] | None = None,
    ) -> None:
        """Delete all chunks belonging to the given document IDs."""
        if not document_ids:
            return
        collection = self._get_or_create_collection(user_id)
        collection.delete(where={"document_id": {"$in": document_ids}})

    def delete_collection(self, user_id: uuid.UUID) -> None:
        """Delete the entire user collection."""
        try:
            self.client.delete_collection(name=self._collection_name(user_id))
        except Exception:
            pass

    # ------------------------------------------------------------------
    # Read operations (async — called from API route handlers)
    # ------------------------------------------------------------------

    async def similarity_search(
        self,
        user_id: uuid.UUID,
        query: str,
        top_k: int = 4,
        document_ids: list[str] | None = None,
    ) -> list[VectorSearchResult]:
        """Semantic similarity search — async, non-blocking."""

        def _search_sync(model: SentenceTransformer) -> list[VectorSearchResult]:
            collection = self._get_or_create_collection(user_id)

            # Verify the collection has data
            count = collection.count()
            print(f"[RAG] Query: {query!r}")
            print(f"[RAG] Selected doc IDs: {document_ids!r}")
            print(f"[RAG] ChromaDB collection '{self._collection_name(user_id)}' has {count} total vectors")

            if count == 0:
                print(f"[RAG] Collection is EMPTY — documents may not have been indexed yet")
                logger.debug("Collection for user %s is empty.", user_id)
                return []

            query_embedding = model.encode(query, show_progress_bar=False).tolist()

            where_clause: dict = {"user_id": str(user_id)}
            if document_ids:
                if len(document_ids) == 1:
                    where_clause = {
                        "$and": [
                            {"user_id": str(user_id)},
                            {"document_id": document_ids[0]},
                        ]
                    }
                else:
                    where_clause = {
                        "$and": [
                            {"user_id": str(user_id)},
                            {"document_id": {"$in": document_ids}},
                        ]
                    }

            print(f"[RAG 3] Query embedding shape: {len(query_embedding)}")
            print(f"[QUERY] Filter used: {where_clause}")

            # Clamp n_results to the actual collection size
            n_results = min(top_k, count)

            try:
                results = collection.query(
                    query_embeddings=[query_embedding],
                    n_results=n_results,
                    where=where_clause,
                    include=["documents", "metadatas", "distances"],
                )
            except Exception as e:
                print(f"[RAG] ChromaDB query FAILED: {e}")
                # If filter caused error, try without filter as fallback
                try:
                    print(f"[RAG] Retrying without document_id filter...")
                    results = collection.query(
                        query_embeddings=[query_embedding],
                        n_results=n_results,
                        where={"user_id": str(user_id)},
                        include=["documents", "metadatas", "distances"],
                    )
                    print(f"[RAG] Fallback query returned {len(results.get('ids', [[]])[0])} results")
                except Exception as e2:
                    print(f"[RAG] Fallback query also FAILED: {e2}")
                    return []

            ids_list = results.get("ids", [[]])[0]
            docs_list = results.get("documents", [[]])[0]
            meta_list = results.get("metadatas", [[]])[0]
            dist_list = results.get("distances", [[]])[0]

            print(f"[RAG] ChromaDB returned {len(ids_list)} results")
            if meta_list:
                print(f"[RAG] First result metadata: {meta_list[0]}")

            formatted: list[VectorSearchResult] = []
            for vid, doc, meta, dist in zip(ids_list, docs_list, meta_list, dist_list):
                semantic_score = max(0.0, 1.0 - float(dist or 0.0))
                formatted.append(
                    VectorSearchResult(
                        id=vid,
                        document=doc,
                        metadata=meta or {},
                        distance=float(dist or 0.0),
                        semantic_score=semantic_score,
                    )
                )
            return formatted

        model = await self._get_embedding_model_async()
        return await asyncio.to_thread(_search_sync, model)

    # Kept for API compatibility — delegates to similarity_search
    async def hybrid_similarity_search(
        self,
        user_id: uuid.UUID,
        query: str,
        top_k: int = 4,
        document_ids: list[str] | None = None,
    ) -> list[VectorSearchResult]:
        """Hybrid search (currently pure semantic; BM25 not yet integrated)."""
        return await self.similarity_search(user_id, query, top_k, document_ids)

    async def semantic_similarity_search(
        self,
        user_id: uuid.UUID,
        query: str,
        top_k: int = 4,
        document_ids: list[str] | None = None,
    ) -> list[VectorSearchResult]:
        """Pure semantic search alias."""
        return await self.similarity_search(user_id, query, top_k, document_ids)


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------

_vector_store_service: VectorStoreService | None = None


def get_vector_store_service() -> VectorStoreService:
    """Return the application-wide singleton VectorStoreService."""
    global _vector_store_service
    if _vector_store_service is None:
        from app.core.config import settings
        _vector_store_service = VectorStoreService(
            persist_directory=settings.CHROMA_PERSIST_DIRECTORY,
            model_name=settings.EMBEDDING_MODEL_NAME,
        )
    return _vector_store_service
