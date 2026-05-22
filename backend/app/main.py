from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi_jwt_auth.exceptions import AuthJWTException

from app.api.v1.router import api_router
from app import models  # noqa: F401
from app.core.config import settings
from app.core.middleware import JWTContextMiddleware
from app.core import security


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AuthJWTException)
    async def authjwt_exception_handler(_, exc: AuthJWTException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(JWTContextMiddleware)
    register_exception_handlers(app)

    @app.get("/", tags=["root"])
    async def root() -> dict[str, str]:
        return {"message": f"{settings.PROJECT_NAME} API is running."}

    app.include_router(api_router, prefix=settings.API_V1_PREFIX)
    return app


app = create_application()
