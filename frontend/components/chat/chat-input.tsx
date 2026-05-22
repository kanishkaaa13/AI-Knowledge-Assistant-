"use client";

import * as React from "react";
import { ArrowUp, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ChatInput({
  input,
  onInputChange,
  onSendMessage,
  streamResponses
}: {
  input: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => Promise<void>;
  streamResponses: boolean;
}) {
  const [isSending, setIsSending] = React.useState(false);

  async function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    if (!input.trim() || isSending) {
      return;
    }

    setIsSending(true);
    try {
      await onSendMessage();
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="border-t border-border/60 bg-background/90 px-4 py-4 backdrop-blur-xl sm:px-6">
      <form className="mx-auto w-full max-w-4xl" onSubmit={handleSubmit}>
        <div className="rounded-[2rem] border border-border/60 bg-card/90 p-3 shadow-xl shadow-slate-950/5">
          <Textarea
            className="min-h-[120px] resize-none border-0 bg-transparent p-3 shadow-none focus-visible:ring-0"
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder="Message your knowledge assistant..."
            value={input}
          />

          <div className="flex flex-col gap-3 border-t border-border/60 px-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {streamResponses
                ? "Streaming responses enabled"
                : "Streaming disabled for instant replies"}
            </div>

            <Button
              className="rounded-2xl px-5"
              disabled={!input.trim() || isSending}
              size="lg"
              type="submit"
            >
              {isSending ? "Thinking..." : "Send"}
              <ArrowUp className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
