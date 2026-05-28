from __future__ import annotations

import json
from collections.abc import AsyncIterator
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

SUPPORTED_OLLAMA_MODELS = {"llama3", "mistral", "deepseek-r1:7b"}


class OllamaLLMService:
    def __init__(self) -> None:
        self.base_url = settings.OLLAMA_BASE_URL.rstrip("/")
        self.keep_alive = settings.OLLAMA_KEEP_ALIVE
        parsed = urlparse(self.base_url)
        if settings.ENFORCE_LOCAL_ONLY_AI and parsed.hostname not in {"localhost", "127.0.0.1"}:
            raise RuntimeError("OLLAMA_BASE_URL must stay local for privacy-first inference.")

    def _validate_model(self, model: str) -> str:
        normalized = model.strip().lower()
        if normalized not in SUPPORTED_OLLAMA_MODELS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported Ollama model. Supported models: {', '.join(sorted(SUPPORTED_OLLAMA_MODELS))}.",
            )
        return normalized

    async def generate(self, *, prompt: str, model: str) -> str:
        selected_model = self._validate_model(model)
        payload = {
            "model": selected_model,
            "prompt": prompt,
            "stream": False,
            "keep_alive": self.keep_alive,
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                response = await client.post(f"{self.base_url}/api/generate", json=payload)
                response.raise_for_status()
            except httpx.HTTPError as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Unable to reach the local Ollama service.",
                ) from exc

        data = response.json()
        return data.get("response", "").strip()

    async def stream_generate(self, *, prompt: str, model: str) -> AsyncIterator[str]:
        selected_model = self._validate_model(model)
        payload = {
            "model": selected_model,
            "prompt": prompt,
            "stream": True,
            "keep_alive": self.keep_alive,
        }

        async with httpx.AsyncClient(timeout=None) as client:
            try:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/api/generate",
                    json=payload,
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        data = json.loads(line)
                        token = data.get("response", "")
                        if token:
                            yield token
                        if data.get("done"):
                            break
            except httpx.HTTPError as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Unable to stream from the local Ollama service.",
                ) from exc
