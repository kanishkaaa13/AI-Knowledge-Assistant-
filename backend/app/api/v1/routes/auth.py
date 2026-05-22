from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi_jwt_auth import AuthJWT
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import AuthResponse, UserCreate, UserLogin, UserResponse
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
    response: Response,
    db: Session = Depends(get_db),
    authorize: AuthJWT = Depends(),
) -> AuthResponse:
    if get_user_by_email(db, payload.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    user = create_user(db, payload)
    set_auth_cookies(authorize, response, user)
    return AuthResponse(user=UserResponse.model_validate(user), message="Account created.")


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: UserLogin,
    response: Response,
    db: Session = Depends(get_db),
    authorize: AuthJWT = Depends(),
) -> AuthResponse:
    user = get_user_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    set_auth_cookies(authorize, response, user)
    return AuthResponse(user=UserResponse.model_validate(user), message="Logged in successfully.")


@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    response: Response,
    db: Session = Depends(get_db),
    authorize: AuthJWT = Depends(),
) -> AuthResponse:
    authorize.jwt_refresh_token_required()
    subject = authorize.get_jwt_subject()
    user = db.get(User, int(subject))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    set_auth_cookies(authorize, response, user)
    return AuthResponse(user=UserResponse.model_validate(user), message="Session refreshed.")


@router.post("/logout")
async def logout(response: Response, authorize: AuthJWT = Depends()) -> dict[str, str]:
    authorize.unset_jwt_cookies(response)
    return {"message": "Logged out successfully."}


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)
