"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Brain,
  FileText,
  GraduationCap,
  Loader2,
  AlertCircle,
  Calculator,
  BookOpen,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatFileSize } from "@/lib/utils";
import type { DocumentStatus, DocumentConcept } from "@/types/document";

interface DocumentDetail {
  id: string;
  filename: string;
  fileSize: number;
  pageCount: number | null;
  status: DocumentStatus;
  errorMessage: string | null;
  createdAt: string;
}

interface ProcessingProgress {
  stepName: string;
  stepStatus: string;
  stepDetails: Record<string, unknown>;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

export default function DocumentDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [concepts, setConcepts] = useState<DocumentConcept[]>([]);
  const [progress, setProgress] = useState<ProcessingProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (!res.ok) throw new Error("Fehler beim Laden");
      const data = await res.json();

      // Map snake_case DB fields to camelCase
      const doc = data.document ?? data;
      setDocument({
        id: doc.id,
        filename: doc.filename,
        fileSize: doc.file_size ?? doc.fileSize,
        pageCount: doc.page_count ?? doc.pageCount,
        status: doc.status,
        errorMessage: doc.error_message ?? doc.errorMessage,
        createdAt: doc.created_at ?? doc.createdAt,
      });

      // Map concepts from snake_case
      const rawConcepts = data.concepts ?? [];
      setConcepts(
        rawConcepts.map((c: Record<string, unknown>) => ({
          id: c.id as string,
          documentId: (c.document_id ?? c.documentId) as string,
          name: c.name as string,
          description: (c.description ?? null) as string | null,
          importanceScore: (c.importance_score ?? c.importanceScore) as number,
          pageReferences: (c.page_references ?? c.pageReferences ?? []) as number[],
          parentConceptId: null,
          hasFormulas: (c.metadata as Record<string, unknown>)?.hasFormulas ?? false,
          hasCaseExamples: (c.metadata as Record<string, unknown>)?.hasCaseExamples ?? false,
        }))
      );

