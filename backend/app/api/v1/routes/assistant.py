from fastapi import APIRouter

from app.schemas.assistant import DashboardSummary

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
async def get_summary() -> DashboardSummary:
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
