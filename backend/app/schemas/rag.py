import uuid

from pydantic import BaseModel, Field


class RetrievedChunk(BaseModel):
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_title: str
    filename: str
    page: int | None = None
    content: str
    score: float
    semantic_score: float
    keyword_score: float
    chunk_index: int
    upload_timestamp: str


class RetrievalResponse(BaseModel):
    query: str
    top_k: int
    chunks: list[RetrievedChunk]
    context: str


class AssistantQueryRequest(BaseModel):
    query: str = Field(min_length=3)
    top_k: int | None = Field(default=None, ge=1, le=12)
    hybrid: bool = True


class AssistantQueryResponse(BaseModel):
    query: str
    answer: str
    context: str
    chunks: list[RetrievedChunk]
    prompt: str
