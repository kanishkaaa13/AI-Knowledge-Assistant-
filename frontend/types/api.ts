export interface HealthResponse {
  status: string;
  service: string;
  environment: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at?: string;
}

export interface AuthResponse {
  user: User;
  message: string;
}

export interface AuthFormValues {
  name?: string;
  email: string;
  password: string;
}

export interface DashboardSummary {
  title: string;
  description: string;
  stats: Array<{
    label: string;
    value: string;
  }>;
}

export interface AnalyticsMetric {
  label: string;
  value: string;
  detail: string;
}

export interface AnalyticsSeriesPoint {
  label: string;
  value: number;
}

export interface RecentUploadItem {
  id: string;
  title: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
  status: string;
}

export interface AIUsageStats {
  total_messages: number;
  assistant_messages: number;
  user_messages: number;
  average_messages_per_chat: number;
  local_only_inference: boolean;
  primary_model: string;
}

export interface AnalyticsOverview {
  metrics: AnalyticsMetric[];
  uploads_timeline: AnalyticsSeriesPoint[];
  chats_timeline: AnalyticsSeriesPoint[];
  messages_timeline: AnalyticsSeriesPoint[];
  recent_uploads: RecentUploadItem[];
  ai_usage: AIUsageStats;
}

export interface UploadedDocument {
  id: string;
  user_id: string;
  title: string;
  file_name: string;
  file_extension: string;
  file_path: string | null;
  mime_type: string | null;
  file_size: number | null;
  checksum: string;
  page_count: number | null;
  word_count: number | null;
  status: string;
  extracted_text: string | null;
  created_at: string;
  updated_at: string;
  preview_text?: string | null;
}

export interface DocumentPreview {
  id: string;
  title: string;
  file_name: string;
  file_extension: string;
  mime_type: string | null;
  file_size: number | null;
  page_count: number | null;
  word_count: number | null;
  preview_text: string | null;
}

export interface StoredMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sequence_number: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationListItem {
  id: string;
  user_id: string;
  title: string;
  summary: string | null;
  message_count: number;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail {
  id: string;
  user_id: string;
  title: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
  messages: StoredMessage[];
}
