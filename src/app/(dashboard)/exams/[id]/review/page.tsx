"use client";

import { Suspense, useEffect, useState, use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  ArrowLeft,
  RotateCcw,
  GraduationCap,
  ChevronDown,
  BookOpen,
  BarChart3,
  Clock,
  Target,
  FileText,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SourceReferences } from "@/components/exam/source-references";
import { cn } from "@/lib/utils";
import type { QuestionOption, SourceReference } from "@/types/exam";

/* ── Types ── */

interface ReviewQuestion {
  questionId: string;
  questionIndex: number;
  questionType: string;
  difficulty: string;
  points: number;
  topic: string;
  subtopic: string;
  cognitiveLevel: string;
  questionText: string;
  explanation: string;
  options: QuestionOption[] | null;
  modelAnswer: string | null;
  correctValue: number | null;
  tolerance: number | null;
  toleranceType: string | null;
  unit: string | null;
  modelSolution: string | null;
  keywords: string[] | null;
  rubric: { criterion: string; points: number; description: string }[] | null;
  userAnswer: unknown;
  isCorrect: boolean;
  score: number;
  maxScore: number;
  feedback: Record<string, unknown> | null;
  sourceReferences: SourceReference[];
}

interface TopicAnalysis {
  topic: string;
  correct: number;
  total: number;
  score: number;
  maxScore: number;
  percentage: number;
}

interface ReviewData {
  examId: string;
  attemptId: string;
  title: string;
  mode: string;
  difficulty: string;
  score: number;
  maxScore: number;
  percentage: number;
  startedAt: string;
  completedAt: string;
  questions: ReviewQuestion[];
  topicAnalysis: TopicAnalysis[];
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
}

/* ── Helpers ── */

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

const cognitiveLevelLabels: Record<string, string> = {
  recall: "Wissen",
  discrimination: "Unterscheidung",
  application: "Anwendung",
  transfer: "Transfer",
  synthesis: "Synthese",
  calculation: "Berechnung",
  evaluation: "Bewertung",
};

function getGradeInfo(percentage: number) {
  if (percentage >= 90) return { grade: "Sehr gut", color: "text-correct" };
  if (percentage >= 75) return { grade: "Gut", color: "text-correct" };
  if (percentage >= 60) return { grade: "Befriedigend", color: "text-partial" };
  if (percentage >= 50) return { grade: "Ausreichend", color: "text-partial" };
  return { grade: "Nicht bestanden", color: "text-incorrect" };
}

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35 },
  }),
};

/* ── Main Component ── */

export default function ReviewPageWrapper({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense>
      <ReviewPage params={params} />
    </Suspense>
  );
}

