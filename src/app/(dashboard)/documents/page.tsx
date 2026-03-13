"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  AlertCircle,
  FolderOpen,
  ChevronRight,
  Brain,
  FileSearch,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatFileSize } from "@/lib/utils";
import type { DocumentStatus } from "@/types/document";

interface DocumentItem {
  id: string;
  filename: string;
  fileSize: number;
  pageCount: number | null;
  status: DocumentStatus;
  errorMessage: string | null;
  createdAt: string;
  conceptCount?: number;
}

const statusConfig: Record<
  DocumentStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" | "success"; animate?: boolean }
> = {
  uploaded: { label: "Hochgeladen", variant: "secondary" },
  parsing: { label: "Wird analysiert...", variant: "outline", animate: true },
  chunking: { label: "Wird aufgeteilt...", variant: "outline", animate: true },
  embedding: { label: "Wird eingebettet...", variant: "outline", animate: true },
  analyzing: { label: "Konzepte werden extrahiert...", variant: "outline", animate: true },
  ready: { label: "Bereit", variant: "success" },
  error: { label: "Fehler", variant: "destructive" },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error("Fehler beim Laden der Dokumente");
      const data = await res.json();
      const rawDocs = data.documents ?? data ?? [];
      setDocuments(
        rawDocs.map((d: Record<string, unknown>) => ({
          id: d.id as string,
          filename: d.filename as string,
          fileSize: (d.file_size ?? d.fileSize) as number,
          pageCount: (d.page_count ?? d.pageCount ?? null) as number | null,
          status: d.status as DocumentStatus,
          errorMessage: (d.error_message ?? d.errorMessage ?? null) as string | null,
          createdAt: (d.created_at ?? d.createdAt) as string,
          conceptCount: (d.concept_count ?? d.conceptCount) as number | undefined,
        }))
      );
    } catch {
      toast.error("Dokumente konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Poll for processing documents
  useEffect(() => {
    const hasProcessing = documents.some(
      (d) => !["ready", "error", "uploaded"].includes(d.status)
    );
    if (!hasProcessing) return;

    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);

    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Fehler beim Löschen");
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast.success("Dokument gelöscht");
    } catch {
      toast.error("Dokument konnte nicht gelöscht werden.");
    } finally {
      setDeletingId(null);
    }
  }

  const isProcessing = (status: DocumentStatus) =>
    ["parsing", "chunking", "embedding", "analyzing"].includes(status);

  return (
    <>
      <Header title="Dokumente" subtitle="Deine hochgeladenen Unterlagen" />

      <div className="px-6 py-8">
        {/* Action bar */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-ink">
              Alle Dokumente
            </h2>
            {!loading && documents.length > 0 && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {documents.length} Dokument{documents.length !== 1 ? "e" : ""}
              </p>
            )}
          </div>
          <Button asChild>
            <Link href="/upload">
              <Upload className="h-4 w-4" />
              Hochladen
            </Link>
          </Button>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="mt-6 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-xl border border-border bg-surface p-5"
              >
                <Skeleton className="h-11 w-11 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && documents.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface-raised py-20 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FolderOpen
                className="h-8 w-8 text-ink-muted"
                strokeWidth={1.5}
              />
            </div>
            <h3 className="mt-5 font-serif text-lg font-semibold text-ink">
              Noch keine Dokumente
            </h3>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              Lade deine Vorlesungsskripte, Folien oder andere
              Prüfungsunterlagen hoch, um loszulegen.
            </p>
            <Button asChild className="mt-6">
              <Link href="/upload">
                <Upload className="h-4 w-4" />
                Erste Unterlagen hochladen
              </Link>
            </Button>
          </motion.div>
        )}

        {/* Document cards */}
        {!loading && documents.length > 0 && (
          <motion.div
            initial="hidden"
            animate="visible"
            className="mt-6 space-y-3"
          >
            <AnimatePresence mode="popLayout">
              {documents.map((doc, i) => {
                const status = statusConfig[doc.status];
                const processing = isProcessing(doc.status);

                return (
                  <motion.div
                    key={doc.id}
                    custom={i}
                    variants={fadeInUp}
                    layout
                    exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                  >
                    <Link
                      href={
                        doc.status === "ready"
                          ? `/documents/${doc.id}`
                          : "#"
                      }
                      className={cn(
                        "group flex items-center gap-4 rounded-xl border border-border bg-surface p-5 transition-all",
                        doc.status === "ready" &&
                          "cursor-pointer hover:border-accent/30 hover:shadow-sm",
                        doc.status !== "ready" && "cursor-default"
                      )}
                      onClick={(e) => {
                        if (doc.status !== "ready") e.preventDefault();
                      }}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
                          doc.status === "error"
                            ? "bg-incorrect-light"
                            : processing
                            ? "bg-partial-light"
                            : doc.status === "ready"
                            ? "bg-accent-light"
                            : "bg-muted"
                        )}
                      >
                        {doc.status === "error" ? (
                          <AlertCircle
                            className="h-5 w-5 text-incorrect"
                            strokeWidth={1.8}
                          />
                        ) : processing ? (
                          <Loader2
                            className="h-5 w-5 animate-spin text-partial"
                            strokeWidth={1.8}
                          />
                        ) : doc.status === "ready" ? (
                          <FileSearch
                            className="h-5 w-5 text-accent"
                            strokeWidth={1.8}
                          />
                        ) : (
                          <FileText
                            className="h-5 w-5 text-ink-muted"
                            strokeWidth={1.8}
                          />
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">
                          {doc.filename}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span>{formatFileSize(doc.fileSize)}</span>
                          {doc.pageCount && (
                            <span>{doc.pageCount} Seiten</span>
                          )}
                          <span>{formatDate(doc.createdAt)}</span>
                          {doc.status === "ready" && doc.conceptCount != null && doc.conceptCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-accent">
                              <Brain className="h-3 w-3" />
                              {doc.conceptCount} Konzepte
                            </span>
                          )}
                        </div>
                        {doc.status === "error" && doc.errorMessage && (
                          <p className="mt-1 text-xs text-incorrect">
                            {doc.errorMessage}
                          </p>
                        )}
                      </div>

                      {/* Status badge */}
                      <Badge
                        variant={status.variant}
                        className={cn(
                          "shrink-0",
                          status.animate && "animate-pulse"
                        )}
                      >
                        {status.label}
                      </Badge>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-2">
                        {doc.status === "ready" && (
                          <ChevronRight className="h-4 w-4 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100" />
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, doc.id)}
                          disabled={deletingId === doc.id}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-incorrect-light hover:text-incorrect disabled:opacity-50"
                          aria-label="Dokument löschen"
                          title="Löschen"
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </>
  );
}
