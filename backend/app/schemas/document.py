import uuid

from pydantic import Field

from app.schemas.common import ORMBaseSchema, TimestampSchema


class UploadedDocumentBase(ORMBaseSchema):
    title: str = Field(min_length=1, max_length=255)
    file_name: str = Field(min_length=1, max_length=255)
    file_path: str | None = Field(default=None, max_length=500)
    mime_type: str | None = Field(default=None, max_length=120)
    file_size: int | None = Field(default=None, ge=0)
    status: str = Field(default="uploaded", min_length=1, max_length=50)
    extracted_text: str | None = None


class UploadedDocumentCreate(UploadedDocumentBase):
    user_id: uuid.UUID


class UploadedDocumentUpdate(ORMBaseSchema):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    status: str | None = Field(default=None, min_length=1, max_length=50)
    extracted_text: str | None = None


class UploadedDocumentRead(UploadedDocumentBase, TimestampSchema):
    user_id: uuid.UUID


class DocumentChunkBase(ORMBaseSchema):
    chunk_index: int = Field(ge=0)
    content: str = Field(min_length=1)
    token_count: int | None = Field(default=None, ge=0)


class DocumentChunkCreate(DocumentChunkBase):
    document_id: uuid.UUID


class DocumentChunkUpdate(ORMBaseSchema):
    content: str | None = Field(default=None, min_length=1)
    token_count: int | None = Field(default=None, ge=0)


class DocumentChunkRead(DocumentChunkBase, TimestampSchema):
    document_id: uuid.UUID
