import uuid

from pydantic import Field

from app.schemas.common import ORMBaseSchema, TimestampSchema


class ConversationBase(ORMBaseSchema):
    title: str = Field(min_length=1, max_length=255)
    summary: str | None = None


class ConversationCreate(ConversationBase):
    user_id: uuid.UUID


class ConversationUpdate(ORMBaseSchema):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    summary: str | None = None


class ConversationRead(ConversationBase, TimestampSchema):
    user_id: uuid.UUID
