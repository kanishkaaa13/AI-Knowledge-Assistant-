from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "environment": settings.APP_ENV,
    }


@router.get("/health/ollama")
async def ollama_health_check() -> dict[str, str]:
    import httpx
    from app.services.ollama_llm import OllamaLLMService
    service = OllamaLLMService()
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(service.base_url)
            response.raise_for_status()
        return {"status": "ok", "model": settings.OLLAMA_DEFAULT_MODEL}
    except Exception as exc:
        return {"status": "error", "message": str(exc)}