      // Map progress from snake_case
      const rawProgress = data.progress ?? [];
      setProgress(
        rawProgress.map((p: Record<string, unknown>) => ({
          stepName: (p.step_name ?? p.stepName) as string,
          stepStatus: (p.step_status ?? p.stepStatus) as string,
          stepDetails: (p.step_details ?? p.stepDetails ?? {}) as Record<string, unknown>,
        }))
      );
    } catch {
      toast.error("Dokument konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll while processing
  useEffect(() => {
    if (!document) return;
    const isProcessing = !["ready", "error", "uploaded"].includes(
      document.status
    );
    if (!isProcessing) return;

    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [document, fetchData]);

  if (loading) {
    return (
      <>
        <Header title="Dokument" />
        <div className="px-6 py-8 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-8">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      </>
    );
  }

  if (!document) {
    return (
      <>
        <Header title="Dokument nicht gefunden" />
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-ink-muted">
            Das Dokument konnte nicht gefunden werden.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/documents">
              <ArrowLeft className="h-4 w-4" />
              Zurück zur Übersicht
            </Link>
          </Button>
        </div>
      </>
    );
  }

  const isProcessing = !["ready", "error", "uploaded"].includes(
    document.status
  );

  // Sort concepts by importance
  const sortedConcepts = [...concepts].sort(
    (a, b) => b.importanceScore - a.importanceScore
  );

  return (
    <>
      <Header title={document.filename} subtitle="Dokumentdetails" />

      <div className="px-6 py-8">
        {/* Back link */}
        <Link
          href="/documents"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Alle Dokumente
        </Link>

        {/* Document info */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-xl border border-border bg-surface p-6"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent-light">
              <FileText className="h-6 w-6 text-accent" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-xl font-bold text-ink">
                {document.filename}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>{formatFileSize(document.fileSize)}</span>
                {document.pageCount && (
                  <span>{document.pageCount} Seiten</span>
                )}
                <span>{formatDate(document.createdAt)}</span>
              </div>
            </div>
            {document.status === "ready" && (
              <Button asChild>
                <Link href={`/exams/new?documents=${id}`}>
                  <GraduationCap className="h-4 w-4" />
                  Klausur erstellen
                </Link>
              </Button>
            )}
          </div>
        </motion.div>

        {/* Processing progress */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 rounded-xl border border-partial/30 bg-partial-light/50 p-6"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-partial" />
              <div>
                <p className="text-sm font-semibold text-ink">
                  Dokument wird verarbeitet...
                </p>
                <p className="text-xs text-muted-foreground">
                  Status: {document.status}
                </p>
              </div>
            </div>
            {progress.length > 0 && (
              <div className="mt-4 space-y-2">
                {progress.map((p) => (
                  <div key={p.stepName} className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        p.stepStatus === "completed"
                          ? "bg-correct"
                          : p.stepStatus === "in_progress"
                          ? "animate-pulse bg-partial"
                          : "bg-border-strong"
                      )}
                    />
                    <span className="text-xs text-ink-muted capitalize">
                      {p.stepName}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Error state */}
        {document.status === "error" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 rounded-xl border border-incorrect/30 bg-incorrect-light/50 p-6"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-incorrect" />
              <div>
                <p className="text-sm font-semibold text-incorrect">
                  Verarbeitung fehlgeschlagen
                </p>
                {document.errorMessage && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {document.errorMessage}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Concepts grid */}
        {document.status === "ready" && sortedConcepts.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-accent" strokeWidth={1.8} />
              <h3 className="font-serif text-lg font-semibold text-ink">
                Extrahierte Konzepte
              </h3>
              <Badge variant="secondary" className="ml-1">
                {sortedConcepts.length}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Erkannte Themen und Konzepte, sortiert nach Prüfungsrelevanz.
            </p>

            <motion.div
              initial="hidden"
              animate="visible"
              className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {sortedConcepts.map((concept, i) => (
                <motion.div
                  key={concept.id}
                  custom={i}
                  variants={fadeInUp}
                  className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/20"
                >
                  {/* Name and importance */}
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-ink leading-snug">
                      {concept.name}
                    </h4>
                    <div className="flex items-center gap-1 shrink-0">
                      <Star
                        className={cn(
                          "h-3.5 w-3.5",
                          concept.importanceScore >= 0.7
                            ? "fill-partial text-partial"
                            : "text-border-strong"
                        )}
                      />
                      <span className="font-numbers text-xs text-muted-foreground">
                        {Math.round(concept.importanceScore * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {concept.description && (
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {concept.description}
                    </p>
                  )}

                  {/* Importance bar */}
                  <div className="mt-3">
                    <Progress
                      value={concept.importanceScore * 100}
                      className="h-1.5"
                    />
                  </div>

                  {/* Meta */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {concept.pageReferences.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                        <FileText className="h-2.5 w-2.5" />
                        S. {concept.pageReferences.slice(0, 3).join(", ")}
                        {concept.pageReferences.length > 3 && "..."}
                      </span>
                    )}
                    {(concept as DocumentConcept & { hasFormulas?: boolean; hasCaseExamples?: boolean }).hasFormulas && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-partial-light px-2 py-0.5 text-[10px] font-medium text-partial">
                        <Calculator className="h-2.5 w-2.5" />
                        Formeln
                      </span>
                    )}
                    {(concept as DocumentConcept & { hasFormulas?: boolean; hasCaseExamples?: boolean }).hasCaseExamples && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-light px-2 py-0.5 text-[10px] font-medium text-accent">
                        <BookOpen className="h-2.5 w-2.5" />
                        Fallbeispiele
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

        {/* Ready but no concepts */}
        {document.status === "ready" && sortedConcepts.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 rounded-xl border border-dashed border-border-strong bg-surface-raised py-12 text-center"
          >
            <Brain className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Keine Konzepte extrahiert.
            </p>
          </motion.div>
        )}
      </div>
    </>
  );
}
