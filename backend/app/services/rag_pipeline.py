from __future__ import annotations

import logging
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.cache import app_cache
from app.core.config import settings
from app.models.document_chunk import DocumentChunk
from app.models.uploaded_document import UploadedDocument
from app.models.user import User
from app.repositories.chunk import DocumentChunkRepository
from app.repositories.document import DocumentRepository
from app.schemas.rag import RetrievedChunk, RetrievalResponse
from app.services.document_parser import StoredDocumentParser
from app.services.text_chunker import DocumentChunker
from app.services.vector_store import VectorRecord, VectorSearchResult, get_vector_store_service

logger = logging.getLogger(__name__)


class RAGIngestionService:
    """Handles indexing documents into ChromaDB (sync ingestion path)."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.chunk_repository = DocumentChunkRepository(db)
        self.vector_store = get_vector_store_service()
        self.chunker = DocumentChunker()
        self.parser = StoredDocumentParser()

    def index_document(self, document: UploadedDocument) -> list[DocumentChunk]:
        if not document.extracted_text or not document.extracted_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document has no extractable text to index.",
            )

        existing_chunks = self.chunk_repository.list_by_document(document.id)
        if existing_chunks:
            self.delete_document_index(document.id)

        pages = self.parser.parse(document)
        if not pages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to parse stored document for indexing.",
            )

        base_metadata = {
            "document_id": str(document.id),
            "document_title": document.title,
            "user_id": str(document.user_id),
            "filename": document.file_name,
            "upload_timestamp": document.created_at.isoformat(),
            "tags": document.tags or "",
        }
        split_docs = self.chunker.chunk_pages(pages=pages, metadata=base_metadata)

        chunk_payloads: list[dict] = []
        vector_records: list[VectorRecord] = []

        for index, split_doc in enumerate(split_docs):
            vector_id = f"{document.id}:{index}"
            chunk_payloads.append(
                {
                    "document_id": document.id,
                    "chunk_index": index,
                    "page_number": split_doc.page_number,
                    "content": split_doc.content,
                    "token_count": len(split_doc.content.split()),
                    "vector_id": vector_id,
                }
            )
            vector_records.append(
                VectorRecord(
                    id=vector_id,
                    document=split_doc.content,
                    metadata={
                        **split_doc.metadata,
                        "chunk_index": index,
                        "chunk_id": vector_id,
                        "page": str(split_doc.page_number or 1),
                    },
                )
            )

        created_chunks = self.chunk_repository.bulk_create(chunk_payloads)
        try:
            logger.info(
                "Indexing %d chunks into ChromaDB for document %s…",
                len(vector_records),
                document.id,
            )
            self.vector_store.upsert_vectors(user_id=document.user_id, records=vector_records)
        except Exception:
            logger.exception("ChromaDB upsert failed — rolling back chunk records.")
            for chunk in created_chunks:
                self.db.delete(chunk)
            self.db.commit()
            raise

        document.status = "indexed"
        document.processing_error = None
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)
        app_cache.delete_prefix(f"retrieval:{document.user_id}:")
        logger.info("Document %s indexed successfully (%d chunks).", document.id, len(created_chunks))
        return created_chunks

    def delete_document_index(self, document_id: uuid.UUID) -> None:
        chunks = self.chunk_repository.list_by_document(document_id)
        if not chunks:
            return

        document = chunks[0].document
        vector_ids = [chunk.vector_id for chunk in chunks if chunk.vector_id]
        if vector_ids:
            self.vector_store.delete_vectors(user_id=document.user_id, ids=vector_ids)
        for chunk in chunks:
            self.db.delete(chunk)
        self.db.commit()
        app_cache.delete_prefix(f"retrieval:{document.user_id}:")

    def update_document_index(self, document: UploadedDocument) -> list[DocumentChunk]:
        return self.index_document(document)


class RAGRetrievalService:
    """Retrieves relevant chunks from ChromaDB for a given query (async retrieval path)."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.vector_store = get_vector_store_service()
        self.document_repository = DocumentRepository(db)
        self.chunk_repository = DocumentChunkRepository(db)

    async def retrieve(
        self,
        *,
        user: User,
        query: str,
        top_k: int | None = None,
        hybrid: bool = True,
        document_ids: list[str] | None = None,
    ) -> RetrievalResponse:
        normalized_ids = sorted(document_ids or [])
        cache_key = (
            f"retrieval:{user.id}:{query}:{top_k}:{hybrid}:{','.join(normalized_ids)}"
        )
        cached = app_cache.get(cache_key)
        if cached:
            return cached

        k = top_k or settings.RAG_TOP_K
        allowed_document_ids = (
            {uuid.UUID(item) for item in normalized_ids} if normalized_ids else set()
        )

        print(f"[RAG] document_ids received: {normalized_ids!r}")
        print(f"[RAG] user_id: {user.id!r}")
        print(f"[RAG] Running similarity search...")

        # Both hybrid and semantic now use the same async similarity_search
        results: list[VectorSearchResult]
        if hybrid:
            results = await self.vector_store.hybrid_similarity_search(
                user_id=user.id, query=query, top_k=max(k, 6), document_ids=normalized_ids
            )
        else:
            results = await self.vector_store.semantic_similarity_search(
                user_id=user.id, query=query, top_k=max(k, 6), document_ids=normalized_ids
            )

        print(f"[RAG] Results count: {len(results)}")
        if results:
            print(f"[RAG] First result preview: {str(results[0])[:200]}")
        else:
            print(f"[RAG] NO RESULTS FOUND")

        retrieved_chunks: list[RetrievedChunk] = []
        context_sections: list[str] = []
        chunk_lookup: dict[tuple[uuid.UUID, int], DocumentChunk] = {}

        raw_document_ids: list[uuid.UUID] = []
        for result in results:
            doc_id_str = result.metadata.get("document_id", "")
            if not doc_id_str:
                continue
            try:
                raw_document_id = uuid.UUID(doc_id_str)
            except ValueError:
                continue
            if allowed_document_ids and raw_document_id not in allowed_document_ids:
                continue
            raw_document_ids.append(raw_document_id)

        unique_document_ids = sorted(set(raw_document_ids), key=lambda item: str(item))
        documents = {
            document.id: document
            for document in self.document_repository.list_by_ids(user.id, unique_document_ids)
        }
        for chunk in self.chunk_repository.list_by_documents(unique_document_ids):
            chunk_lookup[(chunk.document_id, chunk.chunk_index)] = chunk

        for result in results:
            doc_id_str = result.metadata.get("document_id", "")
            if not doc_id_str:
                continue
            try:
                document_id = uuid.UUID(doc_id_str)
            except ValueError:
                continue
            if allowed_document_ids and document_id not in allowed_document_ids:
                continue
            db_document = documents.get(document_id)
            if not db_document:
                continue
            chunk_index = int(result.metadata.get("chunk_index", 0))
            chunk = chunk_lookup.get((document_id, chunk_index))
            if not chunk:
                continue

            retrieved_chunks.append(
                RetrievedChunk(
                    chunk_id=chunk.id,
                    document_id=db_document.id,
                    document_title=db_document.title,
                    filename=db_document.file_name,
                    page=chunk.page_number,
                    content=chunk.content,
                    score=float(result.combined_score),
                    semantic_score=float(result.semantic_score),
                    keyword_score=float(result.keyword_score),
                    chunk_index=chunk.chunk_index,
                    upload_timestamp=db_document.created_at.isoformat(),
                )
            )
            context_sections.append(
                f"[{db_document.title} | page {chunk.page_number or 1} | chunk {chunk.chunk_index}]\n{chunk.content}"
            )
            if len(retrieved_chunks) >= k:
                break

        response = RetrievalResponse(
            query=query,
            top_k=k,
            chunks=retrieved_chunks,
            context="\n\n".join(context_sections),
        )
        app_cache.set(cache_key, response, ttl_seconds=45)
        return response
