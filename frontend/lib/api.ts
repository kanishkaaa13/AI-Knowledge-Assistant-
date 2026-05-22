import { apiClient } from "@/lib/api-client";
import { DashboardSummary, HealthResponse } from "@/types/api";

export async function getHealth() {
  const { data } = await apiClient.get<HealthResponse>("/health");
  return data;
}

export async function getDashboardSummary() {
  const { data } = await apiClient.get<DashboardSummary>("/assistant/summary");
  return data;
}
