import json

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.rate_limit import apply_rate_limit
from app.core.sanitize import ensure_present, sanitize_text
from app.db.session import get_db
from app.models.user import User
from app.repositories.conversation import ConversationRepository
from app.repositories.document import DocumentRepository
from app.repositories.message import MessageRepository
from app.schemas.assistant import (
    AnalyticsOverview,
    AssistantQuizResponse,
    AssistantSummaryRequest,
    AssistantSummaryResponse,
    DashboardSummary,
    SemanticDocumentSearchItem,
    SemanticDocumentSearchResponse,
    SuggestedPromptsResponse,
)
from app.schemas.rag import AssistantQueryRequest, AssistantQueryResponse, RetrievalResponse
from app.services.analytics import AnalyticsService
from app.services.assistant_chat import AssistantChatService
from app.services.assistant_features import AssistantFeatureService
from app.services.chat_memory import ChatMemoryService
from app.services.rag_pipeline import RAGRetrievalService

router = APIRouter()


def _sanitized_document_ids(document_ids: list[str]) -> list[str]:
    return [item for item in document_ids if item]


@router.get("/summary", response_model=DashboardSummary)
async def get_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardSummary:
    analytics = AnalyticsService(
        DocumentRepository(db),
        ConversationRepository(db),
        MessageRepository(db),
    ).build_overview(user=current_user)
    return DashboardSummary(
        title="AI Knowledge Assistant",
        description="Monitor private knowledge ingestion, local-only AI usage, and chat activity from one place.",
        stats=[{"label": metric.label, "value": metric.value} for metric in analytics.metrics],
    )


