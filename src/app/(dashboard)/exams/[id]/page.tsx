"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Clock,
  FileText,
  CheckCircle2,
  Loader2,
  BarChart3,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface ExamDetail {
  id: string;
  title: string;
  status: string;
  mode: string;
  difficulty: string;
  question_count: number;
  time_limit_minutes: number | null;
  created_at: string;
  generation_progress?: {
    step: string;
    percentage: number;
  };
  questions_meta?: {
    type_distribution: Record<string, number>;
    difficulty_distribution: Record<string, number>;
    topic_distribution: Record<string, number>;
  };
  attempts: {
    id: string;
    status: string;
    score: number | null;
    max_score: number | null;
    percentage: number | null;
    started_at: string;
    completed_at: string | null;
  }[];
}

const generationSteps = [
  { key: "blueprint", label: "Blueprint erstellen", icon: Sparkles },
  { key: "generating", label: "Fragen generieren", icon: FileText },
  { key: "validating", label: "Fragen validieren", icon: ShieldCheck },
  { key: "ready", label: "Bereit", icon: CheckCircle2 },
];

const difficultyLabels: Record<string, string> = {
  standard: "Standard",
  hard: "Schwer",
  very_hard: "Sehr schwer",
};

const typeLabels: Record<string, string> = {
  SINGLE_CHOICE: "Einfachauswahl",
  MULTIPLE_SELECT: "Mehrfachauswahl",
  SHORT_ANSWER: "Freitext",
  NUMERIC: "Numerisch",
};

