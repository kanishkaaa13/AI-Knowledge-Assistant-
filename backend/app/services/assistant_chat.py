from __future__ import annotations

import json
from collections.abc import AsyncIterator

from app.models.user import User
from app.services.ollama_llm import OllamaLLMService
from app.services.prompt_builder import build_rag_prompt
from app.services.rag_pipeline import RAGRetrievalService


class AssistantChatService:
    def __init__(self, retrieval_service: RAGRetrievalService) -> None:
        self.retrieval_service = retrieval_service
        self.ollama_service = OllamaLLMService()

    async def answer(
        self,
        *,
        user: User,
        query: str,
        model: str,
        top_k: int | None = None,
        hybrid: bool = True,
    ) -> dict:
        retrieval = self.retrieval_service.retrieve(
            user=user,
            query=query,
            top_k=top_k,
            hybrid=hybrid,
        )

        if not retrieval.chunks:
            answer = "Unknown based on the provided context."
            return {
                "query": query,
                "answer": answer,
                "context": retrieval.context,
                "chunks": retrieval.chunks,
                "prompt": "",
                "model": model,
            }

        prompt = build_rag_prompt(query=query, context=retrieval.context)
        answer = await self.ollama_service.generate(prompt=prompt, model=model)
        if not answer.strip():
            answer = "Unknown based on the provided context."

        return {
            "query": query,
            "answer": answer,
            "context": retrieval.context,
            "chunks": retrieval.chunks,
            "prompt": prompt,
            "model": model,
        }

    async def stream_answer(
        self,
        *,
        user: User,
        query: str,
        model: str,
        top_k: int | None = None,
        hybrid: bool = True,
    ) -> AsyncIterator[str]:
        retrieval = self.retrieval_service.retrieve(
            user=user,
            query=query,
            top_k=top_k,
            hybrid=hybrid,
        )

        meta_payload = {
            "type": "context",
            "context": retrieval.context,
            "chunks": [chunk.model_dump(mode="json") for chunk in retrieval.chunks],
            "model": model,
        }
        yield f"data: {json.dumps(meta_payload)}\n\n"

        if not retrieval.chunks:
            unknown = "Unknown based on the provided context."
            yield f"data: {json.dumps({'type': 'token', 'content': unknown})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'answer': unknown, 'prompt': ''})}\n\n"
            return

        prompt = build_rag_prompt(query=query, context=retrieval.context)
        full_answer = ""

        async for token in self.ollama_service.stream_generate(prompt=prompt, model=model):
            full_answer += token
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

        final_answer = full_answer.strip() or "Unknown based on the provided context."
        yield f"data: {json.dumps({'type': 'done', 'answer': final_answer, 'prompt': prompt})}\n\n"
