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
    <article className={cn("flex gap-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser ? (
        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Bot className="h-5 w-5" />
        </div>
      ) : null}

      <div
        className={cn(
          "group relative max-w-3xl rounded-[2rem] border px-5 py-4 shadow-sm",
          isUser
            ? "border-primary/20 bg-primary text-primary-foreground"
            : "border-border/60 bg-card/80 backdrop-blur"
        )}
      >
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em]">
          {isUser ? (
            <>
              <User2 className="h-3.5 w-3.5" />
              {userName}
            </>
          ) : (
            <>
              <Bot className="h-3.5 w-3.5" />
              Assistant
            </>
          )}
        </div>

        <ChatMarkdown content={message.content} invert={isUser} isStreaming={message.isStreaming} />

        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className={cn(isUser ? "text-primary-foreground/70" : "")}>{message.createdAt}</span>
          <Button
            className={cn(
              "h-8 rounded-full px-3 opacity-0 transition group-hover:opacity-100",
              isUser ? "bg-white/10 text-primary-foreground hover:bg-white/15" : ""
            )}
            size="sm"
            variant={isUser ? "ghost" : "secondary"}
            onClick={() => void copyMessage()}
          >
            {message.isStreaming ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
            {message.isStreaming ? "Streaming" : "Copy"}
          </Button>
        </div>
      </div>
    </article>
  );
}
