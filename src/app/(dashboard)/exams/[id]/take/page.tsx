"use client";

import { Suspense, useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ExamTimer } from "@/components/exam/exam-timer";
import { QuestionNav, type QuestionStatus } from "@/components/exam/question-nav";
import { QuestionRenderer } from "@/components/exam/question-renderer";
import { toast } from "sonner";
import type {
  QuestionData,
  UserAnswer,
  GradeResult,
  ExamMode,
} from "@/types/exam";

type ExamQuestion = QuestionData & {
  id: string;
  points: number;
  order_index: number;
};

interface ExamTakeData {
  examId: string;
  attemptId: string;
  title: string;
  mode: ExamMode;
  timeLimitMinutes: number | null;
  questions: ExamQuestion[];
  existingAnswers: Record<string, UserAnswer>;
  startedAt: string;
}

export default function ExamTakePageWrapper({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense>
      <ExamTakePage params={params} />
    </Suspense>
  );
}

function ExamTakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: examId } = use(params);
  const searchParams = useSearchParams();
  const attemptId = searchParams.get("attempt");
  const router = useRouter();

  const [data, setData] = useState<ExamTakeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, UserAnswer>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [feedbackMap, setFeedbackMap] = useState<
    Record<string, { gradeResult: GradeResult; questionWithAnswers: ExamQuestion }>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [savingAnswer, setSavingAnswer] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  // Load exam data
  useEffect(() => {
    if (!attemptId) {
      router.replace(`/exams/${examId}`);
      return;
    }

    async function load() {
      try {
        const res = await fetch(`/api/exams/${examId}?attempt=${attemptId}`);
        if (!res.ok) throw new Error("Fehler beim Laden der Klausur");
        const json = await res.json();
        setData(json);
        setAnswers(json.existingAnswers || {});
      } catch {
        toast.error("Klausur konnte nicht geladen werden");
        router.replace(`/exams/${examId}`);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [examId, attemptId, router]);

  // Save answer (debounced for text/numeric, immediate for choice)
  const saveAnswer = useCallback(
    async (questionId: string, answer: UserAnswer, immediate = false) => {
      if (!attemptId || !data) return;

      const doSave = async () => {
        if (isSavingRef.current) return;
        isSavingRef.current = true;
        setSavingAnswer(true);
        try {
          const res = await fetch(
            `/api/exams/${examId}/attempt/${attemptId}/answer`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ questionId, answer }),
            }
          );

          if (!res.ok) throw new Error();

          // In learning mode, response includes feedback
          if (data.mode === "learning") {
            const json = await res.json();
            if (json.gradeResult) {
              setFeedbackMap((prev) => ({
                ...prev,
                [questionId]: {
                  gradeResult: json.gradeResult,
                  questionWithAnswers: json.questionWithAnswers,
                },
              }));
            }
          }
        } catch {
          // Silently fail, answer is still in local state
        } finally {
          isSavingRef.current = false;
          setSavingAnswer(false);
        }
      };

      if (immediate) {
        doSave();
      } else {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(doSave, 800);
      }
    },
    [attemptId, data, examId]
  );

  const handleAnswer = useCallback(
    (answer: UserAnswer) => {
      if (!data) return;
      const question = data.questions[currentIndex];
      setAnswers((prev) => ({ ...prev, [question.id]: answer }));

      // For choice questions, save immediately; for text/numeric, debounce
      const isImmediate =
        answer.type === "SINGLE_CHOICE" || answer.type === "MULTIPLE_SELECT";
      saveAnswer(question.id, answer, isImmediate);
    },
    [data, currentIndex, saveAnswer]
  );

  // Learning mode: submit current answer for grading
  const submitForFeedback = useCallback(async () => {
    if (!data || !attemptId) return;
    const question = data.questions[currentIndex];
    const answer = answers[question.id];
    if (!answer) {
      toast.error("Bitte beantworten Sie zuerst die Frage.");
      return;
    }

    setSavingAnswer(true);
    try {
      const res = await fetch(
        `/api/exams/${examId}/attempt/${attemptId}/answer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: question.id, answer, grade: true }),
        }
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (json.gradeResult) {
        setFeedbackMap((prev) => ({
          ...prev,
          [question.id]: {
            gradeResult: json.gradeResult,
            questionWithAnswers: json.questionWithAnswers || question,
          },
        }));
      }
    } catch {
      toast.error("Bewertung fehlgeschlagen");
    } finally {
      setSavingAnswer(false);
    }
  }, [data, attemptId, currentIndex, answers, examId]);

  const handleSubmitExam = async () => {
    if (!attemptId) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/exams/${examId}/attempt/${attemptId}/submit`,
        { method: "POST" }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Fehler beim Abgeben");
      }
      toast.success("Klausur abgegeben!");
      router.push(`/exams/${examId}/review?attempt=${attemptId}`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Fehler beim Abgeben der Klausur"
      );
      setSubmitting(false);
      setShowConfirmSubmit(false);
    }
  };

  const toggleFlag = () => {
    if (!data) return;
    const qid = data.questions[currentIndex].id;
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) {
        next.delete(qid);
      } else {
        next.add(qid);
      }
      return next;
    });
  };

  const handleTimeUp = useCallback(() => {
    toast.warning("Die Zeit ist abgelaufen! Klausur wird abgegeben\u2026");
    handleSubmitExam();
  }, []);

  // Loading
  if (loading || !data) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-2 w-full mb-8" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  const questions = data.questions;
  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentQuestion.id] || null;
  const answeredCount = Object.keys(answers).length;
  const isLearningMode = data.mode === "learning";
  const hasFeedback = !!feedbackMap[currentQuestion.id];

  // Question statuses for nav
  const questionStatuses: QuestionStatus[] = questions.map((q) => {
    if (q.id === currentQuestion.id) return "current";
    if (flagged.has(q.id)) return "flagged";
    if (answers[q.id]) return "answered";
    return "unanswered";
  });

  // Calculate time remaining
  const elapsedSeconds = Math.floor(
    (Date.now() - new Date(data.startedAt).getTime()) / 1000
  );
  const totalSeconds = data.timeLimitMinutes
    ? data.timeLimitMinutes * 60 - elapsedSeconds
    : 0;

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-light shrink-0">
              {isLearningMode ? (
                <BookOpen className="h-4 w-4 text-accent" strokeWidth={1.8} />
              ) : (
                <GraduationCap className="h-4 w-4 text-accent" strokeWidth={1.8} />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="font-serif text-sm font-semibold text-ink truncate">
                {data.title}
              </h1>
              <p className="text-[10px] text-ink-muted">
                {isLearningMode ? "Lernmodus" : "Probeklausur"} &middot; Frage{" "}
                {currentIndex + 1} von {questions.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Saving indicator */}
            {savingAnswer && (
              <span className="flex items-center gap-1 text-[10px] text-ink-muted">
                <Loader2 className="h-3 w-3 animate-spin" />
                Speichern\u2026
              </span>
            )}

            {/* Timer */}
            {data.timeLimitMinutes && totalSeconds > 0 && (
              <ExamTimer
                totalSeconds={Math.max(totalSeconds, 0)}
                onTimeUp={handleTimeUp}
              />
            )}

            {/* Submit */}
            {!isLearningMode && (
              <Button
                size="sm"
                variant="default"
                onClick={() => setShowConfirmSubmit(true)}
                disabled={submitting}
              >
                <Send className="h-3.5 w-3.5" />
                Abgeben
              </Button>
            )}
          </div>
        </div>

        {/* Progress */}
        <Progress
          value={answeredCount}
          max={questions.length}
          className="h-1 rounded-none"
        />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-6 lg:flex lg:gap-6">
          {/* Question nav (sidebar on large screens) */}
          <aside className="mb-6 lg:mb-0 lg:w-56 lg:shrink-0">
            <div className="lg:sticky lg:top-24">
              <p className="text-xs font-medium text-ink-muted mb-2">
                {answeredCount}/{questions.length} beantwortet
              </p>
              <QuestionNav
                questionCount={questions.length}
                currentIndex={currentIndex}
                statuses={questionStatuses}
                onNavigate={setCurrentIndex}
              />

              {/* Learning mode: submit all at end */}
              {isLearningMode && answeredCount === questions.length && (
                <Button
                  size="sm"
                  variant="default"
                  className="mt-4 w-full"
                  onClick={() => setShowConfirmSubmit(true)}
                  disabled={submitting}
                >
                  <Send className="h-3.5 w-3.5" />
                  Alle abgeben
                </Button>
              )}
            </div>
          </aside>

          {/* Question area */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <CardContent className="p-6 lg:p-8">
                    <QuestionRenderer
                      question={{
                        ...currentQuestion,
                        questionNumber: currentIndex + 1,
                      }}
                      answer={currentAnswer}
                      onAnswer={handleAnswer}
                      showFeedback={isLearningMode && hasFeedback}
                      gradeResult={
                        feedbackMap[currentQuestion.id]?.gradeResult || null
                      }
                      disabled={submitting}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Learning mode: check answer button */}
            {isLearningMode && !hasFeedback && currentAnswer && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <Button
                  onClick={submitForFeedback}
                  disabled={savingAnswer}
                  variant="default"
                >
                  {savingAnswer ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Antwort pr&uuml;fen
                </Button>
              </motion.div>
            )}

            {/* Navigation buttons */}
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentIndex === 0}
                  onClick={() =>
                    setCurrentIndex((i) => Math.max(0, i - 1))
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                  Zur&uuml;ck
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentIndex === questions.length - 1}
                  onClick={() =>
                    setCurrentIndex((i) =>
                      Math.min(questions.length - 1, i + 1)
                    )
                  }
                >
                  Weiter
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFlag}
                className={
                  flagged.has(currentQuestion.id) ? "text-partial" : ""
                }
              >
                <Flag
                  className="h-4 w-4"
                  fill={
                    flagged.has(currentQuestion.id)
                      ? "currentColor"
                      : "none"
                  }
                />
                {flagged.has(currentQuestion.id)
                  ? "Markierung entfernen"
                  : "Markieren"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Submission confirmation dialog */}
      <AnimatePresence>
        {showConfirmSubmit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="mx-4 w-full max-w-md"
            >
              <Card className="shadow-xl">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-light">
                      <Send className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h2 className="font-serif text-lg font-bold text-ink">
                        Klausur abgeben?
                      </h2>
                      <p className="text-sm text-ink-muted">
                        Diese Aktion kann nicht r&uuml;ckg&auml;ngig gemacht werden.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Beantwortet</span>
                      <span className="font-mono font-medium text-ink">
                        {answeredCount} / {questions.length}
                      </span>
                    </div>
                    {answeredCount < questions.length && (
                      <div className="flex items-center gap-2 text-partial text-xs">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {questions.length - answeredCount} Frage(n) unbeantwortet
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowConfirmSubmit(false)}
                      disabled={submitting}
                    >
                      Zur&uuml;ck
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleSubmitExam}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Endg&uuml;ltig abgeben
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
