export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  sequenceNumber?: number;
  isStreaming?: boolean;
}

export interface ConversationPreview {
  id: string;
  title: string;
  summary: string | null;
  updatedAt: string;
  createdAt: string;
  isFavorite: boolean;
  messageCount: number;
  lastMessagePreview?: string | null;
}

export interface ConversationDetail extends ConversationPreview {
  userId: string;
  messages: ChatMessage[];
}

export interface AssistantSettings {
  theme: "light" | "dark" | "system";
  model: "llama3" | "mistral";
  webSearch: boolean;
  streamResponses: boolean;
}

export interface ConversationGroup {
  label: string;
  conversations: ConversationPreview[];
}

export interface AssistantWorkspaceState {
  selectedDocumentIds: string[];
  suggestedPrompts: string[];
  generatedSummary: string | null;
}
