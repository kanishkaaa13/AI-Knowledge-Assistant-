from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from langchain_core.documents import Document as LangChainDocument
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.document_chunk import DocumentChunk
from app.models.uploaded_document import UploadedDocument
from app.models.user import User
from app.repositories.chunk import DocumentChunkRepository
from app.repositories.document import DocumentRepository
from app.schemas.rag import RetrievedChunk, RetrievalResponse
from app.services.llm_gateway import get_llm_gateway
from app.services.prompt_builder import build_rag_prompt
from app.services.text_chunker import DocumentChunker
from app.services.vector_store import get_vector_store


class RAGIngestionService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.chunk_repository = DocumentChunkRepository(db)
        self.vector_store = get_vector_store()
        self.chunker = DocumentChunker()

    def index_document(self, document: UploadedDocument) -> list[DocumentChunk]:
        if not document.extracted_text or not document.extracted_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document has no extractable text to index.",
            )

        existing_chunks = self.chunk_repository.list_by_document(document.id)
        if existing_chunks:
            self.delete_document_index(document.id)

        metadata = {
            "document_id": str(document.id),
            "document_title": document.title,
            "user_id": str(document.user_id),
            "file_name": document.file_name,
        }
        split_docs = self.chunker.chunk_text(text=document.extracted_text, metadata=metadata)

        chunk_payloads: list[dict] = []
        langchain_documents: list[LangChainDocument] = []
        vector_ids: list[str] = []

        for index, split_doc in enumerate(split_docs):
            vector_id = f"{document.id}:{index}"
            vector_ids.append(vector_id)
            chunk_payloads.append(
                {
                    "document_id": document.id,
                    "chunk_index": index,
                    "content": split_doc.page_content,
                    "token_count": len(split_doc.page_content.split()),
                    "vector_id": vector_id,
                }
            )
            langchain_documents.append(
                LangChainDocument(
                    page_content=split_doc.page_content,
                    metadata={
                        **split_doc.metadata,
                        "chunk_index": index,
                        "chunk_id": vector_id,
                    },
                )
            )

        created_chunks = self.chunk_repository.bulk_create(chunk_payloads)
        try:
            self.vector_store.add_documents(documents=langchain_documents, ids=vector_ids)
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
        vector_ids = [chunk.vector_id for chunk in chunks if chunk.vector_id]
        if vector_ids:
            self.vector_store.delete(ids=vector_ids)
        for chunk in chunks:
            self.db.delete(chunk)
        self.db.commit()


class RAGRetrievalService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.vector_store = get_vector_store()
        self.document_repository = DocumentRepository(db)
        self.chunk_repository = DocumentChunkRepository(db)

    def retrieve(self, *, user: User, query: str, top_k: int | None = None) -> RetrievalResponse:
        k = top_k or settings.RAG_TOP_K
        results = self.vector_store.similarity_search_with_relevance_scores(
            query=query,
            k=k,
            filter={"user_id": str(user.id)},
        )

        retrieved_chunks: list[RetrievedChunk] = []
        context_sections: list[str] = []

        for result_doc, score in results:
            document_id = uuid.UUID(result_doc.metadata["document_id"])
            chunk_index = int(result_doc.metadata["chunk_index"])
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
                    content=chunk.content,
                    score=float(score),
                    chunk_index=chunk.chunk_index,
                )
            )
            context_sections.append(
                f"[{db_document.title} | chunk {chunk.chunk_index}]\n{chunk.content}"
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

    def answer_query(self, *, user: User, query: str, top_k: int | None = None) -> dict:
        retrieval = self.retrieval_service.retrieve(user=user, query=query, top_k=top_k)
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
