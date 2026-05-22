import uuid

from fastapi import Depends, HTTPException, status
from fastapi_jwt_auth import AuthJWT
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User


def get_current_user(
    authorize: AuthJWT = Depends(),
    db: Session = Depends(get_db),
) -> User:
    try:
        authorize.jwt_required()
        subject = authorize.get_jwt_subject()
    except Exception as exc:  # pragma: no cover - handled by auth library in runtime
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        ) from exc

    user = db.get(User, uuid.UUID(subject))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )
    return user
