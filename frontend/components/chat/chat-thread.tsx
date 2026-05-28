"use client";

import { useAutoScroll } from "@/hooks/use-auto-scroll";
import type { ChatMessage } from "@/types/chat";

import { ChatEmptyState } from "@/components/chat/chat-empty-state";
import { ChatMessageBubble } from "@/components/chat/chat-message-bubble";
import { ChatSkeleton } from "@/components/chat/chat-skeleton";

export function ChatThread({
  isLoading,
  messages,
  userName,
  onUsePrompt
}: {
  isLoading?: boolean;
  messages: ChatMessage[];
  userName: string;
  onUsePrompt?: (prompt: string) => void;
}) {
  const scrollRef = useAutoScroll<HTMLDivElement>(messages);
  const hasStreamingMessage = messages.some((message) => message.isStreaming);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <ChatSkeleton />
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return <ChatEmptyState onUsePrompt={onUsePrompt} />;
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        {messages.map((message) => (
          <ChatMessageBubble key={message.id} message={message} userName={userName} />
        ))}
        {hasStreamingMessage ? <ChatSkeleton /> : null}
      </div>
    </div>
  );
}
