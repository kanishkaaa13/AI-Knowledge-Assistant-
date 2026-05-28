"use client";

import * as React from "react";
import { ArrowUp, Mic, Paperclip, Sparkles, StopCircle, Loader2 } from "lucide-react";

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
      <div className="rounded-2xl border border-border/40 bg-[#1a1a1a] p-3 shadow-xl">
        <Textarea
          className="min-h-[80px] resize-none border-0 bg-transparent p-3 text-white shadow-none focus-visible:ring-0 placeholder:text-muted-foreground"
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

        <div className="flex flex-col gap-3 border-t border-border/40 px-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-2 rounded-xl bg-black/40 px-3 py-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            {streamResponses
              ? "Streaming responses enabled"
              : "Streaming disabled for instant replies"}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" className="rounded-xl px-3 h-10 w-10 bg-[#2a2a2a] hover:bg-[#333333] border-0" variant="secondary" title="Attach Document (Uses global selection)">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button type="button" className="rounded-xl px-4 h-10 bg-[#2a2a2a] hover:bg-[#333333] border-0" variant="secondary" onClick={toggleVoiceInput}>
              {isRecording ? <StopCircle className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
              {isRecording ? "Stop" : "Voice"}
            </Button>
            <Button
              className="rounded-xl px-5 h-10 bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={!input.trim() || isSending}
              size="lg"
              type="submit"
            >
              {isSending ? (
                <>
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Thinking...</span>
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
