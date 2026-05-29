import logging
import sys
import time
from contextlib import asynccontextmanager

# Force UTF-8 output on Windows (prevents cp1252 UnicodeEncodeError from print statements)
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if sys.stderr.encoding and sys.stderr.encoding.lower() != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app import models  # noqa: F401
from app.core.config import settings
from app.core.middleware import JWTContextMiddleware, RateLimitMiddleware, SecurityHeadersMiddleware
from app.core import security


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-warm expensive resources so the first user request is fast."""
    import asyncio

    # Ensure ChromaDB persist directory exists
    import os
    os.makedirs(settings.CHROMA_PERSIST_DIRECTORY, exist_ok=True)

    # Pre-warm the embedding model in a thread so the event loop stays free
    t0 = time.time()
    print(f"[STARTUP] Pre-warming embedding model '{settings.EMBEDDING_MODEL_NAME}'...")
    try:
        from app.services.vector_store import get_vector_store_service
        vs = get_vector_store_service()
        await asyncio.to_thread(vs._get_embedding_model_sync)
        print(f"[STARTUP] Embedding model ready in {time.time() - t0:.2f}s")
    except Exception as exc:
        print(f"[STARTUP] Warning: could not pre-warm embedding model: {exc}")

    yield  # App runs here

    print("[SHUTDOWN] Cleaning up...")


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(Exception)
    async def global_exception_handler(_, exc: Exception):
        logging.error(f"Unhandled exception: {exc}", exc_info=True)
        if settings.APP_ENV.lower() == "production":
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"}
            )
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc)}
        )


def create_application() -> FastAPI:
    # Configure logging
    log_level = "INFO" if settings.APP_ENV.lower() == "production" else "DEBUG"
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="0.1.0",
        docs_url="/docs" if settings.APP_ENV.lower() != "production" else None,
        redoc_url="/redoc" if settings.APP_ENV.lower() != "production" else None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(JWTContextMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)

    register_exception_handlers(app)

    # Mount static file serving for uploads
    upload_dir = Path(settings.UPLOAD_ROOT_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

    @app.get("/", tags=["root"])
    async def root() -> dict[str, str]:
        return {"message": f"{settings.PROJECT_NAME} API is running.", "environment": settings.APP_ENV}

    @app.get("/health", tags=["health"])
    async def health_check() -> dict[str, str]:
        return {"status": "healthy", "environment": settings.APP_ENV}

    app.include_router(api_router, prefix=settings.API_V1_PREFIX)
    return app


app = create_application()

