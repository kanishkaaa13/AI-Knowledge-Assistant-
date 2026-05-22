import uuid

from pydantic import Field

from app.schemas.common import ORMBaseSchema, TimestampSchema


class MessageBase(ORMBaseSchema):
    role: str = Field(min_length=1, max_length=50)
    content: str = Field(min_length=1)
    sequence_number: int = Field(ge=0)


class MessageCreate(MessageBase):
    conversation_id: uuid.UUID


class MessageUpdate(ORMBaseSchema):
    content: str | None = Field(default=None, min_length=1)


class MessageRead(MessageBase, TimestampSchema):
    conversation_id: uuid.UUID
