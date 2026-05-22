"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  queryAssistant,
  renameConversation
} from "@/lib/api";
import { streamAssistantChat } from "@/lib/chat-stream";
import type {
  ConversationDetail as ApiConversationDetail,
  ConversationListItem as ApiConversationListItem,
  StoredMessage
} from "@/types/api";
import type {
  AssistantSettings,
  ChatMessage,
  ConversationDetail,
  ConversationGroup,
  ConversationPreview
} from "@/types/chat";

const starterSettings: AssistantSettings = {
  theme: "system",
  model: "llama3",
  webSearch: true,
  streamResponses: true
};

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatMessageTime(timestamp: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function mapMessage(message: StoredMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: formatMessageTime(message.created_at),
    sequenceNumber: message.sequence_number
  };
}

function mapConversationPreview(conversation: ApiConversationListItem): ConversationPreview {
  return {
    id: conversation.id,
    title: conversation.title,
    summary: conversation.summary,
    updatedAt: conversation.updated_at,
    createdAt: conversation.created_at,
    messageCount: conversation.message_count,
    lastMessagePreview: conversation.last_message_preview
  };
}

function mapConversationDetail(conversation: ApiConversationDetail): ConversationDetail {
  return {
    id: conversation.id,
    userId: conversation.user_id,
    title: conversation.title,
    summary: conversation.summary,
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
    messageCount: conversation.messages.length,
    lastMessagePreview: conversation.messages.at(-1)?.content ?? conversation.summary,
    messages: conversation.messages.map(mapMessage)
  };
}

function groupConversations(conversations: ConversationPreview[]): ConversationGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 24 * 60 * 60 * 1000;
  const lastWeek = today - 7 * 24 * 60 * 60 * 1000;
  const lastMonth = today - 30 * 24 * 60 * 60 * 1000;

  const groups: Record<string, ConversationPreview[]> = {
    Today: [],
    Yesterday: [],
    "Last 7 days": [],
    "Last 30 days": [],
    Older: []
  };

  for (const conversation of conversations) {
    const updatedAt = new Date(conversation.updatedAt).getTime();
    if (updatedAt >= today) {
      groups.Today.push(conversation);
    } else if (updatedAt >= yesterday) {
      groups.Yesterday.push(conversation);
    } else if (updatedAt >= lastWeek) {
      groups["Last 7 days"].push(conversation);
    } else if (updatedAt >= lastMonth) {
      groups["Last 30 days"].push(conversation);
    } else {
      groups.Older.push(conversation);
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, conversations: items }));
}

