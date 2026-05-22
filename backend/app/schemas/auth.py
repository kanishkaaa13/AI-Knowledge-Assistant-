from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserRead


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class AuthResponse(BaseModel):
    user: UserRead
    message: str
