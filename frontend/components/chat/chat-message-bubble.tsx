"use client";

import { Bot, Check, Copy, User2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/chat";

import { ChatMarkdown } from "@/components/chat/chat-markdown";

export function ChatMessageBubble({
  message,
  userName
}: {
  message: ChatMessage;
  userName: string;
}) {
  const isUser = message.role === "user";
  const isError = !isUser && (message.content.startsWith('{"detail":') || message.content.startsWith("⚠️ Error:"));

  async function copyMessage() {
    await navigator.clipboard.writeText(message.content);
    toast.success("Message copied");
  }

  if (isError) {
    const errorText = message.content.replace(/^⚠️ Error: /, "").replace(/^\{"detail":\s*"(.*)"\}$/, "$1");
    return (
      <article className="flex gap-4 justify-start">
        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <Bot className="h-5 w-5" />
        </div>
        <div className="max-w-3xl rounded-[2rem] border border-destructive/30 bg-destructive/5 px-5 py-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-destructive">
            <Bot className="h-3.5 w-3.5" />
            Error
          </div>
          <div className="text-sm text-destructive/90">{errorText}</div>
          <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{message.createdAt}</span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={cn("flex w-full gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="mt-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--assistant-bubble)] border border-[var(--border-color)] text-sm">
          🤖
        </div>
      )}

      <div className={cn("flex flex-col", isUser ? "items-end max-w-[68%]" : "items-start max-w-[72%]")}>
        <div
          className={cn(
            "group relative px-5 py-3 shadow-sm",
            isUser
              ? "bg-[#6366f1] text-white rounded-[18px_18px_4px_18px]"
              : "bg-[var(--assistant-bubble)] border border-[var(--border-color)] rounded-[18px_18px_18px_4px]"
          )}
        >
          <ChatMarkdown content={message.content} invert={isUser} isStreaming={message.isStreaming} />
        </div>
        <div className={cn("mt-1.5 flex items-center gap-2 px-1", isUser ? "flex-row-reverse" : "flex-row")}>
          <span className="text-[11px] font-medium text-[var(--text-secondary)]">{message.createdAt}</span>
          <button onClick={() => void copyMessage()} className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-secondary)]">
             {message.isStreaming ? "Streaming" : "Copy"}
          </button>
        </div>
      </div>

      {isUser && (
        <div className="mt-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-xs font-semibold uppercase">
          {userName.charAt(0) || "U"}
        </div>
      )}
    </article>
  );
}
