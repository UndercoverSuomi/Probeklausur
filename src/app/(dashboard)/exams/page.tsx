"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Clock,
  FileText,
  ChevronRight,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";

interface ExamRow {
  id: string;
  title: string;
  status: string;
  mode: string;
  difficulty: string;
  question_count: number;
  time_limit_minutes: number | null;
  created_at: string;
  attempts: {
    id: string;
    status: string;
    score: number | null;
    max_score: number | null;
    percentage: number | null;
    completed_at: string | null;
  }[];
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  created: {
    label: "Erstellt",
    color: "bg-muted text-ink-muted",
    icon: FileText,
  },
  generating: {
    label: "Generierung\u2026",
    color: "bg-partial-light text-partial animate-pulse",
    icon: Loader2,
  },
  ready: {
    label: "Bereit",
    color: "bg-correct-light text-correct",
    icon: CheckCircle2,
  },
  error: {
    label: "Fehler",
    color: "bg-incorrect-light text-incorrect",
    icon: AlertCircle,
  },
};

const difficultyLabels: Record<string, string> = {
  standard: "Standard",
  hard: "Schwer",
  very_hard: "Sehr schwer",
};

const modeLabels: Record<string, string> = {
  exam: "Probeklausur",
  learning: "Lernmodus",
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function ExamsPage() {
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);
    try {
      const res = await fetch(`/api/exams/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Fehler beim Löschen");
      setExams((prev) => prev.filter((ex) => ex.id !== id));
      toast.success("Klausur gelöscht");
    } catch {
      toast.error("Klausur konnte nicht gelöscht werden.");
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: examRows } = await supabase
        .from("exams")
        .select(
          `
          id, title, status, config, total_questions, created_at,
          exam_attempts (id, status, total_score, max_score, percentage, completed_at)
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (examRows) {
        setExams(
          examRows.map((e: Record<string, unknown>) => {
            const cfg = (e.config ?? {}) as Record<string, unknown>;
            return {
              id: e.id as string,
              title: e.title as string,
              status: e.status as string,
              mode: (cfg.mode as string) ?? "exam",
              difficulty: (cfg.difficulty as string) ?? "standard",
              question_count: (e.total_questions as number) ?? (cfg.questionCount as number) ?? 0,
              time_limit_minutes: (cfg.timeLimitMinutes as number | null) ?? null,
              created_at: e.created_at as string,
              attempts: (
                (e.exam_attempts as { id: string; status: string; total_score: number | null; max_score: number | null; percentage: number | null; completed_at: string | null }[]) || []
              ).map((a) => ({
                id: a.id,
                status: a.status,
                score: a.total_score,
                max_score: a.max_score,
                percentage: a.percentage,
                completed_at: a.completed_at,
              })),
            };
          })
        );
      }
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8 space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">
            Klausuren
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {exams.length} {exams.length === 1 ? "Klausur" : "Klausuren"} erstellt
          </p>
        </div>
        <Link href="/exams/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Neue Klausur
          </Button>
        </Link>
      </div>

      {/* Empty state */}
      {exams.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-20"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-light">
            <GraduationCap className="h-7 w-7 text-accent" strokeWidth={1.5} />
          </div>
          <h2 className="mt-4 font-serif text-lg font-semibold text-ink">
            Noch keine Klausuren
          </h2>
          <p className="mt-1 max-w-sm text-center text-sm text-ink-muted">
            Laden Sie Dokumente hoch und erstellen Sie Ihre erste Probeklausur,
            um Ihr Wissen zu testen.
          </p>
          <Link href="/exams/new" className="mt-6">
            <Button>
              <Plus className="h-4 w-4" />
              Erste Klausur erstellen
            </Button>
          </Link>
        </motion.div>
      )}

      {/* Exam list */}
      {exams.length > 0 && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {exams.map((exam) => {
            const status = statusConfig[exam.status] || statusConfig.created;
            const StatusIcon = status.icon;
            const bestAttempt = exam.attempts
              .filter((a) => a.status === "completed" && a.percentage !== null)
              .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))[0];

            return (
              <motion.div key={exam.id} variants={item}>
                <Link href={`/exams/${exam.id}`}>
                  <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-accent/20">
                    <CardContent className="flex items-center gap-4 p-5">
                      {/* Icon */}
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-light">
                        <GraduationCap
                          className="h-5 w-5 text-accent"
                          strokeWidth={1.8}
                        />
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-serif text-base font-semibold text-ink truncate group-hover:text-accent transition-colors">
                          {exam.title}
                        </h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <Badge
                            className={`text-[10px] px-2 py-0 ${status.color}`}
                          >
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {status.label}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-2 py-0">
                            {modeLabels[exam.mode] || exam.mode}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] px-2 py-0">
                            {difficultyLabels[exam.difficulty] || exam.difficulty}
                          </Badge>
                          <span className="flex items-center gap-1 text-xs text-ink-muted">
                            <FileText className="h-3 w-3" />
                            {exam.question_count} Fragen
                          </span>
                          {exam.time_limit_minutes && (
                            <span className="flex items-center gap-1 text-xs text-ink-muted">
                              <Clock className="h-3 w-3" />
                              {exam.time_limit_minutes} min
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Score / CTA */}
                      <div className="shrink-0 flex items-center gap-3">
                        {bestAttempt && (
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-xs text-ink-muted">
                              <BarChart3 className="h-3 w-3" />
                              Bestes Ergebnis
                            </div>
                            <p className="font-mono text-lg font-bold text-accent tabular-nums">
                              {bestAttempt.percentage?.toFixed(0)}%
                            </p>
                          </div>
                        )}
                        {exam.status === "ready" && !bestAttempt && (
                          <Button size="sm" variant="default">
                            Klausur starten
                          </Button>
                        )}
                        <ChevronRight className="h-4 w-4 text-ink-muted group-hover:text-accent transition-colors" />
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, exam.id)}
                          disabled={deletingId === exam.id}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-all hover:bg-incorrect-light hover:text-incorrect disabled:opacity-50"
                          aria-label="Klausur löschen"
                          title="Löschen"
                        >
                          {deletingId === exam.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
