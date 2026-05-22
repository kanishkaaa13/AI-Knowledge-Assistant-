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
