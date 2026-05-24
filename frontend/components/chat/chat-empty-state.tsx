import { Compass, FileSearch, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary">
            Ready when you are
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Ask anything about your private knowledge base.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Start a new conversation to summarize research, explore documents, or draft
            a response with citations and code-aware formatting.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {prompts.map((prompt) => (
            <Card key={prompt.title} className="rounded-[2rem] border-border/60 bg-card/80">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <prompt.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl">{prompt.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{prompt.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
