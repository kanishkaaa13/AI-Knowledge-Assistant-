import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document_chunk import DocumentChunk
from app.models.uploaded_document import UploadedDocument
from app.repositories.base import BaseRepository


class DocumentRepository(BaseRepository[UploadedDocument]):
    def __init__(self, db: Session) -> None:
        super().__init__(UploadedDocument, db)

    def list_by_user(self, user_id: uuid.UUID) -> list[UploadedDocument]:
        statement = (
            select(UploadedDocument)
            .where(UploadedDocument.user_id == user_id)
            .order_by(UploadedDocument.updated_at.desc())
        )
        return list(self.db.scalars(statement).all())

    def get_by_user(self, document_id: uuid.UUID, user_id: uuid.UUID) -> UploadedDocument | None:
        statement = select(UploadedDocument).where(
            UploadedDocument.id == document_id,
            UploadedDocument.user_id == user_id,
        )
        return self.db.scalar(statement)

    def get_by_user_and_checksum(
        self, user_id: uuid.UUID, checksum: str
    ) -> UploadedDocument | None:
        statement = select(UploadedDocument).where(
            UploadedDocument.user_id == user_id,
            UploadedDocument.checksum == checksum,
        )
        return self.db.scalar(statement)

    def list_chunks(self, document_id: uuid.UUID) -> list[DocumentChunk]:
        statement = (
            select(DocumentChunk)
            .where(DocumentChunk.document_id == document_id)
            .order_by(DocumentChunk.chunk_index.asc())
        )
        return list(self.db.scalars(statement).all())