export function useChat() {
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = React.useState<string | undefined>();
  const [input, setInput] = React.useState("");
  const [historySearch, setHistorySearch] = React.useState("");
  const [isDraftConversation, setIsDraftConversation] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [settings, setSettings] = React.useState(starterSettings);
  const deferredSearch = React.useDeferredValue(historySearch);

  const conversationsQuery = useQuery({
    queryKey: ["conversations", deferredSearch],
    queryFn: async () => {
      const data = await listConversations(deferredSearch || undefined);
      return data.map(mapConversationPreview);
    }
  });

  const activeConversationQuery = useQuery({
    queryKey: ["conversation", activeConversationId],
    queryFn: async () => {
      const data = await getConversation(activeConversationId!);
      return mapConversationDetail(data);
    },
    enabled: Boolean(activeConversationId)
  });

  React.useEffect(() => {
    if (
      !isDraftConversation &&
      !activeConversationId &&
      conversationsQuery.data &&
      conversationsQuery.data.length > 0
    ) {
      setActiveConversationId(conversationsQuery.data[0].id);
    }
  }, [activeConversationId, conversationsQuery.data, isDraftConversation]);

  const renameMutation = useMutation({
    mutationFn: async ({ conversationId, title }: { conversationId: string; title: string }) =>
      renameConversation(conversationId, title),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      await queryClient.invalidateQueries({ queryKey: ["conversation", variables.conversationId] });
      toast.success("Conversation renamed");
    },
    onError(error: any) {
      toast.error(error?.message || "Unable to rename the conversation.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteConversation,
    onSuccess: async (_, conversationId) => {
      if (activeConversationId === conversationId) {
        React.startTransition(() => {
          setIsDraftConversation(false);
          setActiveConversationId(undefined);
        });
      }
      queryClient.removeQueries({ queryKey: ["conversation", conversationId] });
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversation deleted");
    },
    onError(error: any) {
      toast.error(error?.message || "Unable to delete the conversation.");
    }
  });

  const updateConversationCache = React.useCallback(
    (conversationId: string, updater: (current: ConversationDetail | undefined) => ConversationDetail) => {
      queryClient.setQueryData<ConversationDetail>(["conversation", conversationId], (current) =>
        updater(current)
      );
    },
    [queryClient]
  );

  const createConversationDraft = React.useCallback(() => {
    React.startTransition(() => {
      setIsDraftConversation(true);
      setActiveConversationId(undefined);
      setInput("");
      setIsSidebarOpen(false);
    });
  }, []);

  const selectConversation = React.useCallback((conversationId: string) => {
    React.startTransition(() => {
      setIsDraftConversation(false);
      setActiveConversationId(conversationId);
      setIsSidebarOpen(false);
    });
  }, []);

  const updateSettings = React.useCallback((nextSettings: AssistantSettings) => {
    setSettings(nextSettings);
  }, []);

  const renameStoredConversation = React.useCallback(
    async (conversationId: string, title: string) => {
      await renameMutation.mutateAsync({ conversationId, title });
    },
    [renameMutation]
  );

  const removeConversation = React.useCallback(
    async (conversationId: string) => {
      await deleteMutation.mutateAsync(conversationId);
    },
    [deleteMutation]
  );

  const sendMessage = React.useCallback(async () => {
    const prompt = input.trim();
    if (!prompt) {
      return;
    }

    const optimisticAssistantId = createId("assistant");
    const optimisticUserMessage: ChatMessage = {
      id: createId("user"),
      role: "user",
      content: prompt,
      createdAt: formatMessageTime(new Date().toISOString())
    };

    setInput("");

    let conversationId = activeConversationId;
    if (!conversationId) {
      const createdConversation = mapConversationDetail(await createConversation());
      conversationId = createdConversation.id;
      queryClient.setQueryData(["conversation", conversationId], createdConversation);
      React.startTransition(() => {
        setIsDraftConversation(false);
        setActiveConversationId(conversationId);
      });
    }

    updateConversationCache(conversationId, (current) => ({
      ...(current ?? {
        id: conversationId,
        userId: "",
        title: "New conversation",
        summary: prompt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
        lastMessagePreview: prompt,
        messages: []
      }),
      summary: prompt,
      updatedAt: new Date().toISOString(),
      messageCount: (current?.messageCount ?? 0) + 1,
      lastMessagePreview: prompt,
      messages: [...(current?.messages ?? []), optimisticUserMessage]
    }));

    updateConversationCache(conversationId, (current) => ({
      ...(current as ConversationDetail),
      messages: [
        ...((current as ConversationDetail).messages ?? []),
        {
          id: optimisticAssistantId,
          role: "assistant",
          content: "",
          createdAt: formatMessageTime(new Date().toISOString()),
          isStreaming: settings.streamResponses
        }
      ]
    }));

    const updateAssistantMessage = (updater: (current: string) => string, done = false) => {
      updateConversationCache(conversationId!, (current) => ({
        ...(current as ConversationDetail),
        messages: (current?.messages ?? []).map((message) =>
          message.id !== optimisticAssistantId
            ? message
            : {
                ...message,
                content: updater(message.content),
                isStreaming: !done && settings.streamResponses
              }
        )
      }));
    };

    try {
      if (settings.streamResponses) {
        await streamAssistantChat(
          {
            query: prompt,
            model: settings.model,
            hybrid: true,
            conversation_id: conversationId
          },
          {
            onContext(data) {
              if (!data?.conversation_id) {
                return;
              }

              updateConversationCache(data.conversation_id, (current) => ({
                ...(current as ConversationDetail),
                id: data.conversation_id,
                title: data.conversation_title ?? current?.title ?? "New conversation"
              }));
            },
            onToken(token) {
              updateAssistantMessage((current) => current + token);
            },
            onDone(data) {
              updateAssistantMessage(() => data.answer, true);
              updateConversationCache(conversationId!, (current) => ({
                ...(current as ConversationDetail),
                title: data.conversation_title ?? current?.title ?? "New conversation",
                summary: data.answer,
                lastMessagePreview: data.answer,
                updatedAt: new Date().toISOString(),
                messageCount: current?.messageCount ?? 0
              }));
            }
          }
        );
      } else {
        const response = await queryAssistant({
          query: prompt,
          model: settings.model,
          hybrid: true,
          conversation_id: conversationId
        });
        updateAssistantMessage(() => response.answer, true);
        updateConversationCache(conversationId, (current) => ({
          ...(current as ConversationDetail),
          title: response.conversation_title,
          summary: response.answer,
          lastMessagePreview: response.answer,
          updatedAt: new Date().toISOString()
        }));
      }

      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch (error: any) {
      const message = error?.message || "Unable to generate a local AI response.";
      updateAssistantMessage(() => message, true);
      toast.error(message);
    }
  }, [
    activeConversationId,
    input,
    queryClient,
    settings.model,
    settings.streamResponses,
    updateConversationCache
  ]);

  return {
    conversations: conversationsQuery.data ?? [],
    groupedConversations: groupConversations(conversationsQuery.data ?? []),
    activeConversation: activeConversationQuery.data,
    activeConversationId,
    historySearch,
    input,
    isConversationLoading: activeConversationQuery.isLoading,
    isHistoryLoading: conversationsQuery.isLoading,
    isSettingsOpen,
    isSidebarOpen,
    settings,
    setHistorySearch,
    setInput,
    setIsSidebarOpen,
    setIsSettingsOpen,
    createConversation: createConversationDraft,
    deleteConversation: removeConversation,
    renameConversation: renameStoredConversation,
    selectConversation,
    updateSettings,
    sendMessage
  };
}
