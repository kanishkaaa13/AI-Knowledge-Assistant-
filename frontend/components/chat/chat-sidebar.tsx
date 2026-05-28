"use client";

import * as React from "react";
import {
  Clock3,
  Download,
  Edit3,
  Heart,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Trash2
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import type { ConversationGroup, ConversationPreview } from "@/types/chat";

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

function ConversationItem({
  conversation,
  active,
  onSelect,
  onFavorite,
  onRename,
  onExport,
  onDelete
}: {
  conversation: ConversationPreview;
  active: boolean;
  onSelect: () => void;
  onFavorite: () => void;
  onRename: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group rounded-xl border-l-4 transition-all duration-150 p-3",
        active
          ? "border-indigo-500 bg-[#1a1a1a] shadow-md"
          : "border-transparent bg-transparent hover:bg-[#1a1a1a]"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          className="min-w-0 flex-1 text-left"
          onClick={onSelect}
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
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onFavorite}>
              <Heart
                className={cn(
                  "mr-2 h-4 w-4",
                  conversation.isFavorite ? "fill-current text-rose-500" : ""
                )}
              />
              {conversation.isFavorite ? "Unfavorite" : "Favorite"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRename}>
              <Edit3 className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function ChatSidebar({
  activeConversationId,
  groupedConversations,
  historySearch,
  isLoading,
  onCreateConversation,
  onDeleteConversation,
  onExportConversation,
  onFavoriteConversation,
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
  onExportConversation: (conversationId: string) => Promise<void>;
  onFavoriteConversation: (conversationId: string, favorite: boolean) => Promise<void>;
  onHistorySearchChange: (value: string) => void;
  onRenameConversation: (conversationId: string, title: string) => Promise<void>;
  onSelectConversation: (conversationId: string) => void;
  onOpenSettings?: () => void;
}) {
  const [renameTarget, setRenameTarget] = React.useState<{
    id: string;
    title: string;
  } | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [isMounted, setIsMounted] = React.useState(false);
  const { user } = useAuth();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Client-side search filter on top of whatever groupedConversations provides
  const searchLower = historySearch.toLowerCase().trim();
  const filteredGroups: ConversationGroup[] = React.useMemo(() => {
    if (!searchLower) return groupedConversations;
    return groupedConversations
      .map((group) => ({
        ...group,
        conversations: group.conversations.filter(
          (c) =>
            c.title.toLowerCase().includes(searchLower) ||
            (c.lastMessagePreview ?? "").toLowerCase().includes(searchLower) ||
            (c.summary ?? "").toLowerCase().includes(searchLower)
        )
      }))
      .filter((group) => group.conversations.length > 0);
  }, [groupedConversations, searchLower]);

  const totalConversations = filteredGroups.reduce(
    (sum, g) => sum + g.conversations.length,
    0
  );
  const hasConversations = totalConversations > 0;

  async function handleRenameSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;
    await onRenameConversation(renameTarget.id, renameValue.trim());
    setRenameTarget(null);
    setRenameValue("");
  }

  return (
    <>
      {/* Sidebar — h-full fills the flex parent (h-screen on chat-shell root) */}
      <aside className="flex h-full w-[300px] flex-col border-r border-border/40 bg-[#0f0f0f] xl:w-[320px]">
        {/* Header — fixed height */}
        <div className="flex-shrink-0 space-y-4 p-5">
          <Button
            className="w-full justify-start gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 border-0"
            onClick={onCreateConversation}
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="rounded-2xl pl-9"
              onChange={(e) => onHistorySearchChange(e.target.value)}
              placeholder="Search conversations"
              value={historySearch}
            />
          </div>
        </div>

        {/* Scrollable conversation list — takes all remaining height */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-xl bg-[#1a1a1a]"
                />
              ))}
            </div>
          ) : !hasConversations ? (
            <div className="rounded-xl border border-dashed border-border/40 bg-[#1a1a1a]/50 p-5 text-sm text-muted-foreground">
              {isMounted ? (historySearch
                ? `No conversations match "${historySearch}".`
                : "No saved conversations yet. Start a new grounded chat and it will appear here.") : null}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGroups.map((group) => (
                <div key={group.label}>
                  <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="space-y-2">
                    {group.conversations.map((conversation) => (
                      <ConversationItem
                        key={conversation.id}
                        active={conversation.id === activeConversationId}
                        conversation={conversation}
                        onDelete={() => void onDeleteConversation(conversation.id)}
                        onExport={() => void onExportConversation(conversation.id)}
                        onFavorite={() =>
                          void onFavoriteConversation(conversation.id, !conversation.isFavorite)
                        }
                        onRename={() => {
                          setRenameTarget({ id: conversation.id, title: conversation.title });
                          setRenameValue(conversation.title);
                        }}
                        onSelect={() => onSelectConversation(conversation.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer — fixed height */}
        <div className="flex-shrink-0 border-t border-border/40 p-4 bg-[#0f0f0f]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 rounded-lg border border-border/40">
                <AvatarFallback className="rounded-lg bg-indigo-600/20 text-indigo-500">
                  {user?.name?.charAt(0).toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-none">{user?.name ?? "User"}</span>
                <span className="text-xs text-muted-foreground mt-1 truncate max-w-[140px]">
                  {user?.email ?? ""}
                </span>
              </div>
            </div>
            {onOpenSettings && (
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-[#1a1a1a]" onClick={onOpenSettings}>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </aside>

      <Dialog
        open={Boolean(renameTarget)}
        onOpenChange={(open) => !open && setRenameTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => void handleRenameSubmit(e)}>
            <Input
              autoFocus
              onChange={(e) => setRenameValue(e.target.value)}
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
