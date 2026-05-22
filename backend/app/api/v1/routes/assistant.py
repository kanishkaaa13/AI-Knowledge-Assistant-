from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.assistant import DashboardSummary
from app.schemas.rag import AssistantQueryRequest, AssistantQueryResponse, RetrievalResponse
from app.services.rag_pipeline import RAGAnswerService, RAGRetrievalService

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
async def get_summary(_: User = Depends(get_current_user)) -> DashboardSummary:
    return DashboardSummary(
        title="AI Knowledge Assistant",
        description="Monitor ingestion, query performance, and assistant usage from one place.",
        stats=[
            {"label": "Knowledge sources", "value": "12"},
            {"label": "Indexed documents", "value": "248"},
            {"label": "Queries today", "value": "1,024"},
            {"label": "Avg. response time", "value": "820ms"},
        ],
    )


@router.post("/retrieve", response_model=RetrievalResponse)
async def retrieve_context(
    payload: AssistantQueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RetrievalResponse:
    return RAGRetrievalService(db).retrieve(
        user=current_user,
        query=payload.query,
        top_k=payload.top_k,
        hybrid=payload.hybrid,
    )


@router.post("/query", response_model=AssistantQueryResponse)
async def query_assistant(
    payload: AssistantQueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AssistantQueryResponse:
    result = RAGAnswerService(db).answer_query(
        user=current_user,
        query=payload.query,
        top_k=payload.top_k,
        hybrid=payload.hybrid,
    )
    return AssistantQueryResponse(**result)
