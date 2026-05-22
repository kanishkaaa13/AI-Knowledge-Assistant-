"use client";

import { Clock3, MessageSquarePlus, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ConversationPreview } from "@/types/chat";

export function ChatSidebar({
  activeConversationId,
  activeConversationTitle,
  conversations,
  onCreateConversation,
  onSelectConversation
}: {
  activeConversationId?: string;
  activeConversationTitle?: string;
  conversations: ConversationPreview[];
  onCreateConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
}) {
  return (
    <aside className="flex h-screen w-[320px] flex-col border-r border-border/60 bg-card/30 backdrop-blur">
      <div className="space-y-4 border-b border-border/60 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">AI Knowledge Assistant</p>
            <p className="text-xs text-muted-foreground">Chat, search, and synthesize</p>
          </div>
        </div>

        <Button className="w-full justify-start gap-2 rounded-2xl" onClick={onCreateConversation}>
          <MessageSquarePlus className="h-4 w-4" />
          New chat
        </Button>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="rounded-2xl pl-9" placeholder="Search conversations" />
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {conversations.map((conversation) => {
          const active =
            conversation.id === activeConversationId ||
            conversation.title === activeConversationTitle;

          return (
            <button
              key={conversation.id}
              className={cn(
                "w-full rounded-3xl border p-4 text-left transition",
                active
                  ? "border-primary/40 bg-primary/10 shadow-lg shadow-primary/5"
                  : "border-transparent bg-transparent hover:border-border/60 hover:bg-secondary/60"
              )}
              onClick={() => onSelectConversation(conversation.id)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="line-clamp-1 text-sm font-medium">{conversation.title}</p>
                <span className="text-[11px] text-muted-foreground">{conversation.updatedAt}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {conversation.summary}
              </p>
            </button>
          );
        })}
      </div>

      <div className="border-t border-border/60 p-5">
        <div className="rounded-3xl bg-secondary/70 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock3 className="h-4 w-4 text-primary" />
            Context memory
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Conversation history is ready to connect to persistent backend storage.
          </p>
        </div>
      </div>
    </aside>
  );
}
