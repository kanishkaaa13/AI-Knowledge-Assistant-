"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Menu, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { AssistantQuizItem, SemanticDocumentSearchItem } from "@/types/api";
import type { AssistantSettings, ConversationGroup } from "@/types/chat";

import { AssistantToolsPanel } from "@/components/chat/assistant-tools-panel";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatThread } from "@/components/chat/chat-thread";
import { MobileSidebar } from "@/components/chat/mobile-sidebar";
import { ProfileDropdown } from "@/components/chat/profile-dropdown";
import { SettingsModal } from "@/components/chat/settings-modal";
import { useAuth } from "@/components/providers/auth-provider";
import type { ChatMessage } from "@/types/chat";

const DocumentManager = dynamic(
  () => import("@/components/documents/document-manager").then((mod) => mod.DocumentManager),
  { ssr: false }
);

interface ChatShellProps {
  activeConversationId?: string;
  activeConversationTitle?: string;
  generatedSummary: string | null;
  groupedConversations: ConversationGroup[];
  historySearch: string;
  input: string;
  isConversationLoading: boolean;
  isHistoryLoading: boolean;
  isSettingsOpen: boolean;
  isSidebarOpen: boolean;
  isWorkingTools: boolean;
  messages: ChatMessage[];
  quiz: AssistantQuizItem[];
  searchResults: SemanticDocumentSearchItem[];
  selectedDocumentIds: string[];
  settings: AssistantSettings;
  suggestedPrompts: string[];
  onCreateConversation: () => void;
  onDeleteConversation: (conversationId: string) => Promise<void>;
  onExportConversation: (conversationId: string) => Promise<void>;
  onFavoriteConversation: (conversationId: string, favorite: boolean) => Promise<void>;
  onGenerateQuiz: () => Promise<void>;
  onGenerateSummary: () => Promise<void>;
  onHistorySearchChange: (value: string) => void;
  onInputChange: (value: string) => void;
  onRenameConversation: (conversationId: string, title: string) => Promise<void>;
  onRunSemanticSearch: () => Promise<void>;
  onSelectConversation: (conversationId: string) => void;
  onSelectedDocumentIdsChange: (ids: string[]) => void;
  onSendMessage: () => Promise<void>;
  onSettingsChange: (settings: AssistantSettings) => void;
  onSettingsOpenChange: (open: boolean) => void;
  onSidebarOpenChange: (open: boolean) => void;
  onUseSuggestedPrompt: (prompt: string) => void;
}

