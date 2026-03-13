"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn, formatFileSize } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────

type FileStage =
  | "pending"
  | "uploading"
  | "parsing"
  | "chunking"
  | "embedding"
  | "analyzing"
  | "ready"
  | "error";

interface UploadFile {
  id: string;
  file: File;
  stage: FileStage;
  progress: number;
  documentId: string | null;
  pageCount: number | null;
  errorMessage: string | null;
}

const STAGE_CONFIG: Record<
  FileStage,
  { label: string; progress: number; color: string }
> = {
  pending: { label: "Wartend", progress: 0, color: "text-ink-muted" },
  uploading: { label: "Hochladen", progress: 10, color: "text-accent" },
  parsing: { label: "Parsing", progress: 25, color: "text-accent" },
  chunking: { label: "Chunking", progress: 45, color: "text-accent" },
  embedding: { label: "Embeddings", progress: 65, color: "text-accent" },
  analyzing: { label: "Analyse", progress: 85, color: "text-accent" },
  ready: { label: "Bereit", progress: 100, color: "text-correct" },
  error: { label: "Fehler", progress: 0, color: "text-incorrect" },
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

// ─── Component ──────────────────────────────────────────────────

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([]);

  const updateFile = useCallback(
    (id: string, updates: Partial<UploadFile>) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
      );
    },
    []
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const processFile = useCallback(
    async (uploadFile: UploadFile) => {
      const { id, file } = uploadFile;

      try {
        // ── Step 1: Upload ──
        updateFile(id, { stage: "uploading", progress: 10 });

        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || "Upload fehlgeschlagen");
        }

        const { documentId, pageCount } = await uploadRes.json();
        updateFile(id, {
          documentId,
          pageCount,
          stage: "parsing",
          progress: 25,
        });

        // ── Step 2: Process ──
        const processRes = await fetch("/api/documents/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId }),
        });

        if (!processRes.ok) {
          const err = await processRes.json();
          throw new Error(err.error || "Verarbeitung fehlgeschlagen");
        }

        // ── Step 3: Poll for progress ──
        let done = false;
        while (!done) {
          await new Promise((r) => setTimeout(r, 2000));

          const statusRes = await fetch(`/api/documents/${documentId}`);
          if (!statusRes.ok) break;

          const doc = await statusRes.json();
          const status = doc.status as FileStage;

          if (status === "ready") {
            updateFile(id, {
              stage: "ready",
              progress: 100,
              pageCount: doc.page_count ?? pageCount,
            });
            done = true;
            toast.success(`"${file.name}" erfolgreich verarbeitet`);
          } else if (status === "error") {
            throw new Error(
              doc.error_message || "Verarbeitung fehlgeschlagen"
            );
          } else {
            const cfg = STAGE_CONFIG[status] || STAGE_CONFIG.parsing;
            updateFile(id, { stage: status, progress: cfg.progress });
          }
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unbekannter Fehler";
        updateFile(id, {
          stage: "error",
          progress: 0,
          errorMessage: message,
        });
        toast.error(`Fehler bei "${file.name}": ${message}`);
      }
    },
    [updateFile]
  );

  const onDrop = useCallback(
    (accepted: File[]) => {
      const newFiles: UploadFile[] = [];

      for (const file of accepted) {
        if (file.type !== "application/pdf") {
          toast.error(`"${file.name}" ist keine PDF-Datei`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          toast.error(
            `"${file.name}" ist zu gross (max. ${formatFileSize(MAX_FILE_SIZE)})`
          );
          continue;
        }

        const uploadFile: UploadFile = {
          id: crypto.randomUUID(),
          file,
          stage: "pending",
          progress: 0,
          documentId: null,
          pageCount: null,
          errorMessage: null,
        };
        newFiles.push(uploadFile);
      }

      if (newFiles.length === 0) return;

      setFiles((prev) => [...prev, ...newFiles]);

      // Start processing each file
      for (const uf of newFiles) {
        processFile(uf);
      }
    },
    [processFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
  });

  const hasFiles = files.length > 0;
  const allReady = hasFiles && files.every((f) => f.stage === "ready");
  const someReady = files.some((f) => f.stage === "ready");

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">
          Dokumente hochladen
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Lade deine Vorlesungsskripte, Lehrbuch-Kapitel oder Zusammenfassungen
          als PDF hoch. Die Inhalte werden automatisch analysiert und fuer die
          Klausurerstellung vorbereitet.
        </p>
      </motion.div>

      {/* ── Drop Zone ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mt-8"
      >
        <div
          {...getRootProps()}
          className={cn(
            "group relative cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-all duration-200",
            isDragActive
              ? "border-accent bg-accent-light/50 shadow-inner"
              : "border-border-strong hover:border-accent hover:bg-accent-light/20",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          )}
        >
          <input {...getInputProps()} />

          <motion.div
            animate={isDragActive ? { scale: 1.05 } : { scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex flex-col items-center gap-4"
          >
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-200",
                isDragActive
                  ? "bg-accent text-white"
                  : "bg-muted text-ink-muted group-hover:bg-accent-light group-hover:text-accent"
              )}
            >
              <Upload className="h-7 w-7" strokeWidth={1.5} />
            </div>

            <div>
              <p className="font-serif text-lg font-medium text-ink">
                {isDragActive
                  ? "PDFs hier ablegen"
                  : "PDFs hierher ziehen oder klicken"}
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                PDF-Dateien bis {formatFileSize(MAX_FILE_SIZE)} pro Datei
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ── File List ── */}
      <AnimatePresence mode="popLayout">
        {hasFiles && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 space-y-3"
          >
            <h2 className="font-serif text-lg font-medium text-ink">
              Dateien
            </h2>

            {files.map((uf, index) => (
              <FileCard
                key={uf.id}
                file={uf}
                index={index}
                onRemove={removeFile}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Actions after upload ── */}
      <AnimatePresence>
        {someReady && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link href="/documents">
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Zu Dokumenten
              </Button>
            </Link>
            {allReady && (
              <Link href="/exams">
                <Button>Klausur erstellen</Button>
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── FileCard ───────────────────────────────────────────────────

function FileCard({
  file,
  index,
  onRemove,
}: {
  file: UploadFile;
  index: number;
  onRemove: (id: string) => void;
}) {
  const cfg = STAGE_CONFIG[file.stage];
  const isActive = !["ready", "error", "pending"].includes(file.stage);
  const canRemove = file.stage === "ready" || file.stage === "error";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                file.stage === "ready"
                  ? "bg-correct-light text-correct"
                  : file.stage === "error"
                    ? "bg-incorrect-light text-incorrect"
                    : "bg-accent-light text-accent"
              )}
            >
              {file.stage === "ready" ? (
                <CheckCircle className="h-5 w-5" />
              ) : file.stage === "error" ? (
                <AlertCircle className="h-5 w-5" />
              ) : isActive ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-ink">
                  {file.file.name}
                </p>
                <Badge
                  variant={
                    file.stage === "ready"
                      ? "success"
                      : file.stage === "error"
                        ? "destructive"
                        : "secondary"
                  }
                  className="shrink-0"
                >
                  {cfg.label}
                </Badge>
              </div>

              <div className="mt-1 flex items-center gap-3 text-xs text-ink-muted">
                <span>{formatFileSize(file.file.size)}</span>
                {file.pageCount != null && (
                  <span>
                    {file.pageCount}{" "}
                    {file.pageCount === 1 ? "Seite" : "Seiten"}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {isActive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3"
                >
                  <Progress value={file.progress} className="h-1.5" />
                  <div className="mt-1.5 flex justify-between text-[11px] text-ink-muted">
                    <StageTimeline current={file.stage} />
                  </div>
                </motion.div>
              )}

              {/* Error message */}
              {file.stage === "error" && file.errorMessage && (
                <p className="mt-2 text-xs text-incorrect">
                  {file.errorMessage}
                </p>
              )}
            </div>

            {/* Remove button */}
            {canRemove && (
              <button
                type="button"
                onClick={() => onRemove(file.id)}
                className="shrink-0 rounded-md p-1 text-ink-muted transition-colors hover:bg-muted hover:text-ink"
                aria-label="Entfernen"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Stage Timeline ─────────────────────────────────────────────

const PIPELINE_STAGES: FileStage[] = [
  "uploading",
  "parsing",
  "chunking",
  "embedding",
  "analyzing",
  "ready",
];

function StageTimeline({ current }: { current: FileStage }) {
  const currentIdx = PIPELINE_STAGES.indexOf(current);

  return (
    <div className="flex items-center gap-1">
      {PIPELINE_STAGES.map((stage, i) => {
        const isPast = i < currentIdx;
        const isCurrent = i === currentIdx;

        return (
          <span
            key={stage}
            className={cn(
              "transition-colors",
              isPast
                ? "text-correct"
                : isCurrent
                  ? "font-medium text-accent"
                  : "text-border-strong"
            )}
          >
            {STAGE_CONFIG[stage].label}
            {i < PIPELINE_STAGES.length - 1 && (
              <span className="mx-1 text-border-strong">/</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
