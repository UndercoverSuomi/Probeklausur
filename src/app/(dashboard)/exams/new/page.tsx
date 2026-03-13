"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  FileText,
  GraduationCap,
  Loader2,
  Minus,
  Plus,
  Sparkles,
  Timer,
  Zap,
  Flame,
  Skull,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { QuestionTypeSelector } from "@/components/exam/question-type-selector";
import { DifficultySelector } from "@/components/exam/difficulty-selector";
import { ModeSelector } from "@/components/exam/mode-selector";
import { ModelSelector } from "@/components/exam/model-selector";
import { cn, formatFileSize } from "@/lib/utils";

// ── Form schema ──
const formSchema = z.object({
  documentIds: z.array(z.string()).min(1, "Mindestens ein Dokument auswählen"),
  questionCount: z.number().min(10).max(30),
  questionTypes: z
    .array(z.string())
    .min(1, "Mindestens einen Fragentyp auswählen"),
  difficulty: z.string(),
  mode: z.string(),
  timeLimitMinutes: z.number().nullable(),
  modelId: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

interface ReadyDocument {
  id: string;
  filename: string;
  fileSize: number;
  pageCount: number | null;
  conceptCount?: number;
}

// ── Presets ──
const presets = [
  {
    label: "Master Standard",
    icon: GraduationCap,
    description: "20 Fragen, alle Typen, Standardniveau",
    values: {
      questionCount: 20,
      difficulty: "standard",
      questionTypes: [
        "SINGLE_CHOICE",
        "MULTIPLE_SELECT",
        "SHORT_ANSWER",
        "NUMERIC",
      ],
    },
  },
  {
    label: "Hart",
    icon: Flame,
    description: "15 Fragen, schwer, alle Typen",
    values: {
      questionCount: 15,
      difficulty: "hard",
      questionTypes: [
        "SINGLE_CHOICE",
        "MULTIPLE_SELECT",
        "SHORT_ANSWER",
        "NUMERIC",
      ],
    },
  },
  {
    label: "Brutal",
    icon: Skull,
    description: "10 Fragen, sehr schwer, alle Typen",
    values: {
      questionCount: 10,
      difficulty: "very_hard",
      questionTypes: [
        "SINGLE_CHOICE",
        "MULTIPLE_SELECT",
        "SHORT_ANSWER",
        "NUMERIC",
      ],
    },
  },
];

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

export default function ExamConfigPageWrapper() {
  return (
    <Suspense>
      <ExamConfigPage />
    </Suspense>
  );
}

function ExamConfigPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedDocIds = searchParams.get("documents")?.split(",") ?? [];

  const [documents, setDocuments] = useState<ReadyDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentIds: preselectedDocIds,
      questionCount: 20,
      questionTypes: [
        "SINGLE_CHOICE",
        "MULTIPLE_SELECT",
        "SHORT_ANSWER",
        "NUMERIC",
      ],
      difficulty: "standard",
      mode: "exam",
      timeLimitMinutes: null,
      modelId: "gpt-5.4",
    },
  });

  const mode = watch("mode");
  const questionCount = watch("questionCount");
  const selectedDocIds = watch("documentIds");
  const timeLimitMinutes = watch("timeLimitMinutes");

  // Fetch ready documents
  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents?status=ready");
      if (!res.ok) throw new Error("Fehler");
      const data = await res.json();
      setDocuments(data.documents ?? data ?? []);
    } catch {
      toast.error("Dokumente konnten nicht geladen werden.");
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Apply preset
  function applyPreset(preset: (typeof presets)[0]) {
    setValue("questionCount", preset.values.questionCount);
    setValue("difficulty", preset.values.difficulty);
    setValue("questionTypes", preset.values.questionTypes);
    toast.success(`Preset "${preset.label}" angewendet`);
  }

  // Toggle document selection
  function toggleDocument(docId: string) {
    const current = selectedDocIds;
    if (current.includes(docId)) {
      setValue(
        "documentIds",
        current.filter((id) => id !== docId),
        { shouldValidate: true }
      );
    } else {
      setValue("documentIds", [...current, docId], { shouldValidate: true });
    }
  }

  // Submit
  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/exams/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Fehler bei der Klausurerstellung");
      }

      const { examId } = await res.json();
      toast.success("Klausur wird generiert...");
      router.push(`/exams/${examId}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Klausur konnte nicht erstellt werden."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header
        title="Neue Klausur"
        subtitle="Konfiguriere deine Probeklausur"
      />

      <div className="px-6 py-8">
        {/* Back link */}
        <Link
          href="/documents"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Zurück
        </Link>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
          <motion.div initial="hidden" animate="visible">
            {/* ── Title ── */}
            <motion.div custom={0} variants={fadeInUp}>
              <h2 className="font-serif text-2xl font-bold text-ink">
                Klausur konfigurieren
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Wähle Dokumente, Fragentypen und Schwierigkeit für deine
                Probeklausur.
              </p>
            </motion.div>

            {/* ── Presets ── */}
            <motion.div custom={1} variants={fadeInUp} className="mt-8">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Schnellvorlagen
              </Label>
              <div className="mt-3 flex flex-wrap gap-3">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-left transition-all",
                      "hover:border-accent/30 hover:shadow-sm"
                    )}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-accent-light">
                      <preset.icon
                        className="h-4 w-4 text-ink-muted group-hover:text-accent"
                        strokeWidth={1.8}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {preset.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>

            <Separator className="my-8" />

            {/* ── Section 1: Document Selection ── */}
            <motion.div custom={2} variants={fadeInUp}>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white text-xs font-bold">
                  1
                </div>
                <Label className="text-base font-semibold text-ink">
                  Dokumente auswählen
                </Label>
              </div>
              {errors.documentIds && (
                <p className="mt-2 text-xs text-incorrect">
                  {errors.documentIds.message}
                </p>
              )}

              {loadingDocs ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-xl" />
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-border-strong bg-surface-raised p-8 text-center">
                  <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Keine fertigen Dokumente vorhanden.
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link href="/upload">Dokumente hochladen</Link>
                  </Button>
                </div>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {documents.map((doc) => {
                    const isSelected = selectedDocIds.includes(doc.id);
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => toggleDocument(doc.id)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                          isSelected
                            ? "border-accent bg-accent-light/40 shadow-sm"
                            : "border-border bg-surface hover:border-border-strong"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                            isSelected
                              ? "bg-accent text-white"
                              : "bg-muted text-ink-muted"
                          )}
                        >
                          {isSelected ? (
                            <Check className="h-5 w-5" strokeWidth={2.5} />
                          ) : (
                            <FileText className="h-5 w-5" strokeWidth={1.8} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">
                            {doc.filename}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatFileSize(doc.fileSize)}
                            {doc.pageCount && ` \u00B7 ${doc.pageCount} Seiten`}
                            {doc.conceptCount != null &&
                              doc.conceptCount > 0 &&
                              ` \u00B7 ${doc.conceptCount} Konzepte`}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>

            <Separator className="my-8" />

            {/* ── Section 2: Question Count ── */}
            <motion.div custom={3} variants={fadeInUp}>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white text-xs font-bold">
                  2
                </div>
                <Label className="text-base font-semibold text-ink">
                  Anzahl der Fragen
                </Label>
              </div>

              <Controller
                control={control}
                name="questionCount"
                render={({ field }) => (
                  <div className="mt-4 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        field.onChange(Math.max(10, field.value - 1))
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-ink transition-colors hover:bg-muted"
                    >
                      <Minus className="h-4 w-4" />
                    </button>

                    <div className="flex-1">
                      <input
                        type="range"
                        min={10}
                        max={30}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value))
                        }
                        className="w-full accent-accent"
                      />
                      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                        <span>10</span>
                        <span>15</span>
                        <span>20</span>
                        <span>25</span>
                        <span>30</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        field.onChange(Math.min(30, field.value + 1))
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-ink transition-colors hover:bg-muted"
                    >
                      <Plus className="h-4 w-4" />
                    </button>

                    <div className="flex h-12 w-16 items-center justify-center rounded-xl border-2 border-accent bg-accent-light/50">
                      <span className="font-numbers text-xl font-bold text-accent">
                        {field.value}
                      </span>
                    </div>
                  </div>
                )}
              />
            </motion.div>

            <Separator className="my-8" />

            {/* ── Section 3: Question Types ── */}
            <motion.div custom={4} variants={fadeInUp}>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white text-xs font-bold">
                  3
                </div>
                <Label className="text-base font-semibold text-ink">
                  Fragentypen
                </Label>
              </div>
              {errors.questionTypes && (
                <p className="mt-2 text-xs text-incorrect">
                  {errors.questionTypes.message}
                </p>
              )}

              <div className="mt-4">
                <Controller
                  control={control}
                  name="questionTypes"
                  render={({ field }) => (
                    <QuestionTypeSelector
                      selected={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            </motion.div>

            <Separator className="my-8" />

            {/* ── Section 4: Difficulty ── */}
            <motion.div custom={5} variants={fadeInUp}>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white text-xs font-bold">
                  4
                </div>
                <Label className="text-base font-semibold text-ink">
                  Schwierigkeitsgrad
                </Label>
              </div>

              <div className="mt-4">
                <Controller
                  control={control}
                  name="difficulty"
                  render={({ field }) => (
                    <DifficultySelector
                      selected={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            </motion.div>

            <Separator className="my-8" />

            {/* ── Section 5: Mode ── */}
            <motion.div custom={6} variants={fadeInUp}>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white text-xs font-bold">
                  5
                </div>
                <Label className="text-base font-semibold text-ink">
                  Modus
                </Label>
              </div>

              <div className="mt-4">
                <Controller
                  control={control}
                  name="mode"
                  render={({ field }) => (
                    <ModeSelector
                      selected={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

              {/* Timer toggle - only for exam mode */}
              {mode === "exam" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-5 rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        <Timer
                          className="h-4.5 w-4.5 text-ink-muted"
                          strokeWidth={1.8}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          Zeitlimit
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Optionales Zeitlimit für die Prüfung
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setValue(
                          "timeLimitMinutes",
                          timeLimitMinutes === null
                            ? questionCount * 2
                            : null
                        )
                      }
                      className={cn(
                        "relative h-6 w-11 rounded-full transition-colors",
                        timeLimitMinutes !== null
                          ? "bg-accent"
                          : "bg-border-strong"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                          timeLimitMinutes !== null && "translate-x-5"
                        )}
                      />
                    </button>
                  </div>
                  {timeLimitMinutes !== null && (
                    <div className="mt-3 flex items-center gap-3">
                      <input
                        type="range"
                        min={10}
                        max={180}
                        step={5}
                        value={timeLimitMinutes}
                        onChange={(e) =>
                          setValue("timeLimitMinutes", Number(e.target.value))
                        }
                        className="flex-1 accent-accent"
                      />
                      <span className="font-numbers w-20 text-right text-sm font-semibold text-ink">
                        {timeLimitMinutes} Min.
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>

            <Separator className="my-8" />

            {/* ── Section 6: AI Model ── */}
            <motion.div custom={7} variants={fadeInUp}>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white text-xs font-bold">
                  6
                </div>
                <Label className="text-base font-semibold text-ink">
                  KI-Modell
                </Label>
              </div>
              <p className="mt-1.5 ml-9 text-xs text-muted-foreground">
                Wähle das Sprachmodell für die Fragengenerierung
              </p>

              <div className="mt-4">
                <Controller
                  control={control}
                  name="modelId"
                  render={({ field }) => (
                    <ModelSelector
                      selected={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            </motion.div>

            <Separator className="my-8" />

            {/* ── Summary & Submit ── */}
            <motion.div custom={8} variants={fadeInUp}>
              <div className="rounded-xl border border-accent/20 bg-accent-light/30 p-6">
                <h3 className="font-serif text-lg font-semibold text-ink">
                  Zusammenfassung
                </h3>
                <div className="mt-3 grid gap-2 text-sm text-ink-muted sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">Dokumente:</span>{" "}
                    <span className="font-medium text-ink">
                      {selectedDocIds.length} ausgewählt
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fragen:</span>{" "}
                    <span className="font-numbers font-medium text-ink">
                      {questionCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Schwierigkeit:
                    </span>{" "}
                    <span className="font-medium text-ink capitalize">
                      {watch("difficulty") === "very_hard"
                        ? "Sehr schwer"
                        : watch("difficulty") === "hard"
                        ? "Schwer"
                        : "Standard"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Modus:</span>{" "}
                    <span className="font-medium text-ink">
                      {mode === "exam" ? "Probeprüfung" : "Lernmodus"}
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting || selectedDocIds.length === 0}
                  className="mt-6 w-full gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Wird erstellt...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Klausur generieren
                    </>
                  )}
                </Button>
                <p className="mt-3 text-center text-xs text-muted-foreground/70">
                  Viel Erfolg ♥!
                </p>
              </div>
            </motion.div>
          </motion.div>
        </form>
      </div>
    </>
  );
}
