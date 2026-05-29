from __future__ import annotations

import json
from collections.abc import AsyncIterator
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

DEFAULT_MODEL = getattr(settings, 'OLLAMA_DEFAULT_MODEL', 'llama3.2:3b')
SUPPORTED_OLLAMA_MODELS = [DEFAULT_MODEL, "deepseek-r1:1.5b", "deepseek-r1:14b", "llama3", "mistral", "llama3.2:3b"]


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
        if settings.LLM_PROVIDER == "groq":
            import httpx
            headers = {
                "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": settings.GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": "You are a helpful AI assistant."},
                    {"role": "user", "content": prompt}
                ],
                "stream": False,
                "max_tokens": 1024
            }
            async with httpx.AsyncClient(timeout=120.0) as client:
                try:
                    response = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers=headers,
                        json=payload
                    )
                    response.raise_for_status()
                    data = response.json()
                    return data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                except Exception as exc:
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail=f"Unable to reach Groq API: {exc}",
                    )

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
                        detail=f"Model {selected_model} not found. Run: ollama pull {selected_model}"
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
        messages = [
            {"role": "system", "content": "You are a helpful AI assistant."},
            {"role": "user", "content": prompt}
        ]

        if settings.LLM_PROVIDER == "groq":
            import httpx, json
            headers = {
                "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": settings.GROQ_MODEL,
                "messages": messages,
                "stream": True,
                "max_tokens": 1024
            }
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers=headers,
                    json=payload
                ) as response:
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]
                            if data == "[DONE]": break
                            try:
                                chunk = json.loads(data)
                                token = chunk["choices"][0]["delta"].get("content", "")
                                if token:
                                    yield token
                            except Exception:
                                continue
            return

        selected_model = self._validate_model(model or settings.OLLAMA_DEFAULT_MODEL)
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
            raise RuntimeError("Ollama request timed out. The AI model may be loading, try again.")
