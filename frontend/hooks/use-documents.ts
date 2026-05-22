"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  deleteDocument,
  getDocumentPreview,
  listDocuments,
  uploadDocument
} from "@/lib/api";

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: listDocuments
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      title,
      onProgress
    }: {
      file: File;
      title: string;
      onProgress?: (progress: number) => void;
    }) => uploadDocument(file, title, onProgress),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document uploaded successfully.");
    },
    onError(error: any) {
      toast.error(error?.response?.data?.detail ?? "Upload failed.");
    }
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDocument,
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted.");
    },
    onError(error: any) {
      toast.error(error?.response?.data?.detail ?? "Unable to delete document.");
    }
  });
}

export function useDocumentPreview(documentId?: string) {
  return useQuery({
    queryKey: ["document-preview", documentId],
    queryFn: () => getDocumentPreview(documentId as string),
    enabled: Boolean(documentId)
  });
}