export function ChatShell({
  activeConversationId,
  activeConversationTitle,
  generatedSummary,
  groupedConversations,
  historySearch,
  input,
  isConversationLoading,
  isHistoryLoading,
  isSettingsOpen,
  isSidebarOpen,
  isWorkingTools,
  messages,
  quiz,
  searchResults,
  selectedDocumentIds,
  settings,
  suggestedPrompts,
  onCreateConversation,
  onDeleteConversation,
  onExportConversation,
  onFavoriteConversation,
  onGenerateQuiz,
  onGenerateSummary,
  onHistorySearchChange,
  onInputChange,
  onRenameConversation,
  onRunSemanticSearch,
  onSelectConversation,
  onSelectedDocumentIdsChange,
  onSendMessage,
  onSettingsChange,
  onSettingsOpenChange,
  onSidebarOpenChange,
  onUseSuggestedPrompt
}: ChatShellProps) {
  const { user } = useAuth();
  const [isToolsOpen, setIsToolsOpen] = React.useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a]">
      <div className="hidden xl:flex xl:flex-shrink-0 h-full">
        <ChatSidebar
          activeConversationId={activeConversationId}
          groupedConversations={groupedConversations}
          historySearch={historySearch}
          isLoading={isHistoryLoading}
          onCreateConversation={onCreateConversation}
          onDeleteConversation={onDeleteConversation}
          onExportConversation={onExportConversation}
          onFavoriteConversation={onFavoriteConversation}
          onHistorySearchChange={onHistorySearchChange}
          onRenameConversation={onRenameConversation}
          onSelectConversation={onSelectConversation}
          onOpenSettings={() => onSettingsOpenChange(true)}
        />
      </div>

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 border-b border-border/40 bg-[#0a0a0a]/80 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Button
                className="xl:hidden"
                size="sm"
                variant="secondary"
                onClick={() => onSidebarOpenChange(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <ChatHeader
                title={activeConversationTitle ?? "New conversation"}
                subtitle="Chat with your private knowledge assistant"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                className="xl:hidden"
                size="sm"
                variant="secondary"
                onClick={() => setIsToolsOpen(true)}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col">
            <ChatThread
              isLoading={isConversationLoading}
              messages={messages}
              userName={user?.name ?? "You"}
            />
            <div className="border-t border-border/40 bg-[#0a0a0a]/90 px-4 py-4 backdrop-blur-xl sm:px-6">
              <ChatInput
                input={input}
                onInputChange={onInputChange}
                onSendMessage={onSendMessage}
                streamResponses={settings.streamResponses}
              />
            </div>
          </div>
        </main>
      </div>

      <AssistantToolsPanel
        generatedSummary={generatedSummary}
        isWorking={isWorkingTools}
        quiz={quiz}
        searchResults={searchResults}
        selectedDocumentIds={selectedDocumentIds}
        suggestedPrompts={suggestedPrompts}
        onExportConversation={() => activeConversationId ? onExportConversation(activeConversationId) : Promise.resolve()}
        onGenerateQuiz={onGenerateQuiz}
        onGenerateSummary={onGenerateSummary}
        onRunSemanticSearch={onRunSemanticSearch}
        onUsePrompt={onUseSuggestedPrompt}
        onSelectedDocumentIdsChange={onSelectedDocumentIdsChange}
        className="hidden xl:flex h-full"
      />

      <DocumentManager
        selectedDocumentIds={selectedDocumentIds}
        onSelectedDocumentIdsChange={onSelectedDocumentIdsChange}
      />

      <MobileSidebar open={isSidebarOpen} onOpenChange={onSidebarOpenChange}>
        <ChatSidebar
          activeConversationId={activeConversationId}
          groupedConversations={groupedConversations}
          historySearch={historySearch}
          isLoading={isHistoryLoading}
          onCreateConversation={onCreateConversation}
          onDeleteConversation={onDeleteConversation}
          onExportConversation={onExportConversation}
          onFavoriteConversation={onFavoriteConversation}
          onHistorySearchChange={onHistorySearchChange}
          onRenameConversation={onRenameConversation}
          onSelectConversation={onSelectConversation}
          onOpenSettings={() => onSettingsOpenChange(true)}
        />
      </MobileSidebar>

      <Dialog open={isToolsOpen} onOpenChange={setIsToolsOpen}>
        <DialogContent className="right-0 top-0 h-screen max-w-[340px] translate-x-0 translate-y-0 rounded-none border-l p-0 xl:hidden">
          <AssistantToolsPanel
            generatedSummary={generatedSummary}
            isWorking={isWorkingTools}
            quiz={quiz}
            searchResults={searchResults}
            selectedDocumentIds={selectedDocumentIds}
            suggestedPrompts={suggestedPrompts}
            onExportConversation={() => activeConversationId ? onExportConversation(activeConversationId) : Promise.resolve()}
            onGenerateQuiz={onGenerateQuiz}
            onGenerateSummary={onGenerateSummary}
            onRunSemanticSearch={onRunSemanticSearch}
            onUsePrompt={onUseSuggestedPrompt}
            onSelectedDocumentIdsChange={onSelectedDocumentIdsChange}
            className="flex"
          />
        </DialogContent>
      </Dialog>

      <SettingsModal
        onOpenChange={onSettingsOpenChange}
        onSave={onSettingsChange}
        open={isSettingsOpen}
        settings={settings}
      />
    </div>
  );
}
