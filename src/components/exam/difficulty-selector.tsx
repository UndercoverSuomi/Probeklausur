"use client";

import { cn } from "@/lib/utils";

interface DifficultyOption {
  value: string;
  label: string;
  description: string;
}

const difficulties: DifficultyOption[] = [
  {
    value: "standard",
    label: "Standard",
    description: "Master-Niveau, Konzeptverständnis",
  },
  {
    value: "hard",
    label: "Schwer",
    description: "Cross-Konzept, starke Distraktoren",
  },
  {
    value: "very_hard",
    label: "Sehr schwer",
    description: "Mehrstufig, Synthese, Grenzfälle",
  },
];

interface DifficultySelectorProps {
  selected: string;
  onChange: (value: string) => void;
}

export function DifficultySelector({
  selected,
  onChange,
}: DifficultySelectorProps) {
  return (
    <div className="flex rounded-xl border-2 border-border bg-surface p-1">
      {difficulties.map((diff) => {
        const isActive = selected === diff.value;
        return (
          <button
            key={diff.value}
            type="button"
            onClick={() => onChange(diff.value)}
            className={cn(
              "relative flex flex-1 flex-col items-center rounded-lg px-3 py-3 transition-all",
              isActive
                ? "bg-accent text-white shadow-sm"
                : "text-ink-muted hover:bg-muted hover:text-ink"
            )}
          >
            <span
              className={cn(
                "text-sm font-semibold",
                isActive ? "text-white" : "text-ink"
              )}
            >
              {diff.label}
            </span>
            <span
              className={cn(
                "mt-0.5 text-center text-[11px] leading-tight",
                isActive ? "text-white/80" : "text-muted-foreground"
              )}
            >
              {diff.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
