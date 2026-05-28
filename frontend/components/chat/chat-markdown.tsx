"use client";

import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ChatMarkdown({
  content,
  invert = false,
  isStreaming = false
}: {
  content: string;
  invert?: boolean;
  isStreaming?: boolean;
}) {
  async function copyCodeBlock(code: string) {
    await navigator.clipboard.writeText(code);
    toast.success("Code copied");
  }

  return (
    <div
      className={cn(
        "chat-markdown text-sm leading-7",
        invert ? "text-primary-foreground" : "text-foreground"
      )}
    >
      <ReactMarkdown
        rehypePlugins={[rehypeHighlight]}
        components={{
          pre(props) {
            const child = props.children as any;
            const codeText =
              child &&
              typeof child === "object" &&
              "props" in child &&
              child.props &&
              typeof child.props.children === "string"
                ? child.props.children
                : "";

            return (
              <div className="relative my-5 overflow-hidden rounded-3xl border border-border/60 bg-slate-950 text-slate-100">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-400">
                  <span>Code</span>
                  <Button
                    className="h-8 rounded-full bg-white/5 px-3 text-slate-100 hover:bg-white/10"
                    size="sm"
                    variant="ghost"
                    onClick={() => void copyCodeBlock(codeText)}
                  >
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    Copy
                  </Button>
                </div>
                <pre {...props} className="overflow-x-auto p-4 text-sm" />
              </div>
            );
          },
          code(props) {
            const { inline, className, children, ...rest } = props as {
              inline?: boolean;
              className?: string;
              children?: ReactNode;
            };

            if (inline) {
              return (
                <code
                  className={cn(
                    "rounded-lg px-1.5 py-0.5 text-[0.92em]",
                    invert ? "bg-white/15 text-primary-foreground" : "bg-secondary"
                  )}
                  {...rest}
                >
                  {children}
                </code>
              );
            }

            return (
              <code className={cn(className, "font-mono text-[0.92em]")} {...rest}>
                {children}
              </code>
            );
          },
          a(props) {
            return (
              <a
                {...props}
                className="font-medium text-primary underline underline-offset-4"
                rel="noreferrer"
                target="_blank"
              />
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>

      {isStreaming ? (
        <div
          className={cn(
            "mt-3 inline-flex items-center gap-2 text-xs",
            invert ? "text-primary-foreground/80" : "text-muted-foreground"
          )}
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
          Generating response
        </div>
      ) : null}
    </div>
  );
}
