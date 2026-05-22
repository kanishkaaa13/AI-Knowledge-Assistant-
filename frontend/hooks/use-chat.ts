"use client";

import * as React from "react";
import { toast } from "sonner";

import { queryAssistant } from "@/lib/api";
import { streamAssistantChat } from "@/lib/chat-stream";
import type { AssistantSettings, ChatMessage, ConversationPreview } from "@/types/chat";

const starterConversations: ConversationPreview[] = [
  {
    id: "conv-welcome",
    title: "Welcome",
    summary: "Grounded assistant with Ollama streaming",
    updatedAt: "Now",
    messages: [
      {
        id: "msg-welcome",
        role: "assistant",
        content:
          "I answer only from your retrieved context. Upload documents, then ask grounded questions with `llama3` or `mistral`.",
        createdAt: "Now"
      }
    ]
  }
];

const starterSettings: AssistantSettings = {
  theme: "system",
  model: "llama3",
  webSearch: true,
  streamResponses: true
};

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function summarize(text: string) {
  return text.length > 72 ? `${text.slice(0, 72)}...` : text;
}

export function useChat() {
  const [conversations, setConversations] = React.useState(starterConversations);
  const [activeConversationId, setActiveConversationId] = React.useState(
    starterConversations[0]?.id ?? ""
  );
  const [input, setInput] = React.useState("");
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [settings, setSettings] = React.useState(starterSettings);

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId
  );

  const createConversation = React.useCallback(() => {
    const id = createId("conv");
    const newConversation: ConversationPreview = {
      id,
      title: "New conversation",
      summary: "Start a grounded chat with your indexed documents.",
      updatedAt: "Just now",
      messages: []
    };

    setConversations((current) => [newConversation, ...current]);
    setActiveConversationId(id);
    setInput("");
    setIsSidebarOpen(false);
  }, []);

  const selectConversation = React.useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
    setIsSidebarOpen(false);
  }, []);

  const updateSettings = React.useCallback((nextSettings: AssistantSettings) => {
    setSettings(nextSettings);
  }, []);

  const sendMessage = React.useCallback(async () => {
    const prompt = input.trim();
    if (!prompt) {
      return;
    }

    let targetId = activeConversationId;
    if (!targetId) {
      targetId = createId("conv");
      const freshConversation: ConversationPreview = {
        id: targetId,
        title: summarize(prompt),
        summary: "Fresh conversation",
        updatedAt: "Just now",
        messages: []
      };
      setConversations((current) => [freshConversation, ...current]);
      setActiveConversationId(targetId);
    }

    const userMessage: ChatMessage = {
      id: createId("user"),
      role: "user",
      content: prompt,
      createdAt: "Now"
    };

    const assistantMessageId = createId("assistant");

    setInput("");
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id !== targetId
          ? conversation
          : {
              ...conversation,
              title: conversation.messages.length === 0 ? summarize(prompt) : conversation.title,
              summary: summarize(prompt),
              updatedAt: "Just now",
              messages: [
                ...conversation.messages,
                userMessage,
                {
                  id: assistantMessageId,
                  role: "assistant",
                  content: "",
                  createdAt: "Now",
                  isStreaming: settings.streamResponses
                }
              ]
            }
      )
    );

    const updateAssistantMessage = (updater: (current: string) => string, done = false) => {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id !== targetId
            ? conversation
            : {
                ...conversation,
                messages: conversation.messages.map((message) =>
                  message.id !== assistantMessageId
                    ? message
                    : {
                        ...message,
                        content: updater(message.content),
                        isStreaming: !done && settings.streamResponses
                      }
                )
              }
        )
      );
    };

    try {
      if (settings.streamResponses) {
        await streamAssistantChat(
          {
            query: prompt,
            model: settings.model,
            hybrid: true
          },
          {
            onToken(token) {
              updateAssistantMessage((current) => current + token);
            },
            onDone(payload) {
              updateAssistantMessage(() => payload.answer, true);
            }
          }
        );
      } else {
        const response = await queryAssistant({
          query: prompt,
          model: settings.model,
          hybrid: true
        });
        updateAssistantMessage(() => response.answer, true);
      }
    } catch (error: any) {
      const message = error?.message || "Unable to generate a local AI response.";
      updateAssistantMessage(() => message, true);
      toast.error(message);
    }
  }, [activeConversationId, input, settings.model, settings.streamResponses]);

  return {
    conversations,
    activeConversation,
    activeConversationId,
    input,
    isSidebarOpen,
    isSettingsOpen,
    settings,
    setInput,
    setIsSidebarOpen,
    setIsSettingsOpen,
    createConversation,
    selectConversation,
    updateSettings,
    sendMessage
  };
}
