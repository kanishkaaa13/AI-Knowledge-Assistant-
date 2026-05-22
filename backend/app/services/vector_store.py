from __future__ import annotations

import re
import uuid
from dataclasses import dataclass
from pathlib import Path

import chromadb
from chromadb import PersistentClient

from app.core.config import settings
from app.services.embeddings import get_embedding_model


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
    keyword_score: float
    combined_score: float


class ChromaVectorStoreService:
    def __init__(self) -> None:
        persist_directory = Path(settings.CHROMA_PERSIST_DIRECTORY)
        persist_directory.mkdir(parents=True, exist_ok=True)
        self.client: PersistentClient = chromadb.PersistentClient(path=str(persist_directory))
        self.embedding_model = get_embedding_model()

    def _collection_name(self, user_id: uuid.UUID) -> str:
        slug = re.sub(r"[^a-zA-Z0-9_-]+", "-", str(user_id))
        return f"{settings.CHROMA_COLLECTION_NAME}_{slug}"

    def _collection(self, user_id: uuid.UUID):
        return self.client.get_or_create_collection(name=self._collection_name(user_id))

    def upsert_vectors(self, *, user_id: uuid.UUID, records: list[VectorRecord]) -> None:
        if not records:
            return

        collection = self._collection(user_id)
        documents = [record.document for record in records]
        embeddings = self.embedding_model.embed_documents(documents)
        metadatas = []
        for record in records:
            metadata = dict(record.metadata)
            metadata.setdefault("user_id", str(user_id))
            metadatas.append(metadata)
        collection.upsert(
            ids=[record.id for record in records],
            documents=documents,
            metadatas=metadatas,
            embeddings=embeddings,
        )

    def update_vectors(self, *, user_id: uuid.UUID, records: list[VectorRecord]) -> None:
        self.upsert_vectors(user_id=user_id, records=records)

    def delete_vectors(
        self,
        *,
        user_id: uuid.UUID,
        ids: list[str] | None = None,
        where: dict | None = None,
    ) -> None:
        if not ids and not where:
            return
        collection = self._collection(user_id)
        collection.delete(ids=ids, where=where)

    def semantic_similarity_search(
        self,
        *,
        user_id: uuid.UUID,
        query: str,
        top_k: int,
    ) -> list[VectorSearchResult]:
        collection = self._collection(user_id)
        query_embedding = self.embedding_model.embed_query(query)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where={"user_id": str(user_id)},
            include=["documents", "metadatas", "distances"],
        )
        return self._format_query_results(results)

    def hybrid_similarity_search(
        self,
        *,
        user_id: uuid.UUID,
        query: str,
        top_k: int,
    ) -> list[VectorSearchResult]:
        semantic_results = self.semantic_similarity_search(
            user_id=user_id,
            query=query,
            top_k=max(top_k * 3, top_k),
        )

        query_terms = {term for term in re.findall(r"\w+", query.lower()) if term}
        reranked_results: list[VectorSearchResult] = []

        for result in semantic_results:
            document_terms = set(re.findall(r"\w+", result.document.lower()))
            overlap = len(query_terms & document_terms)
            keyword_score = overlap / max(len(query_terms), 1)
            combined_score = (result.semantic_score * 0.75) + (keyword_score * 0.25)
            reranked_results.append(
                VectorSearchResult(
                    id=result.id,
                    document=result.document,
                    metadata=result.metadata,
                    distance=result.distance,
                    semantic_score=result.semantic_score,
                    keyword_score=keyword_score,
                    combined_score=combined_score,
                )
            )

        reranked_results.sort(key=lambda item: item.combined_score, reverse=True)
        return reranked_results[:top_k]

    def _format_query_results(self, results: dict) -> list[VectorSearchResult]:
        ids = results.get("ids", [[]])[0]
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        formatted: list[VectorSearchResult] = []
        for vector_id, document, metadata, distance in zip(ids, documents, metadatas, distances):
            semantic_score = max(0.0, 1.0 - float(distance or 0.0))
            formatted.append(
                VectorSearchResult(
                    id=vector_id,
                    document=document,
                    metadata=metadata or {},
                    distance=float(distance or 0.0),
                    semantic_score=semantic_score,
                    keyword_score=0.0,
                    combined_score=semantic_score,
                )
            )
        return formatted


_vector_store_service: ChromaVectorStoreService | None = None


def get_vector_store_service() -> ChromaVectorStoreService:
    global _vector_store_service
    if _vector_store_service is None:
        _vector_store_service = ChromaVectorStoreService()
    return _vector_store_service
