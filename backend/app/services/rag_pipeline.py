from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.document_chunk import DocumentChunk
from app.models.uploaded_document import UploadedDocument
from app.models.user import User
from app.repositories.chunk import DocumentChunkRepository
from app.repositories.document import DocumentRepository
from app.schemas.rag import RetrievedChunk, RetrievalResponse
from app.services.document_parser import StoredDocumentParser
from app.services.llm_gateway import get_llm_gateway
from app.services.prompt_builder import build_rag_prompt
from app.services.text_chunker import DocumentChunker
from app.services.vector_store import VectorRecord, get_vector_store_service


class RAGIngestionService:
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
                        "page": split_doc.page_number,
                    },
                )
            )

        created_chunks = self.chunk_repository.bulk_create(chunk_payloads)
        try:
            self.vector_store.upsert_vectors(user_id=document.user_id, records=vector_records)
        except Exception:
            for chunk in created_chunks:
                self.db.delete(chunk)
            self.db.commit()
            raise

        document.status = "indexed"
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)
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

    def update_document_index(self, document: UploadedDocument) -> list[DocumentChunk]:
        return self.index_document(document)


class RAGRetrievalService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.vector_store = get_vector_store_service()
        self.document_repository = DocumentRepository(db)
        self.chunk_repository = DocumentChunkRepository(db)

    def retrieve(
        self,
        *,
        user: User,
        query: str,
        top_k: int | None = None,
        hybrid: bool = True,
    ) -> RetrievalResponse:
        k = top_k or settings.RAG_TOP_K
        results = (
            self.vector_store.hybrid_similarity_search(user_id=user.id, query=query, top_k=k)
            if hybrid
            else self.vector_store.semantic_similarity_search(user_id=user.id, query=query, top_k=k)
        )

        retrieved_chunks: list[RetrievedChunk] = []
        context_sections: list[str] = []

        for result in results:
            document_id = uuid.UUID(result.metadata["document_id"])
            chunk_index = int(result.metadata["chunk_index"])
            db_document = self.document_repository.get_by_user(document_id, user.id)
            if not db_document:
                continue

            chunk = next(
                (
                    item
                    for item in self.chunk_repository.list_by_document(document_id)
                    if item.chunk_index == chunk_index
                ),
                None,
            )
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

        return RetrievalResponse(
            query=query,
            top_k=k,
            chunks=retrieved_chunks,
            context="\n\n".join(context_sections),
        )


class RAGAnswerService:
    def __init__(self, db: Session) -> None:
        self.retrieval_service = RAGRetrievalService(db)

    def answer_query(
        self,
        *,
        user: User,
        query: str,
        top_k: int | None = None,
        hybrid: bool = True,
    ) -> dict:
        retrieval = self.retrieval_service.retrieve(
            user=user,
            query=query,
            top_k=top_k,
            hybrid=hybrid,
        )
        if not retrieval.chunks:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No relevant indexed chunks were found for this query.",
            )

        prompt = build_rag_prompt(query=query, context=retrieval.context)
        answer = get_llm_gateway().generate(prompt)
        return {
            "query": query,
            "answer": answer,
            "context": retrieval.context,
            "chunks": retrieval.chunks,
            "prompt": prompt,
        }
