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
          <div className="text-sm text-destructive/90">{message.content}</div>
          <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{message.createdAt}</span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={cn("flex w-full gap-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-[#1e1e1e] text-indigo-400">
          <Bot className="h-5 w-5" />
        </div>
      )}

      <div
        className={cn(
          "group relative rounded-2xl px-5 py-4 shadow-sm",
          isUser
            ? "max-w-[70%] bg-indigo-600 text-white"
            : "max-w-[75%] border border-border/40 bg-[#1e1e1e]"
        )}
      >
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-white/70 uppercase">
          {isUser ? userName : "Assistant"}
        </div>

        <ChatMarkdown content={message.content} invert={isUser} isStreaming={message.isStreaming} />

        <div className="mt-3 flex items-center justify-between gap-3 text-xs">
          <span className={cn(isUser ? "text-indigo-200" : "text-muted-foreground")}>{message.createdAt}</span>
          <Button
            className={cn(
              "h-7 rounded-lg px-3 opacity-0 transition group-hover:opacity-100",
              isUser ? "bg-black/20 text-white hover:bg-black/30" : "bg-[#2a2a2a] text-muted-foreground hover:text-white"
            )}
            size="sm"
            variant="ghost"
            onClick={() => void copyMessage()}
          >
            {message.isStreaming ? <Check className="mr-1.5 h-3 w-3" /> : <Copy className="mr-1.5 h-3 w-3" />}
            {message.isStreaming ? "Streaming" : "Copy"}
          </Button>
        </div>
      </div>

      {isUser && (
        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-500 border border-indigo-500/20">
          <User2 className="h-5 w-5" />
        </div>
      )}
    </article>
  );
}
