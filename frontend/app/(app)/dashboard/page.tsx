"use client";

import { ChatShell } from "@/components/chat/chat-shell";
import { useChat } from "@/hooks/use-chat";

export default function DashboardPage() {
  const chat = useChat();

  return (
    <ChatShell
      activeConversationId={chat.activeConversationId}
      activeConversationTitle={chat.activeConversation?.title}
      conversations={chat.conversations}
      input={chat.input}
      isSettingsOpen={chat.isSettingsOpen}
      isSidebarOpen={chat.isSidebarOpen}
      messages={chat.activeConversation?.messages ?? []}
      onCreateConversation={chat.createConversation}
      onInputChange={chat.setInput}
      onSelectConversation={chat.selectConversation}
      onSendMessage={chat.sendMessage}
      onSettingsChange={chat.updateSettings}
      onSettingsOpenChange={chat.setIsSettingsOpen}
      onSidebarOpenChange={chat.setIsSidebarOpen}
      settings={chat.settings}
    />
  );
}
