"use client";

import * as React from "react";
import { ArrowUp, Mic, Sparkles, StopCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

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
  const [isRecording, setIsRecording] = React.useState(false);
  const recognitionRef = React.useRef<any>(null);

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

  function toggleVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop?.();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript ?? "")
        .join(" ");
      onInputChange(transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }

  return (
    <form className="mx-auto w-full max-w-4xl" onSubmit={handleSubmit}>
      <div className="rounded-2xl border border-border/60 bg-card/90 p-3 shadow-xl shadow-slate-950/5">
        <Textarea
          className="min-h-[80px] resize-none border-0 bg-transparent p-3 shadow-none focus-visible:ring-0"
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

          <div className="flex items-center gap-2">
            <Button type="button" className="rounded-2xl px-4" variant="secondary" onClick={toggleVoiceInput}>
              {isRecording ? <StopCircle className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
              {isRecording ? "Stop" : "Voice"}
            </Button>
            <Button
              className="rounded-2xl px-5"
              disabled={!input.trim() || isSending}
              size="lg"
              type="submit"
            >
              {isSending ? (
                <>
                  <span className="flex items-center gap-1">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: '150ms' }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: '300ms' }} />
                    </span>
                    <span className="ml-2">Assistant is thinking...</span>
                  </span>
                </>
              ) : (
                <>
                  Send
                  <ArrowUp className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
