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


@router.get("/debug/chroma")
async def debug_chroma() -> dict:
    """
    Diagnostic endpoint: shows how many vectors are stored per user collection,
    and verifies the ChromaDB persist directory exists.
    """
    import os
    from pathlib import Path
    from app.services.vector_store import get_vector_store_service

    persist_dir = settings.CHROMA_PERSIST_DIRECTORY
    dir_exists = Path(persist_dir).exists()
    dir_absolute = str(Path(persist_dir).resolve())

    # Ensure directory exists
    os.makedirs(persist_dir, exist_ok=True)

    vs = get_vector_store_service()
    try:
        # List all collections
        all_collections = vs.client.list_collections()
        collection_info = []
        for col in all_collections:
            try:
                c = vs.client.get_collection(col.name)
                count = c.count()
                # Peek at a few records to see what metadata keys are stored
                sample = {}
                if count > 0:
                    peek = c.peek(limit=1)
                    sample_meta = (peek.get("metadatas") or [[]])[0]
                    sample = sample_meta[0] if isinstance(sample_meta, list) else sample_meta
                collection_info.append({
                    "name": col.name,
                    "total_vectors": count,
                    "sample_metadata_keys": list(sample.keys()) if sample else [],
                    "sample_metadata": sample,
                })
            except Exception as e:
                collection_info.append({"name": col.name, "error": str(e)})

        return {
            "persist_directory": persist_dir,
            "persist_directory_absolute": dir_absolute,
            "persist_directory_exists": dir_exists,
            "embedding_model": settings.EMBEDDING_MODEL_NAME,
            "total_collections": len(all_collections),
            "collections": collection_info,
        }
    except Exception as exc:
        return {
            "persist_directory": persist_dir,
            "persist_directory_absolute": dir_absolute,
            "persist_directory_exists": dir_exists,
            "error": str(exc),
        }
