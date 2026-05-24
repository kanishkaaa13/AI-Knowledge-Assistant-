from __future__ import annotations

import json
import traceback
from collections.abc import AsyncIterator

from app.models.user import User
from app.services.ollama_llm import OllamaLLMService
from app.services.prompt_builder import build_rag_prompt
from app.services.vector_store import VectorStoreService


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
        # Retrieve context from ChromaDB with fallback
        try:
            search_results = self.vector_store.similarity_search(
                user_id=user.id,
                query=query,
                top_k=top_k,
            )
        except Exception as e:
            print("WARNING: ChromaDB retrieval failed:")
            traceback.print_exc()
            search_results = []

        if not search_results:
            answer = "I cannot find that information in your uploaded documents."
            return {
                "query": query,
                "answer": answer,
                "context": "",
                "chunks": [],
                "prompt": "",
                "model": model,
            }

        # Build context from retrieved chunks
        context = "\n\n".join([result.document for result in search_results])
        
        # Build system prompt with strict context injection
        prompt = build_rag_prompt(query=query, context=context)
        
        # Generate answer from Ollama with fallback
        try:
            answer = await self.ollama_service.generate(prompt=prompt, model=model)
            if not answer.strip():
                answer = "I cannot find that information in your uploaded documents."
        except Exception as e:
            print("WARNING: Ollama generation failed:")
            traceback.print_exc()
            answer = f"🤖 Chat Connection Mock Active: I received your message '{query}', but I cannot communicate with your local Ollama instance right now. Please make sure you have run 'ollama run llama3' in your terminal!"

        return {
            "query": query,
            "answer": answer,
            "context": context,
            "chunks": [{"content": result.document, "metadata": result.metadata} for result in search_results],
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
        # Retrieve context from ChromaDB with fallback
        try:
            search_results = self.vector_store.similarity_search(
                user_id=user.id,
                query=query,
                top_k=top_k,
            )
        except Exception as e:
            print("WARNING: ChromaDB retrieval failed:")
            traceback.print_exc()
            search_results = []

        # Build context from retrieved chunks
        context = "\n\n".join([result.document for result in search_results])
        
        # Send context metadata to frontend
        meta_payload = {
            "type": "context",
            "context": context,
            "chunks": [{"content": result.document, "metadata": result.metadata} for result in search_results],
            "model": model,
        }
        yield f"data: {json.dumps(meta_payload)}\n\n"

        if not search_results:
            unknown = "I cannot find that information in your uploaded documents."
            yield f"data: {json.dumps({'type': 'token', 'content': unknown})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'answer': unknown, 'prompt': ''})}\n\n"
            return

        # Build system prompt with strict context injection
        prompt = build_rag_prompt(query=query, context=context)
        full_answer = ""

        # Stream tokens from Ollama with fallback
        try:
            async for token in self.ollama_service.stream_generate(prompt=prompt, model=model):
                full_answer += token
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        except Exception as e:
            print("WARNING: Ollama streaming failed:")
            traceback.print_exc()
            fallback_message = f"🤖 Chat Connection Mock Active: I received your message '{query}', but I cannot communicate with your local Ollama instance right now. Please make sure you have run 'ollama run llama3' in your terminal!"
            yield f"data: {json.dumps({'type': 'token', 'content': fallback_message})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'answer': fallback_message, 'prompt': prompt})}\n\n"
            return

        final_answer = full_answer.strip() or "I cannot find that information in your uploaded documents."
        yield f"data: {json.dumps({'type': 'done', 'answer': final_answer, 'prompt': prompt})}\n\n"
