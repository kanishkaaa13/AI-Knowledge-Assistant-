from sqlalchemy.orm import Session

from app.core.sanitize import sanitize_text
from app.core.security import get_password_hash, verify_password
from app.models.setting import Setting
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate


def get_user_by_email(db: Session, email: str) -> User | None:
    return UserRepository(db).get_by_email(sanitize_text(email, max_length=255).lower())


def create_user(db: Session, payload: UserCreate) -> User:
    user = User(
        name=sanitize_text(payload.name, max_length=255),
        email=sanitize_text(payload.email, max_length=255).lower(),
        hashed_password=get_password_hash(payload.password),
    )
    db.add(user)
    db.flush()
    db.add(Setting(user_id=user.id))
    db.commit()
    db.refresh(user)
    return user
