import { apiClient } from "@/lib/api-client";
import {
  AuthFormValues,
  AuthResponse,
  DocumentPreview,
  DashboardSummary,
  HealthResponse,
  UploadedDocument,
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

export async function listDocuments() {
  const { data } = await apiClient.get<UploadedDocument[]>("/documents");
  return data;
}

export async function uploadDocument(
  file: File,
  title: string,
  onProgress?: (progress: number) => void
) {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("file", file);

  const { data } = await apiClient.post<UploadedDocument>("/documents/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    },
    onUploadProgress(progressEvent) {
      if (!progressEvent.total || !onProgress) {
        return;
      }
      onProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
    }
  });

  return data;
}

export async function deleteDocument(documentId: string) {
  const { data } = await apiClient.delete<{ message: string }>(`/documents/${documentId}`);
  return data;
}

export async function getDocumentPreview(documentId: string) {
  const { data } = await apiClient.get<DocumentPreview>(`/documents/${documentId}/preview`);
  return data;
}
