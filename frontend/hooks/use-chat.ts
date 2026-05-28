"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createConversation,
  deleteConversation,
  exportConversation,
  favoriteConversation,
  generateAssistantQuiz,
  getConversation,
  getSuggestedPrompts,
  listConversations,
  queryAssistant,
  renameConversation,
  semanticDocumentSearch,
  summarizeAssistantKnowledge
} from "@/lib/api";
import { streamAssistantChat } from "@/lib/chat-stream";
import type { StreamPayload } from "@/lib/chat-stream";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDocuments } from "@/hooks/use-documents";
import type {
  AssistantQuizItem,
  ConversationDetail as ApiConversationDetail,
  ConversationListItem as ApiConversationListItem,
  SemanticDocumentSearchItem,
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
    isFavorite: conversation.is_favorite,
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
    isFavorite: conversation.is_favorite,
    messageCount: conversation.messages.length,
    lastMessagePreview: conversation.messages.at(-1)?.content ?? conversation.summary,
    messages: conversation.messages.map(mapMessage)
  };
}

function groupConversations(conversations: ConversationPreview[]): ConversationGroup[] {
  const groups: Record<string, ConversationPreview[]> = {
    Favorites: conversations.filter((item) => item.isFavorite),
    Recent: conversations.filter((item) => !item.isFavorite)
  };

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
  const [selectedDocumentIds, setSelectedDocumentIds] = React.useState<string[]>([]);
  const [generatedSummary, setGeneratedSummary] = React.useState<string | null>(null);
  const [quiz, setQuiz] = React.useState<AssistantQuizItem[]>([]);
  const [searchResults, setSearchResults] = React.useState<SemanticDocumentSearchItem[]>([]);
  const debouncedSearch = useDebouncedValue(historySearch, 250);
  const { data: allDocsResponse } = useDocuments();
  const allDocs = allDocsResponse?.items ?? [];

  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const data = await listConversations();
      return data.map(mapConversationPreview);
    },
    staleTime: 30_000
  });

  const activeConversationQuery = useQuery({
    queryKey: ["conversation", activeConversationId],
    queryFn: async () => {
      const data = await getConversation(activeConversationId!);
      return mapConversationDetail(data);
    },
    enabled: Boolean(activeConversationId)
  });

  const activeConversation = activeConversationQuery.data;
  const latestReferenceText =
    input.trim() ||
    activeConversation?.messages.at(-1)?.content ||
    activeConversation?.summary ||
    "Summarize my selected documents";

  const suggestedPromptsQuery = useQuery({
    queryKey: ["assistant-suggested-prompts", latestReferenceText, settings.model, selectedDocumentIds],
    queryFn: async () => {
      const result = await getSuggestedPrompts({
        query: latestReferenceText,
        model: settings.model,
        document_ids: selectedDocumentIds
      });
      return result.prompts;
    },
    enabled: Boolean(latestReferenceText)
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
    }
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ conversationId, favorite }: { conversationId: string; favorite: boolean }) =>
      favoriteConversation(conversationId, favorite),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      await queryClient.invalidateQueries({ queryKey: ["conversation", activeConversationId] });
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
    setTimeout(() => {
      document.getElementById("chat-input")?.focus();
    }, 0);
  }, []);

  const selectConversation = React.useCallback((conversationId: string) => {
    React.startTransition(() => {
      setIsDraftConversation(false);
      setActiveConversationId(conversationId);
      setIsSidebarOpen(false);
    });
  }, []);

  const exportCurrentConversation = React.useCallback(async (conversationId: string) => {
    if (conversationId.startsWith("temp-")) return;
    
    // Check if we have messages in cache
    const currentCache = queryClient.getQueryData<ConversationDetail>(["conversation", conversationId]);
    if (!currentCache || !currentCache.messages || currentCache.messages.length === 0) {
      toast.error("Start a conversation first to export");
      return;
    }

    const dateStr = new Date().toLocaleString();
    let text = `AI Knowledge Assistant - Conversation Export\nDate: ${dateStr}\n─────────────────────────────────────────\n\n`;
    
    currentCache.messages.forEach((msg) => {
      text += `[${msg.role.toUpperCase()}] ${msg.createdAt}\n${msg.content}\n\n`;
    });
    text += `─────────────────────────────────────────\n`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `conversation-export-${new Date().toISOString().slice(0, 10)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [queryClient]);

  const updateSettings = React.useCallback((nextSettings: AssistantSettings) => {
    setSettings(nextSettings);
  }, []);

  const renameStoredConversation = React.useCallback(
    async (conversationId: string, title: string) => {
      if (conversationId.startsWith("temp-")) return;
      await renameMutation.mutateAsync({ conversationId, title });
    },
    [renameMutation]
  );

  const removeConversation = React.useCallback(
    async (conversationId: string) => {
      if (conversationId.startsWith("temp-")) {
        setActiveConversationId(undefined);
        return;
      }
      await deleteMutation.mutateAsync(conversationId);
    },
    [deleteMutation]
  );

  const markFavoriteConversation = React.useCallback(
    async (conversationId: string, favorite: boolean) => {
      if (conversationId.startsWith("temp-")) return;
      await favoriteMutation.mutateAsync({ conversationId, favorite });
    },
    [favoriteMutation]
  );

  const toolMutation = useMutation({
    mutationFn: async (tool: "summary" | "quiz" | "search") => {
      const effectiveDocumentIds = selectedDocumentIds.length > 0 ? selectedDocumentIds : allDocs.map(d => d.id);
      const basePayload = {
        query: latestReferenceText,
        model: settings.model,
        document_ids: effectiveDocumentIds
      };
      if (tool === "summary") {
        return {
          tool,
          result: await summarizeAssistantKnowledge(basePayload)
        };
      }
      if (tool === "quiz") {
        return {
          tool,
          result: await generateAssistantQuiz(basePayload)
        };
      }
      return {
        tool,
        result: await semanticDocumentSearch(basePayload)
      };
    },
    onSuccess(data) {
      if (data.tool === "summary") {
        setGeneratedSummary(data.result.summary);
      }
      if (data.tool === "quiz") {
        setQuiz(data.result.questions);
      }
      if (data.tool === "search") {
        setSearchResults(data.result.results);
      }
    },
    onError(error: any) {
      toast.error(error?.response?.data?.detail ?? "Unable to run assistant tool.");
    }
  });

  const sendMessage = React.useCallback(async (overrideText?: string | React.FormEvent | React.MouseEvent) => {
    if (overrideText && typeof overrideText !== "string" && 'preventDefault' in (overrideText as any)) {
      (overrideText as any).preventDefault();
    }
    const promptText = typeof overrideText === "string" ? overrideText : input;
    const prompt = promptText.trim();
    if (!prompt) {
      return;
    }

    if (typeof overrideText !== "string") {
      setInput("");
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
    const isNewConversation = !conversationId;
    if (isNewConversation) {
      conversationId = "temp-" + Date.now();
      React.startTransition(() => {
        setIsDraftConversation(false);
        setActiveConversationId(conversationId);
      });
      setTimeout(() => {
        document.getElementById("chat-input")?.focus();
      }, 0);
    }

    updateConversationCache(conversationId!, (current) => ({
      ...(current ?? {
        id: conversationId!,
        userId: "",
        title: "New conversation",
        summary: prompt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFavorite: false,
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

    updateConversationCache(conversationId!, (current) => ({
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

    const updateAssistantMessage = (updater: (current: string) => string, done = false, targetId = conversationId!) => {
      updateConversationCache(targetId, (current) => ({
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

    const handleNewConversationFinalized = (finalId: string, title?: string, summary?: string) => {
      setActiveConversationId(finalId);
      queryClient.setQueryData<ConversationPreview[]>(["conversations"], (old) => {
        return [
          {
            id: finalId,
            title: title || prompt.substring(0, 40),
            summary: summary || prompt,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            isFavorite: false,
            messageCount: 2,
            lastMessagePreview: summary || prompt
          },
          ...(old ?? [])
        ];
      });

      const tempCache = queryClient.getQueryData<ConversationDetail>(["conversation", conversationId!]);
      if (tempCache) {
        queryClient.setQueryData(["conversation", finalId], {
          ...tempCache,
          id: finalId,
          title: title || prompt.substring(0, 40),
          summary: summary || prompt,
          lastMessagePreview: summary || prompt,
          updatedAt: new Date().toISOString(),
          messageCount: 2
        });
        queryClient.removeQueries({ queryKey: ["conversation", conversationId!] });
      }
    };

    try {
      const effectiveDocumentIds = selectedDocumentIds;
      if (settings.streamResponses) {
        await streamAssistantChat(
          {
            query: prompt,
            model: settings.model as StreamPayload["model"],
            hybrid: true,
            conversation_id: isNewConversation ? undefined : conversationId,
            document_ids: effectiveDocumentIds
          } satisfies StreamPayload,
          {
            onToken(token) {
              updateAssistantMessage((current) => current + token);
            },
            onDone(data) {
              const finalId = data.conversation_id || conversationId;
              if (isNewConversation && finalId) {
                handleNewConversationFinalized(finalId, data.conversation_title, data.answer);
                updateAssistantMessage(() => data.answer, true, finalId);
              } else {
                updateConversationCache(conversationId!, (current) => ({
                  ...(current as ConversationDetail),
                  title: data.conversation_title ?? current?.title ?? "New conversation",
                  summary: data.answer,
                  lastMessagePreview: data.answer,
                  updatedAt: new Date().toISOString(),
                  messageCount: current?.messageCount ?? 0
                }));
                updateAssistantMessage(() => data.answer, true, conversationId!);
              }
            },
            onError(message) {
              updateAssistantMessage(() => `⚠️ Error: ${message}`, true);
            }
          }
        );
      } else {
        const response = await queryAssistant({
          query: prompt,
          model: settings.model,
          hybrid: true,
          conversation_id: isNewConversation ? undefined : conversationId,
          document_ids: effectiveDocumentIds
        });
        
        const finalId = response.conversation_id || conversationId;
        if (isNewConversation && finalId) {
          handleNewConversationFinalized(finalId, response.conversation_title, response.answer);
          updateAssistantMessage(() => response.answer, true, finalId);
        } else {
          updateAssistantMessage(() => response.answer, true);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch (error: any) {
      let errorMessage = error?.message || "Something went wrong.";
      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      updateAssistantMessage(() => `⚠️ Error: ${errorMessage}`, true);
      toast.error("An error occurred. Check the chat for details.");
    }
  }, [
    activeConversationId,
    input,
    queryClient,
    selectedDocumentIds,
    settings.model,
    settings.streamResponses,
    updateConversationCache,
    allDocs
  ]);

  return {
    groupedConversations: groupConversations(conversationsQuery.data ?? []),
    activeConversation,
    activeConversationId,
    generatedSummary,
    historySearch,
    input,
    isConversationLoading: activeConversationQuery.isLoading,
    isHistoryLoading: conversationsQuery.isLoading,
    isSettingsOpen,
    isSidebarOpen,
    isWorkingTools: toolMutation.isPending,
    quiz,
    searchResults,
    selectedDocumentIds,
    settings,
    suggestedPrompts: suggestedPromptsQuery.data ?? [],
    setHistorySearch,
    setInput,
    setIsSidebarOpen,
    setIsSettingsOpen,
    setSelectedDocumentIds,
    createConversation: createConversationDraft,
    deleteConversation: removeConversation,
    exportConversation: exportCurrentConversation,
    favoriteConversation: markFavoriteConversation,
    generateQuiz: async () => toolMutation.mutateAsync("quiz").then(() => undefined),
    generateSummary: async () => toolMutation.mutateAsync("summary").then(() => undefined),
    renameConversation: renameStoredConversation,
    runSemanticSearch: async () => toolMutation.mutateAsync("search").then(() => undefined),
    selectConversation,
    updateSettings,
    useSuggestedPrompt: setInput,
    sendMessage
  };
}
