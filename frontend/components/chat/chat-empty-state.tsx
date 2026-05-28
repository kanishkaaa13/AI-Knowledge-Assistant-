import { Sparkles } from "lucide-react";

const prompts = [
  "Summarize my resume",
  "What are my skills?",
  "Export key points"
];

export function ChatEmptyState({ onUsePrompt }: { onUsePrompt?: (prompt: string) => void }) {
  return (
    <div className="flex h-full flex-1 items-center justify-center px-4 py-10 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500 shadow-lg shadow-indigo-500/5">
          <Sparkles className="h-8 w-8" />
        </div>
        <h2 className="mb-8 text-2xl font-medium tracking-tight text-[#f1f1f1] sm:text-3xl">
          Ask anything about your documents
        </h2>

        <div className="flex flex-wrap justify-center gap-3">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onUsePrompt?.(prompt)}
              className="rounded-full border border-[#2d2d2d] bg-[#1a1a1a] px-5 py-2.5 text-sm text-[#f1f1f1] transition-colors hover:border-[#6366f1] hover:bg-[#6366f1]/10"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
