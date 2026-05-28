from __future__ import annotations

import json
import logging
import traceback
import uuid
from collections.abc import AsyncIterator

import httpx
from fastapi import HTTPException

from app.core.config import settings
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
                # Fall back to direct LLM with a note that no docs matched
                prompt = (
                    "You are a helpful AI assistant. "
                    "The user asked about their documents but no relevant content was found in them. "
                    "Answer helpfully from your general knowledge and start your reply with: "
                    "\"I couldn't find this in your documents, but based on general knowledge: \""
                    f"\n\nUser question: {query}\nAssistant:"
                )
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
                "The AI model is not running. Please run: "
                f"ollama pull {settings.OLLAMA_DEFAULT_MODEL} && ollama serve"
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

        # ────────────────────────────────────────────────────────────
        # RAG Debug Pipeline
        # ────────────────────────────────────────────────────────────
        print(f"[RAG 1] Selected document IDs from request: {document_ids}")
        collection_name = f"user_collection_{user_id}"
        print(f"[RAG 2] Collection name being queried: {collection_name}")
        print(f"[STREAM] model={model!r}")

        # ── PATH A: No documents selected — direct AI chat ──────────────
        if document_ids is not None and len(document_ids) == 0:
            prompt = (
                "You are a helpful AI assistant.\n\n"
                f"User: {query}\nAssistant:"
            )
            print(f"[STREAM] No docs selected — direct chat mode")

            yield f"data: {json.dumps({'type': 'context', 'context': '', 'chunks': [], 'model': model})}\n\n"

            full_answer = ""
            try:
                async for token in self.ollama_service.stream_generate(prompt=prompt, model=model):
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
            print(f"[RAG 5] Number of chunks retrieved: {len(search_results)}")
        except Exception as e:
            print(f"[STREAM] ChromaDB retrieval failed: {e}")
            import traceback
            print(traceback.format_exc())
            search_results = []

        if search_results:
            context = "\n\n".join([r.document for r in search_results])
            chunks = _format_chunks(search_results)

        print(f"[RAG 4] ChromaDB raw results: {[{'id': r.id, 'score': r.semantic_score, 'meta': r.metadata} for r in search_results]}")
        print(f"[RAG 6] Context being sent to LLM: {context[:500] if context else 'EMPTY'}")

        # Send context metadata to frontend
        yield f"data: {json.dumps({'type': 'context', 'context': context, 'chunks': chunks, 'model': model})}\n\n"

        # ── Step 6: Build prompt exactly as specified ──────────────────────
        if context:
            prompt = (
                f"Use the following document content to answer:\n\n"
                f"{context}\n\n"
                f"Question: {query}\n"
                f"Answer based on the documents above."
            )
        else:
            prompt = (
                f"Answer from general knowledge. "
                f"Note: no relevant content was found in the user's uploaded documents.\n"
                f"Start your reply with: \"I couldn't find this in your documents, "
                f"but based on general knowledge: \"\n\n"
                f"Question: {query}\nAnswer:"
            )

        print(f"[STREAM] Prompt length: {len(prompt)} chars")
        print(f"[STREAM] Prompt preview: {prompt[:300]!r}")

        full_answer = ""
        try:
            async for token in self.ollama_service.stream_generate(prompt=prompt, model=model):
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
