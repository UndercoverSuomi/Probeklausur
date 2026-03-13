"use client";

import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceReferences } from "./source-references";
import type { SourceReference, QuestionOption, GradeResult } from "@/types/exam";
import { motion } from "framer-motion";

interface FeedbackPanelProps {
  gradeResult: GradeResult;
  explanation: string;
  sourceReferences?: SourceReference[];
  /** For choice questions: show why wrong options are wrong */
  options?: QuestionOption[];
  /** For short answer: rubric criterion breakdown */
  rubricBreakdown?: {
    criterion: string;
    awarded: number;
    max: number;
    feedback: string;
  }[];
  /** For numeric: model solution steps */
  modelSolution?: string;
  className?: string;
}

export function FeedbackPanel({
  gradeResult,
  explanation,
  sourceReferences,
  options,
  rubricBreakdown,
  modelSolution,
  className,
}: FeedbackPanelProps) {
  const isPartial =
    !gradeResult.isCorrect && gradeResult.score > 0;

  const statusConfig = gradeResult.isCorrect
    ? {
        icon: CheckCircle2,
        label: "Richtig",
        bg: "bg-correct-light",
        border: "border-correct/20",
        text: "text-correct",
      }
    : isPartial
      ? {
          icon: MinusCircle,
          label: "Teilweise richtig",
          bg: "bg-partial-light",
          border: "border-partial/20",
          text: "text-partial",
        }
      : {
          icon: XCircle,
          label: "Falsch",
          bg: "bg-incorrect-light",
          border: "border-incorrect/20",
          text: "text-incorrect",
        };

  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-lg border",
        statusConfig.border,
        statusConfig.bg,
        className
      )}
    >
      {/* Status header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <StatusIcon
          className={cn("h-5 w-5", statusConfig.text)}
          strokeWidth={2}
        />
        <div className="flex-1">
          <p className={cn("font-semibold text-sm", statusConfig.text)}>
            {statusConfig.label}
          </p>
          <p className="text-xs text-ink-muted mt-0.5">
            {gradeResult.score} / {gradeResult.maxScore} Punkte
          </p>
        </div>
      </div>

      {/* Explanation */}
      <div className="border-t border-border/40 px-5 py-4 space-y-4">
        <div>
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1.5">
            Erkl&auml;rung
          </p>
          <p className="text-sm text-ink leading-relaxed">{explanation}</p>
        </div>

        {/* Why wrong options are wrong (for choice questions) */}
        {options && options.length > 0 && (
          <div>
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">
              Optionen im Detail
            </p>
            <div className="space-y-2">
              {options.map((option) => (
                <div
                  key={option.id}
                  className={cn(
                    "flex gap-2 rounded-md px-3 py-2 text-sm",
                    option.isCorrect
                      ? "bg-correct-light/60 text-correct"
                      : "bg-surface/60 text-ink-muted"
                  )}
                >
                  <span className="shrink-0 font-medium">
                    {option.isCorrect ? "\u2713" : "\u2717"}
                  </span>
                  <div>
                    <p className={option.isCorrect ? "font-medium" : ""}>
                      {option.text}
                    </p>
                    {option.explanation && (
                      <p className="text-xs mt-0.5 opacity-80">
                        {option.explanation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rubric breakdown for short answer */}
        {rubricBreakdown && rubricBreakdown.length > 0 && (
          <div>
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">
              Bewertungsraster
            </p>
            <div className="space-y-2">
              {rubricBreakdown.map((criterion, i) => (
                <div
                  key={i}
                  className="rounded-md bg-surface/60 px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink">
                      {criterion.criterion}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-xs",
                        criterion.awarded === criterion.max
                          ? "text-correct"
                          : criterion.awarded > 0
                            ? "text-partial"
                            : "text-incorrect"
                      )}
                    >
                      {criterion.awarded}/{criterion.max}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {criterion.feedback}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Model solution for numeric */}
        {modelSolution && (
          <div>
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1.5">
              L&ouml;sungsweg
            </p>
            <div className="rounded-md bg-surface/60 px-3 py-2.5 text-sm text-ink whitespace-pre-wrap font-mono text-xs leading-relaxed">
              {modelSolution}
            </div>
          </div>
        )}

        {/* Source references */}
        {sourceReferences && sourceReferences.length > 0 && (
          <SourceReferences sources={sourceReferences} />
        )}
      </div>
    </motion.div>
  );
}
