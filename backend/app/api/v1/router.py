from fastapi import APIRouter

from app.api.v1.routes import assistant, health

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(assistant.router, prefix="/assistant", tags=["assistant"])
