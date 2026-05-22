"use client";

import * as React from "react";
import { BookOpenText, Download, Lightbulb, SearchCode, Sparkles } from "lucide-react";

import type { AssistantQuizItem, SemanticDocumentSearchItem } from "@/types/api";

import { Button } from "@/components/ui/button";

export function AssistantToolsPanel({
  generatedSummary,
  isWorking,
  quiz,
  searchResults,
  selectedDocumentIds,
  suggestedPrompts,
  onExportConversation,
  onGenerateQuiz,
  onGenerateSummary,
  onRunSemanticSearch,
  onUsePrompt
}: {
  generatedSummary: string | null;
  isWorking: boolean;
  quiz: AssistantQuizItem[];
  searchResults: SemanticDocumentSearchItem[];
  selectedDocumentIds: string[];
  suggestedPrompts: string[];
  onExportConversation: () => Promise<void>;
  onGenerateQuiz: () => Promise<void>;
  onGenerateSummary: () => Promise<void>;
  onRunSemanticSearch: () => Promise<void>;
  onUsePrompt: (prompt: string) => void;
}) {
  return (
    <aside className="hidden w-[340px] shrink-0 border-l border-border/60 bg-card/30 xl:flex xl:flex-col">
      <div className="space-y-5 overflow-y-auto p-5">
        <section className="rounded-3xl border border-border/60 bg-card/70 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            Assistant tools
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {selectedDocumentIds.length > 0
              ? `Using ${selectedDocumentIds.length} selected document${selectedDocumentIds.length > 1 ? "s" : ""}.`
              : "No document filter selected. The assistant will search your full knowledge base."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={isWorking} onClick={() => void onGenerateSummary()}>
              Summarize
            </Button>
            <Button size="sm" variant="secondary" disabled={isWorking} onClick={() => void onGenerateQuiz()}>
              Quiz
            </Button>
            <Button size="sm" variant="secondary" disabled={isWorking} onClick={() => void onRunSemanticSearch()}>
              Search docs
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void onExportConversation()}>
              <Download className="mr-1 h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </section>

        <section className="rounded-3xl border border-border/60 bg-card/70 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Lightbulb className="h-4 w-4 text-primary" />
            Suggested prompts
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestedPrompts.length > 0 ? (
              suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  className="rounded-full bg-secondary px-3 py-2 text-left text-xs text-muted-foreground transition hover:bg-secondary/80 hover:text-foreground"
                  onClick={() => onUsePrompt(prompt)}
                  type="button"
                >
                  {prompt}
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Suggested prompts will appear here.</p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-border/60 bg-card/70 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BookOpenText className="h-4 w-4 text-primary" />
            AI summary
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
            {generatedSummary ?? "Generate a summary from your selected documents or current query."}
          </p>
        </section>

        <section className="rounded-3xl border border-border/60 bg-card/70 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <SearchCode className="h-4 w-4 text-primary" />
            Semantic results
          </div>
          <div className="mt-3 space-y-3">
            {searchResults.length > 0 ? (
              searchResults.map((item) => (
                <div key={item.document_id} className="rounded-2xl bg-secondary/50 p-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.filename}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.excerpt}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Run semantic document search to inspect top matches.</p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-border/60 bg-card/70 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BookOpenText className="h-4 w-4 text-primary" />
            Quiz
          </div>
          <div className="mt-3 space-y-3">
            {quiz.length > 0 ? (
              quiz.map((item, index) => (
                <div key={`${item.question}-${index}`} className="rounded-2xl bg-secondary/50 p-3">
                  <p className="text-sm font-medium">{item.question}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {item.difficulty}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Generate a quiz from your knowledge base.</p>
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}
