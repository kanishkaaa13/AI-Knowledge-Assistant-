"use client";

import { DocumentSidebarPanel } from "@/components/documents/document-sidebar-panel";
import { useDocuments } from "@/hooks/use-documents";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function DocumentsModal({
  onOpenChange,
  open
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const documentsQuery = useDocuments();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[90vh] max-w-2xl p-0">
        <DocumentSidebarPanel
          documents={documentsQuery.data ?? []}
          isLoading={documentsQuery.isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