export default function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const loadExam = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("exams")
      .select(
        `
        id, title, status, config, blueprint, total_questions, total_points,
        error_message, created_at, updated_at,
        exam_attempts (id, status, total_score, max_score, percentage, started_at, completed_at)
      `
      )
      .eq("id", id)
      .single();

    if (data) {
      const config = (data.config ?? {}) as Record<string, unknown>;
      setExam({
        id: data.id,
        title: data.title,
        status: data.status,
        mode: (config.mode as string) ?? "exam",
        difficulty: (config.difficulty as string) ?? "standard",
        question_count: data.total_questions ?? (config.questionCount as number) ?? 0,
        time_limit_minutes: (config.timeLimitMinutes as number | null) ?? null,
        created_at: data.created_at,
        generation_progress: undefined,
        questions_meta: undefined,
        attempts: (
          (data as Record<string, unknown>).exam_attempts as {
            id: string;
            status: string;
            total_score: number | null;
            max_score: number | null;
            percentage: number | null;
            started_at: string;
            completed_at: string | null;
          }[]
        )?.map((a) => ({
          id: a.id,
          status: a.status,
          score: a.total_score,
          max_score: a.max_score,
          percentage: a.percentage,
          started_at: a.started_at,
          completed_at: a.completed_at,
        })) || [],
      });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  // Poll while generating or just created
  useEffect(() => {
    if (!exam || (exam.status !== "generating" && exam.status !== "created")) return;
    const interval = setInterval(loadExam, 3000);
    return () => clearInterval(interval);
  }, [exam?.status, loadExam]);

  const startExam = async () => {
    setStarting(true);
    try {
      const res = await fetch(`/api/exams/${id}/attempt`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Fehler beim Starten");
      }
      const { attemptId } = await res.json();
      router.push(`/exams/${id}/take?attempt=${attemptId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler beim Starten der Klausur");
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-48 mb-8" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-partial mb-4" />
        <h1 className="font-serif text-xl font-bold text-ink">
          Klausur nicht gefunden
        </h1>
      </div>
    );
  }

  const currentStepIndex = generationSteps.findIndex(
    (s) => s.key === (exam.generation_progress?.step || exam.status)
  );
  const isGenerating = exam.status === "generating" || exam.status === "created";
  const isReady = exam.status === "ready";
  const isError = exam.status === "error";

  const completedAttempts = exam.attempts.filter(
    (a) => a.status === "completed"
  );
  const inProgressAttempt = exam.attempts.find(
    (a) => a.status === "in_progress"
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-xs">
            {exam.mode === "learning" ? "Lernmodus" : "Probeklausur"}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {difficultyLabels[exam.difficulty] || exam.difficulty}
          </Badge>
        </div>
        <h1 className="font-serif text-2xl font-bold text-ink">
          {exam.title}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {exam.question_count} Fragen
          {exam.time_limit_minutes
            ? ` \u00b7 ${exam.time_limit_minutes} Minuten`
            : ""}
        </p>
      </div>

      {/* Generation progress */}
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
                Klausur wird generiert\u2026
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress
                value={exam.generation_progress?.percentage || 0}
                className="h-2"
              />
              <div className="grid grid-cols-4 gap-2">
                {generationSteps.map((step, i) => {
                  const StepIcon = step.icon;
                  const isDone = i < currentStepIndex;
                  const isCurrent = i === currentStepIndex;

                  return (
                    <div
                      key={step.key}
                      className="flex flex-col items-center gap-1.5 text-center"
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                          isDone
                            ? "bg-correct-light text-correct"
                            : isCurrent
                              ? "bg-accent-light text-accent"
                              : "bg-muted text-ink-muted"
                        }`}
                      >
                        {isCurrent ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <StepIcon className="h-4 w-4" strokeWidth={1.8} />
                        )}
                      </div>
                      <span className="text-[10px] text-ink-muted leading-tight">
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Error state */}
      {isError && (
        <Card className="mb-8 border-incorrect/20 bg-incorrect-light/30">
          <CardContent className="flex items-center gap-3 p-5">
            <AlertTriangle className="h-5 w-5 text-incorrect shrink-0" />
            <div>
              <p className="font-medium text-incorrect text-sm">
                Fehler bei der Generierung
              </p>
              <p className="text-xs text-ink-muted mt-0.5">
                Bitte versuchen Sie es erneut oder erstellen Sie eine neue Klausur.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exam overview (when ready) */}
      {isReady && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="flex flex-col items-center py-5">
                <FileText className="h-5 w-5 text-accent mb-2" strokeWidth={1.8} />
                <span className="font-mono text-2xl font-bold text-ink">
                  {exam.question_count}
                </span>
                <span className="text-xs text-ink-muted">Fragen</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center py-5">
                <Clock className="h-5 w-5 text-accent mb-2" strokeWidth={1.8} />
                <span className="font-mono text-2xl font-bold text-ink">
                  {exam.time_limit_minutes || "\u221E"}
                </span>
                <span className="text-xs text-ink-muted">Minuten</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center py-5">
                <BarChart3 className="h-5 w-5 text-accent mb-2" strokeWidth={1.8} />
                <span className="font-mono text-2xl font-bold text-ink">
                  {completedAttempts.length}
                </span>
                <span className="text-xs text-ink-muted">Versuche</span>
              </CardContent>
            </Card>
          </div>

          {/* Type distribution */}
          {exam.questions_meta?.type_distribution && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Fragentypen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(exam.questions_meta.type_distribution).map(
                    ([type, count]) => (
                      <div
                        key={type}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-ink-muted">
                          {typeLabels[type] || type}
                        </span>
                        <span className="font-mono text-ink">{count as number}</span>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Start button */}
          <div className="flex gap-3">
            {inProgressAttempt ? (
              <Button
                size="lg"
                className="flex-1"
                onClick={() =>
                  router.push(
                    `/exams/${id}/take?attempt=${inProgressAttempt.id}`
                  )
                }
              >
                <RotateCcw className="h-4 w-4" />
                Klausur fortsetzen
              </Button>
            ) : (
              <Button
                size="lg"
                className="flex-1"
                onClick={startExam}
                disabled={starting}
              >
                {starting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GraduationCap className="h-4 w-4" />
                )}
                Klausur starten
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Past attempts */}
      {completedAttempts.length > 0 && (
        <div className="mt-10">
          <Separator className="mb-6" />
          <h2 className="font-serif text-lg font-semibold text-ink mb-4">
            Bisherige Versuche
          </h2>
          <div className="space-y-3">
            {completedAttempts
              .sort(
                (a, b) =>
                  new Date(b.completed_at!).getTime() -
                  new Date(a.completed_at!).getTime()
              )
              .map((attempt, index) => (
                <Card key={attempt.id} className="group cursor-pointer hover:border-accent/20 transition-colors">
                  <button
                    className="w-full text-left"
                    onClick={() =>
                      router.push(
                        `/exams/${id}/review?attempt=${attempt.id}`
                      )
                    }
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-mono font-bold text-ink-muted">
                        {completedAttempts.length - index}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink">
                          Versuch {completedAttempts.length - index}
                        </p>
                        <p className="text-xs text-ink-muted mt-0.5">
                          {new Date(attempt.completed_at!).toLocaleDateString(
                            "de-DE",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-lg font-bold text-accent tabular-nums">
                          {attempt.percentage?.toFixed(0)}%
                        </p>
                        <p className="text-[10px] text-ink-muted">
                          {attempt.score}/{attempt.max_score} Punkte
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-ink-muted group-hover:text-accent transition-colors shrink-0" />
                    </CardContent>
                  </button>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
