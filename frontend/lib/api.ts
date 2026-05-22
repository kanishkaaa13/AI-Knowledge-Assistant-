import { apiClient } from "@/lib/api-client";
import {
  AuthFormValues,
  AuthResponse,
  DashboardSummary,
  HealthResponse,
  User
} from "@/types/api";

export async function getHealth() {
  const { data } = await apiClient.get<HealthResponse>("/health");
  return data;
}

export async function getDashboardSummary() {
  const { data } = await apiClient.get<DashboardSummary>("/assistant/summary");
  return data;
}

export async function login(payload: AuthFormValues) {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", payload);
  return data;
}

export async function register(payload: AuthFormValues) {
  const { data } = await apiClient.post<AuthResponse>("/auth/register", payload);
  return data;
}

export async function logout() {
  const { data } = await apiClient.post<{ message: string }>("/auth/logout");
  return data;
}

export async function getCurrentUser() {
  const { data } = await apiClient.get<User>("/auth/me");
  return data;
}

export async function refreshSession() {
  const { data } = await apiClient.post<AuthResponse>("/auth/refresh");
  return data;
}
