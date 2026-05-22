from pydantic import BaseModel


class SummaryStat(BaseModel):
    label: str
    value: str


class DashboardSummary(BaseModel):
    title: str
    description: str
    stats: list[SummaryStat]