function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: examId } = use(params);
  const searchParams = useSearchParams();
  const attemptId = searchParams.get("attempt");
  const router = useRouter();

  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [filterMode, setFilterMode] = useState<"all" | "incorrect" | "correct">(
    "all"
  );

  useEffect(() => {
    if (!attemptId) {
      router.replace(`/exams/${examId}`);
      return;
    }

    async function load() {
      try {
        const res = await fetch(
          `/api/exams/${examId}/attempt/${attemptId}/review`
        );
        if (!res.ok) throw new Error("Fehler beim Laden");
        const json = await res.json();
        setData(json);
      } catch {
        router.replace(`/exams/${examId}`);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [examId, attemptId, router]);

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-48 mb-8" />
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const gradeInfo = getGradeInfo(data.percentage);

  const filteredQuestions =
    filterMode === "all"
      ? data.questions
      : filterMode === "incorrect"
      ? data.questions.filter((q) => !q.isCorrect)
      : data.questions.filter((q) => q.isCorrect);

  const duration =
    data.startedAt && data.completedAt
      ? Math.round(
          (new Date(data.completedAt).getTime() -
            new Date(data.startedAt).getTime()) /
            60000
        )
      : null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 pb-20">
      {/* Back link */}
      <Link
        href={`/exams/${examId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Zur Klausur
      </Link>

      {/* ── Header Score Card ── */}
      <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={0}>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-ink to-ink/90 text-white p-8">
            <div className="flex items-start justify-between">
              <div>
                <Badge
                  variant="outline"
                  className="text-[10px] text-white/70 border-white/20 mb-3"
                >
                  {data.mode === "learning" ? "Lernmodus" : "Probeklausur"}
                  &nbsp;&middot;&nbsp;
                  {difficultyLabels[data.difficulty] || data.difficulty}
                </Badge>
                <h1 className="font-serif text-2xl font-bold">{data.title}</h1>
                <p className="mt-1 text-sm text-white/60">
                  {data.completedAt
                    ? new Date(data.completedAt).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </p>
              </div>

              <div className="text-right">
                <p className="font-mono text-5xl font-bold tabular-nums">
                  {data.percentage.toFixed(0)}%
                </p>
                <p className={cn("text-sm font-semibold mt-1", gradeInfo.color)}>
                  {gradeInfo.grade}
                </p>
              </div>
            </div>

            {/* Score bar */}
            <div className="mt-6">
              <div className="flex justify-between text-xs text-white/50 mb-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${data.percentage}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                  className={cn(
                    "h-full rounded-full",
                    data.percentage >= 70 ? "bg-correct" : data.percentage >= 50 ? "bg-partial" : "bg-incorrect"
                  )}
                />
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── Summary Stats ── */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        custom={1}
        className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4"
      >
        <Card>
          <CardContent className="flex flex-col items-center py-4">
            <Target className="h-5 w-5 text-accent mb-1.5" strokeWidth={1.8} />
            <span className="font-mono text-xl font-bold text-ink tabular-nums">
              {data.score.toFixed(1)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              von {data.maxScore} Punkten
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center py-4">
            <CheckCircle2
              className="h-5 w-5 text-correct mb-1.5"
              strokeWidth={1.8}
            />
            <span className="font-mono text-xl font-bold text-ink tabular-nums">
              {data.correctCount}
            </span>
            <span className="text-[10px] text-muted-foreground">Richtig</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center py-4">
            <XCircle
              className="h-5 w-5 text-incorrect mb-1.5"
              strokeWidth={1.8}
            />
            <span className="font-mono text-xl font-bold text-ink tabular-nums">
              {data.incorrectCount}
            </span>
            <span className="text-[10px] text-muted-foreground">Falsch</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center py-4">
            <Clock className="h-5 w-5 text-accent mb-1.5" strokeWidth={1.8} />
            <span className="font-mono text-xl font-bold text-ink tabular-nums">
              {duration ?? "—"}
            </span>
            <span className="text-[10px] text-muted-foreground">Minuten</span>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Topic Analysis ── */}
      {data.topicAnalysis.length > 0 && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          custom={2}
          className="mt-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart3
                  className="h-4 w-4 text-accent"
                  strokeWidth={1.8}
                />
                Themenanalyse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.topicAnalysis.map((topic) => (
                <div key={topic.topic} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink font-medium truncate">
                      {topic.topic}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-xs tabular-nums",
                        topic.percentage >= 70
                          ? "text-correct"
                          : topic.percentage >= 50
                          ? "text-partial"
                          : "text-incorrect"
                      )}
                    >
                      {topic.percentage.toFixed(0)}% ({topic.correct}/
                      {topic.total})
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        topic.percentage >= 70
                          ? "bg-correct"
                          : topic.percentage >= 50
                          ? "bg-partial"
                          : "bg-incorrect"
                      )}
                      style={{ width: `${topic.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Separator className="my-8" />

      {/* ── Question-by-Question Review ── */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        custom={3}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl font-bold text-ink">
            Fragen im Detail
          </h2>

          {/* Filter tabs */}
          <div className="flex rounded-lg border border-border bg-surface overflow-hidden">
            {(
              [
                { key: "all", label: "Alle" },
                { key: "incorrect", label: "Falsch" },
                { key: "correct", label: "Richtig" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterMode(tab.key)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  filterMode === tab.key
                    ? "bg-accent text-white"
                    : "text-ink-muted hover:text-ink"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredQuestions.map((q, i) => (
            <ReviewQuestionCard
              key={q.questionId}
              question={q}
              index={i}
              isExpanded={expandedQuestion === q.questionId}
              onToggle={() =>
                setExpandedQuestion(
                  expandedQuestion === q.questionId ? null : q.questionId
                )
              }
            />
          ))}

          {filteredQuestions.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Keine Fragen für diesen Filter.
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Bottom Actions ── */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        custom={4}
        className="mt-10 flex flex-col gap-3 sm:flex-row"
      >
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => router.push(`/exams/${examId}`)}
        >
          <RotateCcw className="h-4 w-4" />
          Erneut versuchen
        </Button>
        <Button
          variant="default"
          className="flex-1"
          onClick={() => router.push("/exams/new")}
        >
          <GraduationCap className="h-4 w-4" />
          Neue Klausur erstellen
        </Button>
      </motion.div>
    </div>
  );
}

/* ── Review Question Card Component ── */

function ReviewQuestionCard({
  question: q,
  index,
  isExpanded,
  onToggle,
}: {
  question: ReviewQuestion;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isPartial = !q.isCorrect && q.score > 0;

  const statusIcon = q.isCorrect
    ? CheckCircle2
    : isPartial
    ? MinusCircle
    : XCircle;
  const statusColor = q.isCorrect
    ? "text-correct"
    : isPartial
    ? "text-partial"
    : "text-incorrect";
  const StatusIcon = statusIcon;

  return (
    <Card
      className={cn(
        "transition-all",
        isExpanded && "ring-1 ring-accent/20 shadow-sm"
      )}
    >
      {/* Collapsed header */}
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-center gap-3"
      >
        <StatusIcon className={cn("h-5 w-5 shrink-0", statusColor)} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink truncate">
            <span className="text-ink-muted mr-1.5">
              {q.questionIndex + 1}.
            </span>
            {q.questionText}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {typeLabels[q.questionType] || q.questionType}
            </Badge>
            {q.topic && (
              <span className="text-[10px] text-muted-foreground">
                {q.topic}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span
            className={cn(
              "font-mono text-sm font-semibold tabular-nums",
              q.isCorrect
                ? "text-correct"
                : q.score > 0
                ? "text-partial"
                : "text-incorrect"
            )}
          >
            {q.score}/{q.maxScore}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-ink-muted transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <Separator />
            <div className="px-5 py-5 space-y-5">
              {/* Full question text */}
              <div>
                <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1.5">
                  Fragestellung
                </p>
                <p className="text-sm text-ink leading-relaxed font-serif">
                  {q.questionText}
                </p>
              </div>

              {/* Metadata badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {difficultyLabels[q.difficulty] || q.difficulty}
                </Badge>
                {q.cognitiveLevel && (
                  <Badge variant="secondary" className="text-[10px]">
                    {cognitiveLevelLabels[q.cognitiveLevel] ||
                      q.cognitiveLevel}
                  </Badge>
                )}
                {q.subtopic && (
                  <Badge variant="outline" className="text-[10px]">
                    {q.subtopic}
                  </Badge>
                )}
              </div>

              {/* User's answer vs correct */}
              {q.questionType === "SINGLE_CHOICE" && q.options && (
                <ChoiceReview
                  options={q.options}
                  userAnswer={q.userAnswer}
                  isMultiple={false}
                />
              )}
              {q.questionType === "MULTIPLE_SELECT" && q.options && (
                <ChoiceReview
                  options={q.options}
                  userAnswer={q.userAnswer}
                  isMultiple={true}
                />
              )}
              {q.questionType === "SHORT_ANSWER" && (
                <ShortAnswerReview
                  userAnswer={q.userAnswer}
                  modelAnswer={q.modelAnswer}
                  feedback={q.feedback}
                />
              )}
              {q.questionType === "NUMERIC" && (
                <NumericReview
                  userAnswer={q.userAnswer}
                  correctValue={q.correctValue}
                  tolerance={q.tolerance}
                  toleranceType={q.toleranceType}
                  unit={q.unit}
                  modelSolution={q.modelSolution}
                />
              )}

              {/* Explanation */}
              {q.explanation && (
                <div>
                  <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1.5">
                    Erklärung
                  </p>
                  <p className="text-sm text-ink leading-relaxed">
                    {q.explanation}
                  </p>
                </div>
              )}

              {/* Sources */}
              {q.sourceReferences && q.sourceReferences.length > 0 && (
                <SourceReferences sources={q.sourceReferences} defaultOpen />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/* ── Choice Review ── */

function ChoiceReview({
  options,
  userAnswer,
  isMultiple,
}: {
  options: QuestionOption[];
  userAnswer: unknown;
  isMultiple: boolean;
}) {
  const selectedIds = isMultiple
    ? ((userAnswer as { selectedOptionIds?: string[] })?.selectedOptionIds || [])
    : [
        (userAnswer as { selectedOptionId?: string })?.selectedOptionId || "",
      ].filter(Boolean);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">
        Antwortoptionen
      </p>
      {options.map((opt) => {
        const wasSelected = selectedIds.includes(opt.id);
        const isCorrectOption = opt.isCorrect;

        return (
          <div
            key={opt.id}
            className={cn(
              "flex items-start gap-2.5 rounded-md px-3 py-2.5 text-sm border",
              isCorrectOption && wasSelected
                ? "bg-correct-light border-correct/20"
                : isCorrectOption && !wasSelected
                ? "bg-correct-light/50 border-correct/10"
                : !isCorrectOption && wasSelected
                ? "bg-incorrect-light border-incorrect/20"
                : "bg-surface border-border/50"
            )}
          >
            <span className="shrink-0 mt-0.5">
              {isCorrectOption ? (
                <CheckCircle2 className="h-4 w-4 text-correct" />
              ) : wasSelected ? (
                <XCircle className="h-4 w-4 text-incorrect" />
              ) : (
                <span className="block h-4 w-4 rounded-full border border-border-strong" />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm",
                  isCorrectOption
                    ? "font-medium text-correct"
                    : wasSelected
                    ? "text-incorrect"
                    : "text-ink-muted"
                )}
              >
                {opt.text}
                {wasSelected && (
                  <span className="ml-2 text-[10px] font-normal text-ink-muted">
                    (Deine Wahl)
                  </span>
                )}
              </p>
              {opt.explanation && (
                <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                  {opt.explanation}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Short Answer Review ── */

function ShortAnswerReview({
  userAnswer,
  modelAnswer,
  feedback,
}: {
  userAnswer: unknown;
  modelAnswer: string | null;
  feedback: Record<string, unknown> | null;
}) {
  const answerText =
    (userAnswer as { answerText?: string })?.answerText || "(Keine Antwort)";

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1.5">
          Deine Antwort
        </p>
        <div className="rounded-md bg-muted px-3 py-2.5 text-sm text-ink whitespace-pre-wrap">
          {answerText}
        </div>
      </div>

      {modelAnswer && (
        <div>
          <p className="text-xs font-medium text-correct uppercase tracking-wide mb-1.5">
            Musterlösung
          </p>
          <div className="rounded-md bg-correct-light px-3 py-2.5 text-sm text-ink whitespace-pre-wrap">
            {modelAnswer}
          </div>
        </div>
      )}

      {/* Rubric breakdown */}
      {feedback?.criterionScores != null &&
        Array.isArray(feedback.criterionScores) && (
          <div>
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">
              Bewertungsraster
            </p>
            <div className="space-y-2">
              {(
                feedback.criterionScores as {
                  criterion: string;
                  awarded: number;
                  max: number;
                  feedback: string;
                }[]
              ).map((cs, i) => (
                <div
                  key={i}
                  className="rounded-md bg-surface border border-border/50 px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink">
                      {cs.criterion}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-xs",
                        cs.awarded === cs.max
                          ? "text-correct"
                          : cs.awarded > 0
                          ? "text-partial"
                          : "text-incorrect"
                      )}
                    >
                      {cs.awarded}/{cs.max}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {cs.feedback}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      {feedback?.overallFeedback != null && (
        <div>
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1.5">
            Gesamtfeedback
          </p>
          <p className="text-sm text-ink leading-relaxed">
            {String(feedback.overallFeedback)}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Numeric Review ── */

function NumericReview({
  userAnswer,
  correctValue,
  tolerance,
  toleranceType,
  unit,
  modelSolution,
}: {
  userAnswer: unknown;
  correctValue: number | null;
  tolerance: number | null;
  toleranceType: string | null;
  unit: string | null;
  modelSolution: string | null;
}) {
  const givenValue =
    (userAnswer as { numericValue?: number })?.numericValue ?? null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1.5">
            Deine Antwort
          </p>
          <div className="rounded-md bg-muted px-3 py-2.5 text-sm font-mono text-ink">
            {givenValue != null ? givenValue : "—"}
            {unit && <span className="ml-1 text-ink-muted">{unit}</span>}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-correct uppercase tracking-wide mb-1.5">
            Korrekte Antwort
          </p>
          <div className="rounded-md bg-correct-light px-3 py-2.5 text-sm font-mono text-ink">
            {correctValue != null ? correctValue : "—"}
            {unit && <span className="ml-1 text-ink-muted">{unit}</span>}
            {tolerance != null && (
              <span className="ml-1.5 text-xs text-ink-muted">
                (±{tolerance}
                {toleranceType === "percentage" ? "%" : ""})
              </span>
            )}
          </div>
        </div>
      </div>

      {modelSolution && (
        <div>
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1.5">
            Lösungsweg
          </p>
          <div className="rounded-md bg-surface border border-border/50 px-3 py-2.5 text-sm font-mono text-ink whitespace-pre-wrap leading-relaxed text-xs">
            {modelSolution}
          </div>
        </div>
      )}
    </div>
  );
}
