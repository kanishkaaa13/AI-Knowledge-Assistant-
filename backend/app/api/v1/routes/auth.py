import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.rate_limit import apply_rate_limit
from app.core.sanitize import ensure_present, sanitize_text
from app.core.security import create_access_token, decode_access_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import AuthResponse, UserLogin
from app.schemas.user import UserCreate, UserRead
from app.services.auth import create_user, get_user_by_email, verify_password

router = APIRouter()


def set_auth_cookies(response: Response, user: User) -> None:
    """Set authentication cookies for the user."""
    access_token = create_access_token(data={"sub": str(user.id)})
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserCreate,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthResponse:
    """
    Register a new user account.
    
    Args:
        payload: User creation data with validated password
        request: FastAPI request object for rate limiting
        response: FastAPI response object for setting cookies
        db: Database session
        
    Returns:
        AuthResponse: Created user data with success message
        
    Raises:
        HTTPException: If registration fails due to validation or existing email
    """
    apply_rate_limit(request, scope="auth-register", limit=5)
    payload.name = ensure_present(sanitize_text(payload.name, max_length=255), field_name="name")
    payload.email = ensure_present(sanitize_text(payload.email, max_length=255).lower(), field_name="email")

    if get_user_by_email(db, payload.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    try:
        user = create_user(db, payload)
    except ValueError as e:
        # Handle password hashing errors (e.g., bcrypt limit exceeded)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    set_auth_cookies(response, user)
    return AuthResponse(user=UserRead.model_validate(user), message="Account created.")


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: UserLogin,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthResponse:
    """
    Authenticate a user and create a session.
    
    Args:
        payload: User login credentials with validated password
        request: FastAPI request object for rate limiting
        response: FastAPI response object for setting cookies
        db: Database session
        
    Returns:
        AuthResponse: Authenticated user data with success message
        
    Raises:
        HTTPException: If authentication fails due to invalid credentials
    """
    apply_rate_limit(request, scope="auth-login", limit=8)
    payload.email = ensure_present(sanitize_text(payload.email, max_length=255).lower(), field_name="email")
    user = get_user_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    set_auth_cookies(response, user)
    return AuthResponse(user=UserRead.model_validate(user), message="Logged in successfully.")


@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    response: Response,
    db: Session = Depends(get_db),
) -> AuthResponse:
    """
    Refresh the authentication token.
    
    Currently requires re-login. A full refresh token implementation can be added later.
    
    Args:
        response: FastAPI response object
        db: Database session
        
    Raises:
        HTTPException: Always requires re-login for now
    """
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Please login again.",
    )


@router.post("/logout")
async def logout(response: Response) -> dict[str, str]:
    """
    Log out the current user by clearing authentication cookies.
    
    Args:
        response: FastAPI response object for clearing cookies
        
    Returns:
        dict: Success message
    """
    response.delete_cookie(key="access_token")
    return {"message": "Logged out successfully."}


@router.get("/me", response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)) -> UserRead:
    """
    Get the current authenticated user's information.
    
    Args:
        current_user: The authenticated user from dependency injection
        
    Returns:
        UserRead: Current user's data
    """
    return UserRead.model_validate(current_user)
