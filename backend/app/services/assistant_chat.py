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
                pass

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
        import json
        
        # Step 1: Always initialize context as empty string
        context = ""
        sources = []
        
        # Step 2: Only do RAG if document_ids provided
        if document_ids:
            try:
                retrieved = await self.vector_store.similarity_search(
                    user_id=user_id,
                    query=query,
                    top_k=top_k,
                    document_ids=document_ids,
                )
                if retrieved:
                    chunks = retrieved
                    context = "\n\n".join([r.document for r in chunks])
                    sources = _format_chunks(chunks)
                    print(f"[RAG] Found {len(chunks)} chunks, context length: {len(context)}")
                else:
                    print(f"[RAG] No chunks found for document_ids: {document_ids}")
            except Exception as e:
                print(f"[RAG ERROR] {e}")
                context = ""  # fallback to no context
        
        # Step 3: Build prompt based on whether we have context
        if context:
            system_prompt = """You are a helpful AI assistant with access to the user's documents.
Answer the user's question based on the provided document context.
Be specific, accurate, and cite relevant information from the documents.
If the context doesn't fully answer the question, say so and provide what you can."""
            
            user_prompt = f"""Document context:
{context}

User question: {query}

Please answer based on the document context above."""
        else:
            system_prompt = """You are a helpful AI assistant.
Answer the user's question helpfully and accurately.
If asked about documents but none are provided, let the user know they should select documents."""
            
            user_prompt = query
        
        print(f"[CHAT] Sending to DeepSeek. Has context: {bool(context)}")
        print(f"[CHAT] User prompt preview: {user_prompt[:200]}")
        
        # Step 4: Stream from Ollama/DeepSeek
        # Yield context info first
        meta_payload = {
            "type": "context",
            "context": context,
            "chunks": sources,
            "model": model,
        }
        yield f"data: {json.dumps(meta_payload)}\n\n"
        
        # Step 5: Stream tokens from DeepSeek
        try:
            async for token in self.ollama_service.stream_generate(
                system_prompt=system_prompt,
                user_message=user_prompt,
                model=model,
            ):
                if token:
                    yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        except Exception as e:
            print(f"[LLM ERROR] {e}")
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            return
        
        # Step 6: Done
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
