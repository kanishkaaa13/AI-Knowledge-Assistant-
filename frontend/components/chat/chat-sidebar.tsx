"use client";

import * as React from "react";
import {
  Clock3,
  Edit3,
  MessageSquarePlus,
  MoreHorizontal,
  Search,
  Sparkles,
  Trash2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ConversationGroup } from "@/types/chat";

function formatRelativeTime(timestamp: string) {
  const date = new Date(timestamp);
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  return formatter.format(Math.round(diffHours / 24), "day");
}

export function ChatSidebar({
  activeConversationId,
  groupedConversations,
  historySearch,
  isLoading,
  onCreateConversation,
  onDeleteConversation,
  onHistorySearchChange,
  onRenameConversation,
  onSelectConversation
}: {
  activeConversationId?: string;
  groupedConversations: ConversationGroup[];
  historySearch: string;
  isLoading: boolean;
  onCreateConversation: () => void;
  onDeleteConversation: (conversationId: string) => Promise<void>;
  onHistorySearchChange: (value: string) => void;
  onRenameConversation: (conversationId: string, title: string) => Promise<void>;
  onSelectConversation: (conversationId: string) => void;
}) {
  const [renameTarget, setRenameTarget] = React.useState<{
    id: string;
    title: string;
  } | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const hasConversations = groupedConversations.some((group) => group.conversations.length > 0);

  async function handleRenameSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!renameTarget || !renameValue.trim()) {
      return;
    }

    await onRenameConversation(renameTarget.id, renameValue.trim());
    setRenameTarget(null);
    setRenameValue("");
  }

  return (
    <>
      <aside className="flex h-screen w-[320px] flex-col border-r border-border/60 bg-card/30 backdrop-blur">
        <div className="space-y-4 border-b border-border/60 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">AI Knowledge Assistant</p>
              <p className="text-xs text-muted-foreground">Persistent conversation memory</p>
            </div>
          </div>

          <Button className="w-full justify-start gap-2 rounded-2xl" onClick={onCreateConversation}>
            <MessageSquarePlus className="h-4 w-4" />
            New chat
          </Button>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="rounded-2xl pl-9"
              onChange={(event) => onHistorySearchChange(event.target.value)}
              placeholder="Search conversations"
              value={historySearch}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-3xl border border-border/50 bg-secondary/40"
                />
              ))}
            </div>
          ) : null}

          {!isLoading && !hasConversations ? (
            <div className="rounded-3xl border border-dashed border-border/60 bg-secondary/30 p-5 text-sm text-muted-foreground">
              No saved conversations yet. Start a new grounded chat and it will appear here.
            </div>
          ) : null}

          {!isLoading ? (
            <div className="space-y-5">
              {groupedConversations.map((group) => (
                <section key={group.label} className="space-y-2">
                  <p className="px-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {group.label}
                  </p>

                  <div className="space-y-2">
                    {group.conversations.map((conversation) => {
                      const active = conversation.id === activeConversationId;

                      return (
                        <div
                          key={conversation.id}
                          className={cn(
                            "group rounded-3xl border p-4 transition",
                            active
                              ? "border-primary/40 bg-primary/10 shadow-lg shadow-primary/5"
                              : "border-transparent bg-transparent hover:border-border/60 hover:bg-secondary/60"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              className="min-w-0 flex-1 text-left"
                              onClick={() => onSelectConversation(conversation.id)}
                              type="button"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="line-clamp-1 text-sm font-medium">{conversation.title}</p>
                                <span className="shrink-0 text-[11px] text-muted-foreground">
                                  {formatRelativeTime(conversation.updatedAt)}
                                </span>
                              </div>
                              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                                {conversation.lastMessagePreview ??
                                  conversation.summary ??
                                  "Open this conversation to continue chatting."}
                              </p>
                            </button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  className="mt-1 h-8 w-8 rounded-full opacity-0 transition group-hover:opacity-100"
                                  size="icon"
                                  variant="ghost"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setRenameTarget({
                                      id: conversation.id,
                                      title: conversation.title
                                    });
                                    setRenameValue(conversation.title);
                                  }}
                                >
                                  <Edit3 className="mr-2 h-4 w-4" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void onDeleteConversation(conversation.id);
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : null}
        </div>

        <div className="border-t border-border/60 p-5">
          <div className="rounded-3xl bg-secondary/70 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock3 className="h-4 w-4 text-primary" />
              Searchable memory
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Reopen past chats, rename them, and keep your knowledge conversations organized.
            </p>
          </div>
        </div>
      </aside>

      <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => void handleRenameSubmit(event)}>
            <Input
              autoFocus
              onChange={(event) => setRenameValue(event.target.value)}
              placeholder="Conversation title"
              value={renameValue}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setRenameTarget(null)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
