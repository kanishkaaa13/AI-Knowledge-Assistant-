from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    PROJECT_NAME: str = "AI Knowledge Assistant"
    APP_ENV: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    DATABASE_URL: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/ai_knowledge_assistant"
    )
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ACCESS_TOKEN_EXPIRES_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRES_DAYS: int = 7
    UPLOAD_ROOT_DIR: str = "storage/uploads"
    MAX_UPLOAD_SIZE_BYTES: int = 10485760
    ALLOWED_UPLOAD_EXTENSIONS: list[str] = [".pdf", ".docx", ".txt", ".md"]
    CHROMA_PERSIST_DIRECTORY: str = "storage/chroma"
    CHROMA_COLLECTION_NAME: str = "knowledge_chunks"
    EMBEDDING_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"
    RAG_CHUNK_SIZE: int = 500
    RAG_CHUNK_OVERLAP: int = 50
    RAG_TOP_K: int = 4
    LLM_PROVIDER: str = "openai"
    LLM_MODEL_NAME: str = "gpt-4.1-mini"
    LLM_API_KEY: str | None = None
    LLM_BASE_URL: str | None = None
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_DEFAULT_MODEL: str = "llama3"
    OLLAMA_KEEP_ALIVE: str = "5m"
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
