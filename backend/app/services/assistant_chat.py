from __future__ import annotations

import json
import logging
import traceback
from collections.abc import AsyncIterator

import httpx
from fastapi import HTTPException

from app.models.user import User
from app.services.ollama_llm import OllamaLLMService
from app.services.prompt_builder import build_rag_prompt
from app.services.vector_store import VectorSearchResult, VectorStoreService

logger = logging.getLogger(__name__)


def _format_chunks(results: list[VectorSearchResult]) -> list[dict]:
    """Convert VectorSearchResult list to ChatChunk-compatible dicts."""
    return [
        {"content": result.document, "metadata": result.metadata}
        for result in results
    ]


class AssistantChatService:
    def __init__(self, vector_store: VectorStoreService) -> None:
        self.vector_store = vector_store
        self.ollama_service = OllamaLLMService()

    async def answer(
        self,
        *,
        user: User,
        query: str,
        model: str,
        top_k: int = 4,
        document_ids: list[str] | None = None,
    ) -> dict:
        if document_ids is not None and len(document_ids) == 0:
            search_results = []
            chunks = []
            context = ""
            prompt = query
        else:
            # Retrieve context from ChromaDB
            try:
                search_results = await self.vector_store.similarity_search(
                    user_id=user.id,
                    query=query,
                    top_k=top_k,
                    document_ids=document_ids,
                )
            except Exception:
                logger.exception("ChromaDB retrieval failed — falling back to empty context.")
                search_results = []

            chunks = _format_chunks(search_results)

            if not search_results:
                answer = "I cannot find that information in your uploaded documents."
                return {
                    "query": query,
                    "answer": answer,
                    "context": "",
                    "chunks": chunks,
                    "prompt": "",
                    "model": model,
                }

            context = "\n\n".join([r.document for r in search_results])
            prompt = build_rag_prompt(query=query, context=context)

        try:
            answer = await self.ollama_service.generate(prompt=prompt, model=model)
            if not answer.strip():
                answer = "I cannot find that information in your uploaded documents."
        except Exception:
            logger.exception("Ollama generation failed.")
            answer = (
                "DeepSeek model is not running. Please run: "
                "ollama pull deepseek-r1:7b && ollama serve"
            )

        return {
            "query": query,
            "answer": answer,
            "context": context,
            "chunks": chunks,
            "prompt": prompt,
            "model": model,
        }

    async def stream_answer(
        self,
        *,
        user: User,
        query: str,
        model: str,
        top_k: int = 4,
        document_ids: list[str] | None = None,
    ) -> AsyncIterator[str]:
        # Retrieve context
        is_general_knowledge = document_ids is not None and len(document_ids) == 0
        
        if is_general_knowledge:
            search_results = []
            context = ""
            chunks = []
        else:
            try:
                search_results = await self.vector_store.similarity_search(
                    user_id=user.id,
                    query=query,
                    top_k=top_k,
                    document_ids=document_ids,
                )
            except Exception:
                logger.exception("ChromaDB retrieval failed during streaming.")
                search_results = []

            context = "\n\n".join([r.document for r in search_results])
            chunks = _format_chunks(search_results)

        # Always send context metadata first so the client knows what sources were used
        meta_payload = {
            "type": "context",
            "context": context,
            "chunks": chunks,
            "model": model,
        }
        yield f"data: {json.dumps(meta_payload)}\n\n"

        if not is_general_knowledge and not search_results:
            no_doc_msg = "I cannot find that information in your uploaded documents."
            yield f"data: {json.dumps({'type': 'token', 'content': no_doc_msg})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'answer': no_doc_msg, 'prompt': ''})}\n\n"
            return

        prompt = query if is_general_knowledge else build_rag_prompt(query=query, context=context)
        full_answer = ""

        # Check Ollama availability
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.ollama_service.base_url, timeout=3.0)
                if response.status_code != 200:
                    raise ValueError("Ollama returned non-200")
        except Exception:
            logger.warning("Ollama availability check failed — returning diagnostic message.")
            msg = (
                "DeepSeek model is not running. Please run: "
                "ollama pull deepseek-r1:7b && ollama serve"
            )
            yield f"data: {json.dumps({'type': 'token', 'content': msg})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'answer': msg, 'prompt': prompt})}\n\n"
            return

        # Stream tokens
        try:
            async for token in self.ollama_service.stream_generate(prompt=prompt, model=model):
                full_answer += token
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        except Exception:
            logger.exception("Ollama streaming failed.")
            fallback = (
                "🤖 Lost connection to Ollama mid-stream. "
                "Please try again or restart the Ollama service."
            )
            yield f"data: {json.dumps({'type': 'token', 'content': fallback})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'answer': fallback, 'prompt': prompt})}\n\n"
            return

        final_answer = full_answer.strip() or "I cannot find that information in your uploaded documents."
        yield f"data: {json.dumps({'type': 'done', 'answer': final_answer, 'prompt': prompt})}\n\n"
