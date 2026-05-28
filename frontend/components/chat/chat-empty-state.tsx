import { BrainCircuit, Compass, FileSearch, Sparkles } from "lucide-react";

const prompts = [
  {
    icon: Sparkles,
    title: "Draft a strategic summary",
    description: "Summarize uploaded notes into a launch-ready assistant brief."
  },
  {
    icon: FileSearch,
    title: "Compare documents",
    description: "Pull differences across research docs and produce a concise answer."
  },
  {
    icon: Compass,
    title: "Plan next steps",
    description: "Turn open questions into a practical roadmap with priorities."
  }
];

export function ChatEmptyState() {
  return (
    <div className="flex h-full flex-1 items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-2xl space-y-8 flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 mb-4 shadow-lg shadow-indigo-500/5">
          <BrainCircuit className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Ask me anything from your documents
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Select a document from the right panel and start a conversation.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mt-4">
          {prompts.map((prompt) => (
            <button
              key={prompt.title}
              type="button"
              className="flex items-center gap-2 rounded-xl border border-border/40 bg-[#1a1a1a] px-4 py-2.5 text-sm transition-colors hover:bg-[#2a2a2a] hover:border-border/60"
            >
              <prompt.icon className="h-4 w-4 text-indigo-400" />
              <span>{prompt.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
