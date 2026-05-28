from __future__ import annotations

import json
from collections.abc import AsyncIterator
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

DEFAULT_MODEL = getattr(settings, 'OLLAMA_DEFAULT_MODEL', 'deepseek-r1:7b')
SUPPORTED_OLLAMA_MODELS = [DEFAULT_MODEL, "deepseek-r1:1.5b", "deepseek-r1:14b", "llama3", "mistral"]


class OllamaLLMService:
    def __init__(self) -> None:
        self.base_url = settings.OLLAMA_BASE_URL.rstrip("/")
        self.keep_alive = settings.OLLAMA_KEEP_ALIVE
        parsed = urlparse(self.base_url)
        if settings.ENFORCE_LOCAL_ONLY_AI and parsed.hostname not in {"localhost", "127.0.0.1"}:
            raise RuntimeError("OLLAMA_BASE_URL must stay local for privacy-first inference.")

    def _validate_model(self, model: str | None) -> str:
        if not model:
            return DEFAULT_MODEL
        normalized = model.strip().lower()
        if normalized not in SUPPORTED_OLLAMA_MODELS:
            return DEFAULT_MODEL
        return normalized

    async def generate(self, *, prompt: str, model: str) -> str:
        selected_model = self._validate_model(model)
        payload = {
            "model": selected_model,
            "messages": [
                {"role": "system", "content": "You are a helpful AI assistant."},
                {"role": "user", "content": prompt}
            ],
            "stream": False,
            "options": {
                "temperature": 0.7,
                "num_predict": 2048
            }
        }

        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0)) as client:
            try:
                response = await client.post(f"{self.base_url}/api/chat", json=payload)
                if response.status_code == 404:
                    raise HTTPException(
                        status_code=404,
                        detail="Model deepseek-r1:7b not found. Run: ollama pull deepseek-r1:7b"
                    )
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Unable to reach the local Ollama service.",
                ) from exc
            except httpx.HTTPError as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Unable to reach the local Ollama service.",
                ) from exc

        data = response.json()
        return data.get("message", {}).get("content", "").strip()

    async def stream_generate(self, *, prompt: str, model: str | None = None) -> AsyncIterator[str]:
        selected_model = self._validate_model(model or "deepseek-r1:7b")
        url = f"{self.base_url}/api/chat"
        payload = {
            "model": selected_model,
            "messages": [
                {"role": "system", "content": "You are a helpful AI assistant."},
                {"role": "user", "content": prompt}
            ],
            "stream": True,
            "options": {
                "temperature": 0.7,
                "num_predict": 2048
            }
        }

        print(f"[OLLAMA] POST {url} model={selected_model}")

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0)) as client:
                async with client.stream("POST", url, json=payload) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        raise RuntimeError(f"Ollama returned {response.status_code}: {error_text.decode()}")

                    async for line in response.aiter_lines():
                        if not line.strip():
                            continue
                        try:
                            chunk = json.loads(line)
                            token = chunk.get("message", {}).get("content", "")
                            done = chunk.get("done", False)

                            if token:
                                print(f"[OLLAMA TOKEN]: {token!r}")
                                yield token

                            if done:
                                print("[OLLAMA] Stream complete")
                                break

                        except json.JSONDecodeError as e:
                            print(f"[OLLAMA] JSON parse error: {e}, line: {line!r}")
                            continue
        except httpx.ConnectError:
            raise RuntimeError("Cannot connect to Ollama. Make sure it is running: ollama serve")
        except httpx.TimeoutException:
            raise RuntimeError("Ollama request timed out. DeepSeek may be loading, try again.")