@router.get("/analytics", response_model=AnalyticsOverview)
async def get_analytics_overview(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AnalyticsOverview:
    apply_rate_limit(request, scope="assistant-analytics", limit=40, user_id=str(current_user.id))
    return AnalyticsService(
        DocumentRepository(db),
        ConversationRepository(db),
        MessageRepository(db),
    ).build_overview(user=current_user)


@router.post("/retrieve", response_model=RetrievalResponse)
async def retrieve_context(
    payload: AssistantQueryRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RetrievalResponse:
    apply_rate_limit(request, scope="assistant-retrieve", limit=30, user_id=str(current_user.id))
    payload.query = ensure_present(sanitize_text(payload.query, max_length=4000), field_name="query")
    return RAGRetrievalService(db).retrieve(
        user=current_user,
        query=payload.query,
        top_k=payload.top_k,
        hybrid=payload.hybrid,
        document_ids=_sanitized_document_ids(payload.document_ids),
    )


@router.post("/query", response_model=AssistantQueryResponse)
async def query_assistant(
    payload: AssistantQueryRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AssistantQueryResponse:
    apply_rate_limit(request, scope="assistant-query", limit=30, user_id=str(current_user.id))
    payload.query = ensure_present(sanitize_text(payload.query, max_length=4000), field_name="query")
    memory = ChatMemoryService(db)
    conversation = memory.get_or_create_conversation(
        user=current_user,
        conversation_id=payload.conversation_id,
        initial_user_message=payload.query,
    )
    if payload.conversation_id is not None:
        memory.append_message(
            conversation=conversation,
            role="user",
            content=payload.query,
        )

    result = await AssistantChatService(RAGRetrievalService(db)).answer(
        user=current_user,
        query=payload.query,
        model=payload.model,
        top_k=payload.top_k,
        hybrid=payload.hybrid,
        document_ids=_sanitized_document_ids(payload.document_ids),
    )
    updated_conversation = memory.sync_conversation_after_response(
        conversation=conversation,
        user_message=payload.query,
        assistant_message=result["answer"],
    )
    result["conversation_id"] = updated_conversation.id
    result["conversation_title"] = updated_conversation.title
    return AssistantQueryResponse(**result)


@router.post("/chat/stream")
async def stream_assistant_chat(
    payload: AssistantQueryRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    apply_rate_limit(request, scope="assistant-stream", limit=30, user_id=str(current_user.id))
    payload.query = ensure_present(sanitize_text(payload.query, max_length=4000), field_name="query")
    memory = ChatMemoryService(db)
    conversation = memory.get_or_create_conversation(
        user=current_user,
        conversation_id=payload.conversation_id,
        initial_user_message=payload.query,
    )
    if payload.conversation_id is not None:
        memory.append_message(
            conversation=conversation,
            role="user",
            content=payload.query,
        )

    async def event_stream():
        full_answer = ""
        assistant_stream = AssistantChatService(RAGRetrievalService(db)).stream_answer(
            user=current_user,
            query=payload.query,
            model=payload.model,
            top_k=payload.top_k,
            hybrid=payload.hybrid,
            document_ids=_sanitized_document_ids(payload.document_ids),
        )

        async for chunk in assistant_stream:
            if not chunk.startswith("data: "):
                yield chunk
                continue

            payload_json = chunk[6:].strip()
            data = json.loads(payload_json)

            if data.get("type") == "token":
                full_answer += data.get("content", "")
            elif data.get("type") == "done":
                updated_conversation = memory.sync_conversation_after_response(
                    conversation=conversation,
                    user_message=payload.query,
                    assistant_message=full_answer.strip() or "Unknown based on the provided context.",
                )
                data["conversation_id"] = str(updated_conversation.id)
                data["conversation_title"] = updated_conversation.title
            elif data.get("type") == "context":
                data["conversation_id"] = str(conversation.id)
                data["conversation_title"] = conversation.title

            yield f"data: {json.dumps(data)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/summaries", response_model=AssistantSummaryResponse)
async def summarize_documents(
    payload: AssistantSummaryRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AssistantSummaryResponse:
    apply_rate_limit(request, scope="assistant-summaries", limit=20, user_id=str(current_user.id))
    payload.query = ensure_present(sanitize_text(payload.query, max_length=4000), field_name="query")
    result = await AssistantFeatureService(RAGRetrievalService(db)).summarize_documents(
        user=current_user,
        query=payload.query,
        model=payload.model,
        document_ids=_sanitized_document_ids(payload.document_ids),
    )
    return AssistantSummaryResponse(**result)


@router.post("/quiz", response_model=AssistantQuizResponse)
async def generate_quiz(
    payload: AssistantSummaryRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AssistantQuizResponse:
    apply_rate_limit(request, scope="assistant-quiz", limit=20, user_id=str(current_user.id))
    payload.query = ensure_present(sanitize_text(payload.query, max_length=4000), field_name="query")
    result = await AssistantFeatureService(RAGRetrievalService(db)).generate_quiz(
        user=current_user,
        query=payload.query,
        model=payload.model,
        document_ids=_sanitized_document_ids(payload.document_ids),
    )
    return AssistantQuizResponse(**result)


@router.post("/suggested-prompts", response_model=SuggestedPromptsResponse)
async def suggested_prompts(
    payload: AssistantSummaryRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SuggestedPromptsResponse:
    apply_rate_limit(request, scope="assistant-suggested-prompts", limit=20, user_id=str(current_user.id))
    payload.query = ensure_present(sanitize_text(payload.query, max_length=4000), field_name="query")
    result = await AssistantFeatureService(RAGRetrievalService(db)).suggested_prompts(
        user=current_user,
        query=payload.query,
        model=payload.model,
        document_ids=_sanitized_document_ids(payload.document_ids),
    )
    return SuggestedPromptsResponse(**result)


@router.post("/document-search", response_model=SemanticDocumentSearchResponse)
async def semantic_document_search(
    payload: AssistantSummaryRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SemanticDocumentSearchResponse:
    apply_rate_limit(request, scope="assistant-document-search", limit=30, user_id=str(current_user.id))
    safe_query = ensure_present(sanitize_text(payload.query, max_length=4000), field_name="query")
    retrieval = RAGRetrievalService(db).retrieve(
        user=current_user,
        query=safe_query,
        top_k=8,
        hybrid=True,
        document_ids=_sanitized_document_ids(payload.document_ids),
    )
    seen: set[str] = set()
    results: list[SemanticDocumentSearchItem] = []
    repository = DocumentRepository(db)
    for chunk in retrieval.chunks:
        key = str(chunk.document_id)
        if key in seen:
            continue
        seen.add(key)
        document = repository.get_by_user(chunk.document_id, current_user.id)
        results.append(
            SemanticDocumentSearchItem(
                document_id=key,
                title=chunk.document_title,
                filename=chunk.filename,
                excerpt=chunk.content[:220],
                score=chunk.score,
                tags=[item.strip() for item in (document.tags or "").split(",") if item.strip()] if document else [],
            )
        )
    return SemanticDocumentSearchResponse(results=results)
