"use client";

import type {
  QuestionData,
  UserAnswer,
  GradeResult,
} from "@/types/exam";
import { SingleChoiceQuestion } from "./single-choice-question";
import { MultipleSelectQuestion } from "./multiple-select-question";
import { ShortAnswerQuestion } from "./short-answer-question";
import { NumericQuestion } from "./numeric-question";
import { FeedbackPanel } from "./feedback-panel";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface QuestionRendererProps {
  question: QuestionData & { id: string; points: number; questionNumber: number };
  answer: UserAnswer | null;
  onAnswer: (answer: UserAnswer) => void;
  /** Show feedback immediately (learning mode after answering) */
  showFeedback?: boolean;
  gradeResult?: GradeResult | null;
  disabled?: boolean;
  className?: string;
}

export function QuestionRenderer({
  question,
  answer,
  onAnswer,
  showFeedback = false,
  gradeResult = null,
  disabled = false,
  className,
}: QuestionRendererProps) {
  const renderQuestionInput = () => {
    switch (question.type) {
      case "SINGLE_CHOICE":
        return (
          <SingleChoiceQuestion
            options={question.options}
            selectedOptionId={
              answer?.type === "SINGLE_CHOICE"
                ? answer.selectedOptionId
                : null
            }
            onSelect={(optionId) =>
              onAnswer({ type: "SINGLE_CHOICE", selectedOptionId: optionId })
            }
            showFeedback={showFeedback}
            disabled={disabled || showFeedback}
          />
        );

      case "MULTIPLE_SELECT":
        return (
          <MultipleSelectQuestion
            options={question.options}
            selectedOptionIds={
              answer?.type === "MULTIPLE_SELECT"
                ? answer.selectedOptionIds
                : []
            }
            onToggle={(optionId) => {
              const current =
                answer?.type === "MULTIPLE_SELECT"
                  ? answer.selectedOptionIds
                  : [];
              const newIds = current.includes(optionId)
                ? current.filter((id) => id !== optionId)
                : [...current, optionId];
              onAnswer({
                type: "MULTIPLE_SELECT",
                selectedOptionIds: newIds,
              });
            }}
            showFeedback={showFeedback}
            disabled={disabled || showFeedback}
          />
        );

      case "SHORT_ANSWER":
        return (
          <ShortAnswerQuestion
            value={
              answer?.type === "SHORT_ANSWER" ? answer.answerText : ""
            }
            onChange={(text) =>
              onAnswer({ type: "SHORT_ANSWER", answerText: text })
            }
            disabled={disabled || showFeedback}
          />
        );

      case "NUMERIC":
        return (
          <NumericQuestion
            value={
              answer?.type === "NUMERIC"
                ? String(answer.numericValue)
                : ""
            }
            onChange={(val) =>
              onAnswer({
                type: "NUMERIC",
                numericValue: parseFloat(val) || 0,
              })
            }
            unit={question.unit}
            disabled={disabled || showFeedback}
          />
        );

      default:
        return (
          <p className="text-sm text-ink-muted">
            Unbekannter Fragetyp.
          </p>
        );
    }
  };

  const typeLabels: Record<string, string> = {
    SINGLE_CHOICE: "Einfachauswahl",
    MULTIPLE_SELECT: "Mehrfachauswahl",
    SHORT_ANSWER: "Freitextantwort",
    NUMERIC: "Numerisch",
  };

  return (
    <div className={cn("space-y-5", className)}>
      {/* Question header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-ink-muted">
            Frage {question.questionNumber}
          </span>
          <Badge variant="outline" className="text-[10px] px-2 py-0">
            {typeLabels[question.type] || question.type}
          </Badge>
          <Badge variant="secondary" className="text-[10px] px-2 py-0">
            {question.points} {question.points === 1 ? "Punkt" : "Punkte"}
          </Badge>
          {question.topic && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0">
              {question.topic}
            </Badge>
          )}
        </div>

        <h2 className="font-serif text-lg font-semibold leading-snug text-ink">
          {question.questionText}
        </h2>
      </div>

      {/* Question input */}
      {renderQuestionInput()}

      {/* Feedback (learning mode) */}
      {showFeedback && gradeResult && (
        <FeedbackPanel
          gradeResult={gradeResult}
          explanation={question.explanation}
          sourceReferences={question.sourceReferences}
          options={
            question.type === "SINGLE_CHOICE" || question.type === "MULTIPLE_SELECT"
              ? question.options
              : undefined
          }
          rubricBreakdown={
            gradeResult.feedback?.criterionScores as
              | { criterion: string; awarded: number; max: number; feedback: string }[]
              | undefined
          }
          modelSolution={
            question.type === "NUMERIC" ? question.modelSolution : undefined
          }
        />
      )}
    </div>
  );
}
