"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { QuestionOption } from "@/types/exam";

const OPTION_LETTERS = "ABCDEFGHIJKLMNOP";

interface MultipleSelectQuestionProps {
  options: QuestionOption[];
  selectedOptionIds: string[];
  onToggle: (optionId: string) => void;
  showFeedback?: boolean;
  disabled?: boolean;
}

export function MultipleSelectQuestion({
  options,
  selectedOptionIds,
  onToggle,
  showFeedback = false,
  disabled = false,
}: MultipleSelectQuestionProps) {
  const selectedSet = new Set(selectedOptionIds);

  return (
    <div className="space-y-2.5">
      <p className="text-xs font-medium text-ink-muted mb-3">
        Mehrere Antworten m&ouml;glich. W&auml;hlen Sie alle zutreffenden Optionen.
      </p>
      {options.map((option, index) => {
        const isSelected = selectedSet.has(option.id);
        const letter = OPTION_LETTERS[index] || String(index + 1);

        let feedbackStyle = "";
        if (showFeedback) {
          if (option.isCorrect && isSelected) {
            feedbackStyle = "border-correct bg-correct-light/50 ring-1 ring-correct/30";
          } else if (option.isCorrect && !isSelected) {
            feedbackStyle = "border-partial bg-partial-light/50 ring-1 ring-partial/30";
          } else if (!option.isCorrect && isSelected) {
            feedbackStyle = "border-incorrect bg-incorrect-light/50 ring-1 ring-incorrect/30";
          }
        }

        return (
          <button
            key={option.id}
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onToggle(option.id)}
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
            {/* Checkbox indicator */}
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded text-xs font-semibold transition-colors",
                !showFeedback && isSelected
                  ? "bg-accent text-white"
                  : !showFeedback
                    ? "bg-muted text-ink-muted border border-border"
                    : showFeedback && option.isCorrect && isSelected
                      ? "bg-correct text-white"
                      : showFeedback && option.isCorrect && !isSelected
                        ? "bg-partial text-white"
                        : showFeedback && !option.isCorrect && isSelected
                          ? "bg-incorrect text-white"
                          : "bg-muted text-ink-muted border border-border"
              )}
            >
              {isSelected ? (
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              ) : (
                letter
              )}
            </span>

            <span className="pt-0.5 leading-relaxed">{option.text}</span>
          </button>
        );
      })}
    </div>
  );
}
