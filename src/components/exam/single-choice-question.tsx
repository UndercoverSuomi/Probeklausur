"use client";

import { cn } from "@/lib/utils";
import type { QuestionOption } from "@/types/exam";

const OPTION_LETTERS = "ABCDEFGHIJKLMNOP";

interface SingleChoiceQuestionProps {
  options: QuestionOption[];
  selectedOptionId: string | null;
  onSelect: (optionId: string) => void;
  /** Show correct/incorrect indicators (learning mode after submission) */
  showFeedback?: boolean;
  disabled?: boolean;
}

export function SingleChoiceQuestion({
  options,
  selectedOptionId,
  onSelect,
  showFeedback = false,
  disabled = false,
}: SingleChoiceQuestionProps) {
  return (
    <div className="space-y-2.5" role="radiogroup">
      {options.map((option, index) => {
        const isSelected = selectedOptionId === option.id;
        const letter = OPTION_LETTERS[index] || String(index + 1);

        let feedbackStyle = "";
        if (showFeedback) {
          if (option.isCorrect) {
            feedbackStyle = "border-correct bg-correct-light/50 ring-1 ring-correct/30";
          } else if (isSelected && !option.isCorrect) {
            feedbackStyle = "border-incorrect bg-incorrect-light/50 ring-1 ring-incorrect/30";
          }
        }

        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onSelect(option.id)}
            className={cn(
              "flex w-full items-start gap-3 rounded-lg border px-4 py-3.5 text-left text-sm transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
              !showFeedback && !disabled && "hover:bg-accent-light/30 hover:border-accent/30",
              !showFeedback && isSelected
                ? "border-accent bg-accent-light/40 ring-1 ring-accent/30"
                : !showFeedback && "border-border bg-surface",
              showFeedback && feedbackStyle,
              showFeedback && !feedbackStyle && "border-border bg-surface opacity-60",
              disabled && "cursor-default"
            )}
          >
            {/* Letter circle */}
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                !showFeedback && isSelected
                  ? "bg-accent text-white"
                  : !showFeedback
                    ? "bg-muted text-ink-muted"
                    : showFeedback && option.isCorrect
                      ? "bg-correct text-white"
                      : showFeedback && isSelected && !option.isCorrect
                        ? "bg-incorrect text-white"
                        : "bg-muted text-ink-muted"
              )}
            >
              {letter}
            </span>

            <span className="pt-0.5 leading-relaxed">{option.text}</span>
          </button>
        );
      })}
    </div>
  );
}
