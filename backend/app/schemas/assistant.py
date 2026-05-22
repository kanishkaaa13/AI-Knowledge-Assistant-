from pydantic import BaseModel


class SummaryStat(BaseModel):
    label: str
    value: str


class DashboardSummary(BaseModel):
    title: str
    description: str
    stats: list[SummaryStat]


class AnalyticsMetric(BaseModel):
    label: str
    value: str
    detail: str


class AnalyticsSeriesPoint(BaseModel):
    label: str
    value: int


class RecentUploadItem(BaseModel):
    id: str
    title: str
    file_name: str
    file_size: int
    uploaded_at: str
    status: str


class AIUsageStats(BaseModel):
    total_messages: int
    assistant_messages: int
    user_messages: int
    average_messages_per_chat: float
    local_only_inference: bool
    primary_model: str


class AnalyticsOverview(BaseModel):
    metrics: list[AnalyticsMetric]
    uploads_timeline: list[AnalyticsSeriesPoint]
    chats_timeline: list[AnalyticsSeriesPoint]
    messages_timeline: list[AnalyticsSeriesPoint]
    recent_uploads: list[RecentUploadItem]
    ai_usage: AIUsageStats
