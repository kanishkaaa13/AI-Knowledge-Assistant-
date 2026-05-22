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
