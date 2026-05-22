from sqlalchemy.orm import Session

from app.core.sanitize import sanitize_text
from app.models.setting import Setting
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate

import bcrypt


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_user_by_email(db: Session, email: str) -> User | None:
    return UserRepository(db).get_by_email(sanitize_text(email, max_length=255).lower())


def create_user(db: Session, payload: UserCreate) -> User:
    user = User(
        name=sanitize_text(payload.name, max_length=255),
        email=sanitize_text(payload.email, max_length=255).lower(),
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.flush()
    db.add(Setting(user_id=user.id))
    db.commit()
    db.refresh(user)
    return user
