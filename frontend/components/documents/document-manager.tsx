"use client";

import * as React from "react";
import { PanelRightOpen } from "lucide-react";

import { DocumentsModal } from "@/components/documents/documents-modal";
import { DocumentSidebarPanel } from "@/components/documents/document-sidebar-panel";
import { Button } from "@/components/ui/button";
import { useDocuments } from "@/hooks/use-documents";

export function DocumentManager() {
  const [open, setOpen] = React.useState(false);
  const documentsQuery = useDocuments();

  return (
    <>
      <div className="hidden 2xl:flex 2xl:w-[360px] 2xl:flex-col 2xl:border-l 2xl:border-border/60 2xl:bg-card/30">
        <DocumentSidebarPanel
          documents={documentsQuery.data ?? []}
          isLoading={documentsQuery.isLoading}
        />
      </div>

      <div className="fixed bottom-5 right-5 z-30 2xl:hidden">
        <Button className="rounded-full px-5 shadow-xl" onClick={() => setOpen(true)}>
          <PanelRightOpen className="mr-2 h-4 w-4" />
          Documents
        </Button>
      </div>

      <DocumentsModal open={open} onOpenChange={setOpen} />
    </>
  );
}
