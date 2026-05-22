export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  isStreaming?: boolean;
}

export interface ConversationPreview {
  id: string;
  title: string;
  summary: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface AssistantSettings {
  theme: "light" | "dark" | "system";
  model: "llama3" | "mistral";
  webSearch: boolean;
  streamResponses: boolean;
}
