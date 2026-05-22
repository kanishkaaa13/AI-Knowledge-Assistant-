"use client";

import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AssistantSettings, ConversationPreview } from "@/types/chat";

import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatThread } from "@/components/chat/chat-thread";
import { MobileSidebar } from "@/components/chat/mobile-sidebar";
import { ProfileDropdown } from "@/components/chat/profile-dropdown";
import { SettingsModal } from "@/components/chat/settings-modal";
import { useAuth } from "@/components/providers/auth-provider";
import type { ChatMessage } from "@/types/chat";

interface ChatShellProps {
  activeConversationId?: string;
  activeConversationTitle?: string;
  conversations: ConversationPreview[];
  input: string;
  isSettingsOpen: boolean;
  isSidebarOpen: boolean;
  messages: ChatMessage[];
  settings: AssistantSettings;
  onCreateConversation: () => void;
  onInputChange: (value: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onSendMessage: () => Promise<void>;
  onSettingsChange: (settings: AssistantSettings) => void;
  onSettingsOpenChange: (open: boolean) => void;
  onSidebarOpenChange: (open: boolean) => void;
}

export function ChatShell({
  activeConversationId,
  activeConversationTitle,
  conversations,
  input,
  isSettingsOpen,
  isSidebarOpen,
  messages,
  settings,
  onCreateConversation,
  onInputChange,
  onSelectConversation,
  onSendMessage,
  onSettingsChange,
  onSettingsOpenChange,
  onSidebarOpenChange
}: ChatShellProps) {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden xl:block">
        <ChatSidebar
          activeConversationId={activeConversationId}
          activeConversationTitle={activeConversationTitle}
          conversations={conversations}
          onCreateConversation={onCreateConversation}
          onSelectConversation={onSelectConversation}
        />
      </div>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-xl">
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

            <ProfileDropdown onOpenSettings={() => onSettingsOpenChange(true)} />
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col">
          <ChatThread messages={messages} userName={user?.name ?? "You"} />
          <ChatInput
            input={input}
            onInputChange={onInputChange}
            onSendMessage={onSendMessage}
            streamResponses={settings.streamResponses}
          />
        </main>
      </div>

      <MobileSidebar open={isSidebarOpen} onOpenChange={onSidebarOpenChange}>
        <ChatSidebar
          activeConversationId={activeConversationId}
          activeConversationTitle={activeConversationTitle}
          conversations={conversations}
          onCreateConversation={onCreateConversation}
          onSelectConversation={onSelectConversation}
        />
      </MobileSidebar>

      <SettingsModal
        onOpenChange={onSettingsOpenChange}
        onSave={onSettingsChange}
        open={isSettingsOpen}
        settings={settings}
      />
    </div>
  );
}
