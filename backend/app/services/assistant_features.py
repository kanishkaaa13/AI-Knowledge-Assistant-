from __future__ import annotations

import json

from app.models.user import User
from app.services.ollama_llm import OllamaLLMService
from app.services.prompt_builder import (
    build_quiz_prompt,
    build_summary_prompt,
    build_suggested_prompts_prompt,
)
from app.services.rag_pipeline import RAGRetrievalService


class AssistantFeatureService:
    def __init__(self, retrieval_service: RAGRetrievalService) -> None:
        self.retrieval_service = retrieval_service
        self.ollama = OllamaLLMService()

    async def summarize_documents(
        self,
        *,
        user: User,
        query: str,
        model: str,
        top_k: int | None = None,
        document_ids: list[str] | None = None,
    ) -> dict:
        retrieval = self.retrieval_service.retrieve(
            user=user,
            query=query,
            top_k=top_k,
            hybrid=True,
            document_ids=document_ids,
        )
        prompt = build_summary_prompt(query=query, context=retrieval.context)
        summary = await self.ollama.generate(prompt=prompt, model=model)
        return {
            "summary": summary.strip() or "Unknown based on the provided context.",
            "chunks": retrieval.chunks,
            "context": retrieval.context,
        }

    async def generate_quiz(
        self,
        *,
        user: User,
        query: str,
        model: str,
        count: int = 5,
        document_ids: list[str] | None = None,
    ) -> dict:
        retrieval = self.retrieval_service.retrieve(
            user=user,
            query=query,
            top_k=max(count, 4),
            hybrid=True,
            document_ids=document_ids,
        )
        prompt = build_quiz_prompt(query=query, context=retrieval.context, count=count)
        raw = await self.ollama.generate(prompt=prompt, model=model)
        try:
            questions = json.loads(raw)
        except json.JSONDecodeError:
            questions = []
        return {"questions": questions, "chunks": retrieval.chunks, "context": retrieval.context}

    async def suggested_prompts(
        self,
        *,
        user: User,
        query: str,
        model: str,
        document_ids: list[str] | None = None,
    ) -> dict:
        retrieval = self.retrieval_service.retrieve(
            user=user,
            query=query,
            top_k=6,
            hybrid=True,
            document_ids=document_ids,
        )
        prompt = build_suggested_prompts_prompt(query=query, context=retrieval.context)
        raw = await self.ollama.generate(prompt=prompt, model=model)
        prompts = [line.strip("- ").strip() for line in raw.splitlines() if line.strip()]
        return {"prompts": prompts[:6], "chunks": retrieval.chunks}
