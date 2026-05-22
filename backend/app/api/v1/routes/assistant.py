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
from app.schemas.assistant import AnalyticsOverview, DashboardSummary
from app.schemas.rag import AssistantQueryRequest, AssistantQueryResponse, RetrievalResponse
from app.services.assistant_chat import AssistantChatService
from app.services.analytics import AnalyticsService
from app.services.chat_memory import ChatMemoryService
from app.services.rag_pipeline import RAGRetrievalService

router = APIRouter()


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
        stats=[
            {"label": metric.label, "value": metric.value}
            for metric in analytics.metrics
        ],
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
