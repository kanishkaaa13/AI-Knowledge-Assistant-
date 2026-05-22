from functools import lru_cache

from langchain_huggingface import HuggingFaceEmbeddings

from app.core.config import settings


@lru_cache
def get_embedding_model() -> HuggingFaceEmbeddings:
    return HuggingFaceEmbeddings(model_name=settings.EMBEDDING_MODEL_NAME)
