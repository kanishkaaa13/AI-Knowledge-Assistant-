"use client";

import * as React from "react";
import { useTheme } from "next-themes";

import type { AssistantSettings } from "@/types/chat";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const models = ["GPT-4.1 mini", "GPT-4.1", "Claude Sonnet", "Perplexity-style Search"];
const themes: AssistantSettings["theme"][] = ["light", "dark", "system"];

export function SettingsModal({
  onOpenChange,
  onSave,
  open,
  settings
}: {
  onOpenChange: (open: boolean) => void;
  onSave: (settings: AssistantSettings) => void;
  open: boolean;
  settings: AssistantSettings;
}) {
  const [draft, setDraft] = React.useState(settings);
  const { setTheme } = useTheme();

  React.useEffect(() => {
    setDraft(settings);
  }, [settings]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Workspace settings</DialogTitle>
          <DialogDescription>
            Tune the behavior and appearance of your personal AI assistant.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          <section className="space-y-3">
            <Label>Theme preference</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {themes.map((theme) => (
                <button
                  key={theme}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm capitalize transition ${
                    draft.theme === theme
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/60 hover:bg-secondary"
                  }`}
                  onClick={() => setDraft((current) => ({ ...current, theme }))}
                  type="button"
                >
                  {theme}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <Label>Preferred model</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {models.map((model) => (
                <button
                  key={model}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    draft.model === model
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/60 hover:bg-secondary"
                  }`}
                  onClick={() => setDraft((current) => ({ ...current, model }))}
                  type="button"
                >
                  {model}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <Label>Response mode</Label>
            <div className="grid gap-3">
              <button
                className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                  draft.streamResponses ? "border-primary bg-primary/10" : "border-border/60"
                }`}
                onClick={() =>
                  setDraft((current) => ({ ...current, streamResponses: !current.streamResponses }))
                }
                type="button"
              >
                <p className="font-medium">Streaming responses</p>
                <p className="mt-1 text-muted-foreground">
                  Reveal assistant output progressively for a live chat feel.
                </p>
              </button>
              <button
                className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                  draft.webSearch ? "border-primary bg-primary/10" : "border-border/60"
                }`}
                onClick={() => setDraft((current) => ({ ...current, webSearch: !current.webSearch }))}
                type="button"
              >
                <p className="font-medium">Web-assisted answers</p>
                <p className="mt-1 text-muted-foreground">
                  Reserve space for retrieval or web grounding in future backend phases.
                </p>
              </button>
            </div>
          </section>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setTheme(draft.theme);
              onSave(draft);
              onOpenChange(false);
            }}
          >
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
