"use client";

import * as React from "react";
import { Eye, FileText, Trash2, UploadCloud } from "lucide-react";

import type { UploadedDocument } from "@/types/api";

import { DocumentPreviewModal } from "@/components/documents/document-preview-modal";
import { DropzoneUploader } from "@/components/documents/dropzone-uploader";
import { Button } from "@/components/ui/button";
import { useDeleteDocument } from "@/hooks/use-documents";

function formatBytes(bytes: number | null) {
  if (!bytes) {
    return "Unknown size";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentSidebarPanel({
  documents,
  isLoading
}: {
  documents: UploadedDocument[];
  isLoading: boolean;
}) {
  const [previewId, setPreviewId] = React.useState<string | null>(null);
  const deleteMutation = useDeleteDocument();

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b border-border/60 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Document uploads</p>
              <p className="text-xs text-muted-foreground">PDF, DOCX, TXT, Markdown</p>
            </div>
          </div>
          <div className="mt-4">
            <DropzoneUploader />
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-3xl border border-border/60 p-4">
                <div className="h-4 w-2/3 animate-pulse rounded-full bg-secondary" />
                <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-secondary" />
                <div className="mt-2 h-3 w-1/2 animate-pulse rounded-full bg-secondary" />
              </div>
            ))
          ) : documents.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/60 p-6 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-4 font-medium">No documents uploaded yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Drag files here or use the uploader to build your knowledge base.
              </p>
            </div>
          ) : (
            documents.map((document) => (
              <article key={document.id} className="rounded-3xl border border-border/60 bg-card/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="line-clamp-1 text-sm font-medium">{document.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {document.file_extension.replace(".", "")}
                    </p>
                  </div>
                  <div className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">
                    {document.status}
                  </div>
                </div>

                <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                  {document.preview_text ?? "Preview will appear after extraction."}
                </p>

                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatBytes(document.file_size)}</span>
                  <span>{document.word_count ?? 0} words</span>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setPreviewId(document.id)}>
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void deleteMutation.mutateAsync(document.id);
                    }}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      <DocumentPreviewModal
        documentId={previewId}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewId(null);
          }
        }}
        open={Boolean(previewId)}
      />
    </>
  );
}
