import uuid

from pydantic import Field

from app.schemas.common import ORMBaseSchema, TimestampSchema


class UploadedDocumentBase(ORMBaseSchema):
    title: str = Field(min_length=1, max_length=255)
    file_name: str = Field(min_length=1, max_length=255)
    file_extension: str = Field(min_length=1, max_length=16)
    file_path: str | None = Field(default=None, max_length=500)
    mime_type: str | None = Field(default=None, max_length=120)
    file_size: int | None = Field(default=None, ge=0)
    checksum: str = Field(min_length=64, max_length=64)
    page_count: int | None = Field(default=None, ge=0)
    word_count: int | None = Field(default=None, ge=0)
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


class UploadedDocumentListItem(UploadedDocumentRead):
    preview_text: str | None = None


class DocumentPreviewRead(ORMBaseSchema):
    id: uuid.UUID
    title: str
    file_name: str
    file_extension: str
    mime_type: str | None = None
    file_size: int | None = None
    page_count: int | None = None
    word_count: int | None = None
    preview_text: str | None = None


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
