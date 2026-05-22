"use client";

import { ChatShell } from "@/components/chat/chat-shell";
import { useChat } from "@/hooks/use-chat";

export default function DashboardPage() {
  const chat = useChat();

  return (
    <ChatShell
      activeConversationId={chat.activeConversationId}
      activeConversationTitle={chat.activeConversation?.title}
      groupedConversations={chat.groupedConversations}
      historySearch={chat.historySearch}
      input={chat.input}
      isConversationLoading={chat.isConversationLoading}
      isHistoryLoading={chat.isHistoryLoading}
      isSettingsOpen={chat.isSettingsOpen}
      isSidebarOpen={chat.isSidebarOpen}
      messages={chat.activeConversation?.messages ?? []}
      onCreateConversation={chat.createConversation}
      onDeleteConversation={chat.deleteConversation}
      onHistorySearchChange={chat.setHistorySearch}
      onInputChange={chat.setInput}
      onRenameConversation={chat.renameConversation}
      onSelectConversation={chat.selectConversation}
      onSendMessage={chat.sendMessage}
      onSettingsChange={chat.updateSettings}
      onSettingsOpenChange={chat.setIsSettingsOpen}
      onSidebarOpenChange={chat.setIsSidebarOpen}
      settings={chat.settings}
    />
  );
}
