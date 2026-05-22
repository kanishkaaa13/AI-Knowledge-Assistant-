export interface HealthResponse {
  status: string;
  service: string;
  environment: string;
}

export interface DashboardSummary {
  title: string;
  description: string;
  stats: Array<{
    label: string;
    value: string;
  }>;
}
