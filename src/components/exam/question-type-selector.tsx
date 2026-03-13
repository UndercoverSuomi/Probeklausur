"use client";

import { CheckCircle2, CheckSquare, PenLine, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface QuestionTypeOption {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const questionTypes: QuestionTypeOption[] = [
  {
    value: "SINGLE_CHOICE",
    label: "Single Choice",
    description: "Eine richtige Antwort aus mehreren Optionen",
    icon: CheckCircle2,
  },
  {
    value: "MULTIPLE_SELECT",
    label: "Multiple Select",
    description: "Mehrere richtige Antworten auswählen",
    icon: CheckSquare,
  },
  {
    value: "SHORT_ANSWER",
    label: "Kurzantwort",
    description: "Freitext-Antwort mit Bewertungskriterien",
    icon: PenLine,
  },
  {
    value: "NUMERIC",
    label: "Numerisch",
    description: "Berechnungen mit Toleranzbereich",
    icon: Calculator,
  },
];

interface QuestionTypeSelectorProps {
  selected: string[];
  onChange: (types: string[]) => void;
}

export function QuestionTypeSelector({
  selected,
  onChange,
}: QuestionTypeSelectorProps) {
  function toggle(value: string) {
    if (selected.includes(value)) {
      // Don't allow deselecting the last one
      if (selected.length > 1) {
        onChange(selected.filter((v) => v !== value));
      }
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {questionTypes.map((qt) => {
        const isSelected = selected.includes(qt.value);
        return (
          <button
            key={qt.value}
            type="button"
            onClick={() => toggle(qt.value)}
            className={cn(
              "flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all",
              isSelected
                ? "border-accent bg-accent-light/50 shadow-sm"
                : "border-border bg-surface hover:border-border-strong hover:bg-surface-raised"
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                isSelected ? "bg-accent text-white" : "bg-muted text-ink-muted"
              )}
            >
              <qt.icon className="h-4.5 w-4.5" strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-semibold",
                  isSelected ? "text-accent" : "text-ink"
                )}
              >
                {qt.label}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                {qt.description}
              </p>
            </div>
            <div
              className={cn(
                "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all",
                isSelected
                  ? "border-accent bg-accent"
                  : "border-border-strong bg-surface"
              )}
            >
              {isSelected && (
                <svg
                  className="h-3 w-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
