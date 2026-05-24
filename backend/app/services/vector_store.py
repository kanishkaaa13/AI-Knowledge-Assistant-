from __future__ import annotations

import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import chromadb
from chromadb import PersistentClient
from sentence_transformers import SentenceTransformer


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


class VectorStoreService:
    """Vector store service using ChromaDB and Sentence-Transformers for semantic search."""

    def __init__(self, persist_directory: str = "storage/chromadb", model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize the vector store service.

        Args:
            persist_directory: Path to store ChromaDB data
            model_name: HuggingFace model name for embeddings
        """
        persist_path = Path(persist_directory)
        persist_path.mkdir(parents=True, exist_ok=True)
        
        self.client: PersistentClient = chromadb.PersistentClient(path=str(persist_path))
        self.embedding_model = SentenceTransformer(model_name)
        self.model_name = model_name

    def _collection_name(self, user_id: uuid.UUID) -> str:
        """
        Generate user-isolated collection name.

        Args:
            user_id: User UUID

        Returns:
            Collection name in format 'user_collection_{user_id}'
        """
        return f"user_collection_{user_id}"

    def _get_or_create_collection(self, user_id: uuid.UUID):
        """
        Get or create user-isolated collection.

        Args:
            user_id: User UUID

        Returns:
            ChromaDB collection
        """
        collection_name = self._collection_name(user_id)
        return self.client.get_or_create_collection(name=collection_name)

    def add_documents_to_vector_store(
        self,
        user_id: uuid.UUID,
        chunks_list: list[dict[str, Any]],
    ) -> None:
        """
        Vectorize text chunks and save to ChromaDB with metadata.

        Args:
            user_id: User UUID for collection isolation
            chunks_list: List of dicts with 'id', 'content', and metadata fields
                        Expected metadata: 'document_id', 'filename', 'chunk_index'
        """
        if not chunks_list:
            return

        collection = self._get_or_create_collection(user_id)

        # Extract data
        ids = [str(chunk.get("id", "")) for chunk in chunks_list]
        documents = [chunk.get("content", "") for chunk in chunks_list]
        
        # Prepare metadata with required fields
        metadatas = []
        for chunk in chunks_list:
            metadata = dict(chunk.get("metadata", {}))
            # Ensure required metadata fields
            metadata["user_id"] = str(user_id)
            metadata.setdefault("document_id", chunk.get("document_id", ""))
            metadata.setdefault("filename", chunk.get("filename", ""))
            metadata.setdefault("chunk_index", chunk.get("chunk_index", 0))
            metadatas.append(metadata)

        # Generate embeddings
        embeddings = self.embedding_model.encode(documents, show_progress_bar=False).tolist()

        # Upsert to ChromaDB
        collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
            embeddings=embeddings,
        )

    def similarity_search(
        self,
        user_id: uuid.UUID,
        query: str,
        top_k: int = 4,
    ) -> list[VectorSearchResult]:
        """
        Perform semantic similarity search on user's collection.

        Args:
            user_id: User UUID for collection isolation
            query: Search query text
            top_k: Number of top results to return

        Returns:
            List of VectorSearchResult with document, metadata, and scores
        """
        collection = self._get_or_create_collection(user_id)

        # Generate query embedding
        query_embedding = self.embedding_model.encode(query, show_progress_bar=False).tolist()

        # Query ChromaDB
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where={"user_id": str(user_id)},
            include=["documents", "metadatas", "distances"],
        )

        # Format results
        formatted_results = []
        ids = results.get("ids", [[]])[0]
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for vector_id, document, metadata, distance in zip(ids, documents, metadatas, distances):
            # Convert distance to similarity score (ChromaDB uses cosine distance)
            semantic_score = max(0.0, 1.0 - float(distance or 0.0))
            
            formatted_results.append(
                VectorSearchResult(
                    id=vector_id,
                    document=document,
                    metadata=metadata or {},
                    distance=float(distance or 0.0),
                    semantic_score=semantic_score,
                )
            )

        return formatted_results

    def delete_documents(
        self,
        user_id: uuid.UUID,
        document_ids: list[str] | None = None,
    ) -> None:
        """
        Delete documents from user's collection.

        Args:
            user_id: User UUID for collection isolation
            document_ids: List of document IDs to delete (optional)
        """
        if not document_ids:
            return

        collection = self._get_or_create_collection(user_id)
        collection.delete(where={"document_id": {"$in": document_ids}})

    def delete_collection(self, user_id: uuid.UUID) -> None:
        """
        Delete entire user collection.

        Args:
            user_id: User UUID for collection isolation
        """
        collection_name = self._collection_name(user_id)
        try:
            self.client.delete_collection(name=collection_name)
        except Exception:
            # Collection might not exist
            pass


_vector_store_service: VectorStoreService | None = None


def get_vector_store_service() -> VectorStoreService:
    """Get singleton instance of VectorStoreService."""
    global _vector_store_service
    if _vector_store_service is None:
        _vector_store_service = VectorStoreService()
    return _vector_store_service
