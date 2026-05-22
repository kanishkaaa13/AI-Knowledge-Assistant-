import uuid

from pydantic import EmailStr, Field

from app.schemas.common import ORMBaseSchema, TimestampSchema


class UserBase(ORMBaseSchema):
    name: str
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserUpdate(ORMBaseSchema):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    email: EmailStr | None = None


class UserRead(UserBase, TimestampSchema):
    pass


class UserSettingsSummary(ORMBaseSchema):
    user_id: uuid.UUID
    theme: str
    preferred_model: str
    memory_enabled: bool
