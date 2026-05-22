import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi_jwt_auth import AuthJWT
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.rate_limit import apply_rate_limit
from app.core.sanitize import ensure_present, sanitize_text
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import AuthResponse, UserLogin
from app.schemas.user import UserCreate, UserRead
from app.services.auth import create_user, get_user_by_email, verify_password

router = APIRouter()


def set_auth_cookies(authorize: AuthJWT, response: Response, user: User) -> None:
    access_token = authorize.create_access_token(subject=str(user.id))
    refresh_token = authorize.create_refresh_token(subject=str(user.id))
    authorize.set_access_cookies(access_token, response=response)
    authorize.set_refresh_cookies(refresh_token, response=response)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserCreate,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    authorize: AuthJWT = Depends(),
) -> AuthResponse:
    apply_rate_limit(request, scope="auth-register", limit=5)
    payload.name = ensure_present(sanitize_text(payload.name, max_length=255), field_name="name")
    payload.email = ensure_present(sanitize_text(payload.email, max_length=255).lower(), field_name="email")

    if get_user_by_email(db, payload.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    user = create_user(db, payload)
    set_auth_cookies(authorize, response, user)
    return AuthResponse(user=UserRead.model_validate(user), message="Account created.")


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: UserLogin,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    authorize: AuthJWT = Depends(),
) -> AuthResponse:
    apply_rate_limit(request, scope="auth-login", limit=8)
    payload.email = ensure_present(sanitize_text(payload.email, max_length=255).lower(), field_name="email")
    user = get_user_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    set_auth_cookies(authorize, response, user)
    return AuthResponse(user=UserRead.model_validate(user), message="Logged in successfully.")


@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    response: Response,
    db: Session = Depends(get_db),
    authorize: AuthJWT = Depends(),
) -> AuthResponse:
    authorize.jwt_refresh_token_required()
    subject = authorize.get_jwt_subject()
    user = db.get(User, uuid.UUID(subject))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    set_auth_cookies(authorize, response, user)
    return AuthResponse(user=UserRead.model_validate(user), message="Session refreshed.")


@router.post("/logout")
async def logout(response: Response, authorize: AuthJWT = Depends()) -> dict[str, str]:
    authorize.unset_jwt_cookies(response)
    return {"message": "Logged out successfully."}


@router.get("/me", response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)
