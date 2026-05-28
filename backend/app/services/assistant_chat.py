from __future__ import annotations

import json
import logging
import traceback
import uuid
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
                # Fall back to direct LLM instead of returning error string
                prompt = f"You are a helpful AI assistant.\n\nUser: {query}\nAssistant:"
                context = ""
                chunks = []
            else:
                context = "\n\n".join([r.document for r in search_results])
                prompt = build_rag_prompt(query=query, context=context)

        try:
            answer = await self.ollama_service.generate(prompt=prompt, model=model)
            if not answer.strip():
                answer = "I was unable to generate a response. Please try again."
        except HTTPException as exc:
            raise exc
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
        user_id: uuid.UUID,
        query: str,
        model: str,
        top_k: int = 4,
        document_ids: list[str] | None = None,
    ) -> AsyncIterator[str]:
        import asyncio
        
        print(f"[STREAM] query={query!r}")
        print(f"[STREAM] document_ids={document_ids!r}")
        print(f"[STREAM] model={model!r}")

        # ── PATH A: No documents selected — direct DeepSeek chat ──────────────
        if document_ids is not None and len(document_ids) == 0:
            prompt = (
                "You are a helpful AI assistant powered by DeepSeek.\n\n"
                f"User: {query}\nAssistant:"
            )
            print(f"[STREAM] No docs selected — direct chat mode")
            
            yield f"data: {json.dumps({'type': 'context', 'context': '', 'chunks': [], 'model': model})}\n\n"
            
            full_answer = ""
            try:
                async for token in self.ollama_service.stream_generate(prompt=prompt, model=model):
                    print(f"[STREAM] Token: {token!r}")
                    full_answer += token
                    yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
            except Exception as e:
                print(f"[STREAM ERROR] Direct chat failed: {e}")
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
                return
            
            final = full_answer.strip() or "I was unable to generate a response. Please try again."
            yield f"data: {json.dumps({'type': 'done', 'answer': final, 'prompt': prompt})}\n\n"
            return

        # ── PATH B: Documents selected (or None = search all) — RAG mode ──────
        search_results = []
        context = ""
        chunks = []
        
        try:
            print(f"[STREAM] Running RAG retrieval...")
            search_results = await self.vector_store.similarity_search(
                user_id=user_id,
                query=query,
                top_k=top_k,
                document_ids=document_ids,
            )
            print(f"[STREAM] RAG results: {len(search_results)} chunks")
        except Exception as e:
            print(f"[STREAM] ChromaDB retrieval failed: {e}")
            search_results = []

        if search_results:
            context = "\n\n".join([r.document for r in search_results])
            chunks = _format_chunks(search_results)
            print(f"[STREAM] Context length: {len(context)} chars")
        else:
            print(f"[STREAM] No chunks found — falling back to direct chat")

        # Send context metadata to frontend
        yield f"data: {json.dumps({'type': 'context', 'context': context, 'chunks': chunks, 'model': model})}\n\n"

        # Build prompt
        if context:
            prompt = build_rag_prompt(query=query, context=context)
        else:
            # No context found — answer directly instead of returning error string
            prompt = (
                "You are a helpful AI assistant powered by DeepSeek.\n"
                "The user selected documents but no relevant content was found.\n"
                "Answer helpfully from general knowledge and mention the documents had no matches.\n\n"
                f"User: {query}\nAssistant:"
            )
        
        print(f"[STREAM] Prompt length: {len(prompt)} chars")
        print(f"[STREAM] Prompt preview: {prompt[:300]!r}")
        
        full_answer = ""
        try:
            async for token in self.ollama_service.stream_generate(prompt=prompt, model=model):
                print(f"[STREAM] Token: {token!r}")
                full_answer += token
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        except (httpx.RemoteProtocolError, httpx.ReadTimeout, httpx.ConnectError, asyncio.TimeoutError):
            msg = "Connection to Ollama lost. Make sure Ollama is running: ollama serve"
            print(f"[STREAM ERROR] {msg}")
            yield f"data: {json.dumps({'type': 'error', 'message': msg})}\n\n"
            return
        except Exception as e:
            import traceback
            print(f"[STREAM ERROR] {traceback.format_exc()}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            return

        final = full_answer.strip() or "I was unable to generate a response. Please try again."
        yield f"data: {json.dumps({'type': 'done', 'answer': final, 'prompt': prompt})}\n\n"
