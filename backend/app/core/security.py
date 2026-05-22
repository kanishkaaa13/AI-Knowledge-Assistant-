from datetime import timedelta

from fastapi_jwt_auth import AuthJWT
from pydantic import BaseModel

from app.core.config import settings


class JWTSettings(BaseModel):
    authjwt_secret_key: str = settings.JWT_SECRET_KEY
    authjwt_token_location: set[str] = {"cookies"}
    authjwt_cookie_csrf_protect: bool = True
    authjwt_access_cookie_key: str = "access_token"
    authjwt_refresh_cookie_key: str = "refresh_token"
    authjwt_access_csrf_cookie_key: str = "csrf_access_token"
    authjwt_refresh_csrf_cookie_key: str = "csrf_refresh_token"
    authjwt_access_token_expires: timedelta = timedelta(
        minutes=settings.JWT_ACCESS_TOKEN_EXPIRES_MINUTES
    )
    authjwt_refresh_token_expires: timedelta = timedelta(
        days=settings.JWT_REFRESH_TOKEN_EXPIRES_DAYS
    )
    authjwt_cookie_samesite: str = "lax"
    authjwt_cookie_secure: bool = settings.APP_ENV.lower() == "production"


@AuthJWT.load_config
def get_jwt_settings() -> JWTSettings:
    return JWTSettings()
