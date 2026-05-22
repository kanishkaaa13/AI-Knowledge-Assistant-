"use client";

import * as React from "react";

import type { AssistantSettings, ChatMessage, ConversationPreview } from "@/types/chat";

const starterConversations: ConversationPreview[] = [
  {
    id: "conv-product-strategy",
    title: "Product launch brief",
    summary: "Outline a launch plan for the knowledge assistant.",
    updatedAt: "2 min ago",
    messages: [
      {
        id: "msg-1",
        role: "assistant",
        content:
          "Welcome back. I can help you plan launches, summarize research, and draft technical decisions. What should we tackle first?",
        createdAt: "09:10"
      }
    ]
  },
  {
    id: "conv-rag-stack",
    title: "RAG architecture ideas",
    summary: "Compare retrieval patterns and chunking strategies.",
    updatedAt: "Yesterday",
    messages: [
      {
        id: "msg-2",
        role: "user",
        content: "What is a good chunking strategy for markdown knowledge bases?",
        createdAt: "Yesterday"
      },
      {
        id: "msg-3",
        role: "assistant",
        content:
          "For markdown-heavy corpora, chunk by heading hierarchy first, then cap by token budget. Preserve heading context in each chunk so retrieval results stay understandable.",
        createdAt: "Yesterday"
      }
    ]
  }
];

const starterSettings: AssistantSettings = {
  theme: "system",
  model: "GPT-4.1 mini",
  webSearch: true,
  streamResponses: true
};

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function summarize(text: string) {
  return text.length > 72 ? `${text.slice(0, 72)}...` : text;
}

function buildResponse(prompt: string) {
  return `Here is a focused response for your latest prompt.\n\n### Key takeaways\n- I captured the intent behind: "${prompt}".\n- This interface is ready for streaming, markdown answers, and code-heavy assistant replies.\n- The next backend step is to connect this composer to your conversation and message APIs.\n\n\`\`\`ts\nconst answer = await assistant.stream({\n  prompt: "${prompt.replace(/"/g, '\\"')}",\n  mode: "knowledge"\n});\n\`\`\`\n\nIf you want, I can also help turn this into a retrieval-aware assistant workflow with citations and saved conversation state.`;
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
      summary: "Start a new thread with your assistant.",
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
    const fullResponse = buildResponse(prompt);

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
                  content: settings.streamResponses ? "" : fullResponse,
                  createdAt: "Now",
                  isStreaming: settings.streamResponses
                }
              ]
            }
      )
    );

    if (!settings.streamResponses) {
      return;
    }

    await new Promise<void>((resolve) => {
      let index = 0;
      const timer = window.setInterval(() => {
        index += 8;
        const nextSlice = fullResponse.slice(0, index);
        const finished = index >= fullResponse.length;

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
                          content: nextSlice,
                          isStreaming: !finished
                        }
                  )
                }
          )
        );

        if (finished) {
          window.clearInterval(timer);
          resolve();
        }
      }, 45);
    });
  }, [activeConversationId, input, settings.streamResponses]);

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
