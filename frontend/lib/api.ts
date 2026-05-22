import { apiClient } from "@/lib/api-client";
import {
  AuthFormValues,
  AuthResponse,
  AnalyticsOverview,
  ConversationDetail,
  ConversationListItem,
  DocumentPreview,
  DashboardSummary,
  HealthResponse,
  UploadedDocument,
  User
} from "@/types/api";
import type { RetrievedChunk } from "@/types/rag";

export async function getHealth() {
  const { data } = await apiClient.get<HealthResponse>("/health");
  return data;
}

export async function getDashboardSummary() {
  const { data } = await apiClient.get<DashboardSummary>("/assistant/summary");
  return data;
}

export async function getAnalyticsOverview() {
  const { data } = await apiClient.get<AnalyticsOverview>("/assistant/analytics");
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

export async function listConversations(search?: string) {
  const { data } = await apiClient.get<ConversationListItem[]>("/conversations", {
    params: search?.trim() ? { search } : undefined
  });
  return data;
}

export async function getConversation(conversationId: string) {
  const { data } = await apiClient.get<ConversationDetail>(`/conversations/${conversationId}`);
  return data;
}

export async function createConversation(payload?: {
  title?: string;
  initial_message?: string;
}) {
  const { data } = await apiClient.post<ConversationDetail>("/conversations", payload ?? {});
  return data;
}

export async function renameConversation(conversationId: string, title: string) {
  const { data } = await apiClient.patch<ConversationListItem>(`/conversations/${conversationId}`, {
    title
  });
  return data;
}

export async function deleteConversation(conversationId: string) {
  const { data } = await apiClient.delete<{ message: string }>(`/conversations/${conversationId}`);
  return data;
}

export async function queryAssistant(payload: {
  query: string;
  model: "llama3" | "mistral";
  top_k?: number;
  hybrid?: boolean;
  conversation_id?: string;
}) {
  const { data } = await apiClient.post<{
    query: string;
    answer: string;
    context: string;
    chunks: RetrievedChunk[];
    prompt: string;
    model: string;
    conversation_id: string;
    conversation_title: string;
  }>("/assistant/query", payload);
  return data;
}
