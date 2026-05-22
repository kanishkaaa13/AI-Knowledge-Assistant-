from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from langchain_chroma import Chroma

from app.core.config import settings
from app.services.embeddings import get_embedding_model


@lru_cache
def get_vector_store() -> Chroma:
    persist_directory = Path(settings.CHROMA_PERSIST_DIRECTORY)
    persist_directory.mkdir(parents=True, exist_ok=True)

    return Chroma(
        collection_name=settings.CHROMA_COLLECTION_NAME,
        embedding_function=get_embedding_model(),
        persist_directory=str(persist_directory),
    )
