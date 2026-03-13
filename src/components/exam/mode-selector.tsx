"use client";

import { Clock, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface ModeOption {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const modes: ModeOption[] = [
  {
    value: "exam",
    label: "Probeprüfung",
    description: "Simuliert echte Prüfungssituation. Feedback erst am Ende.",
    icon: Clock,
  },
  {
    value: "learning",
    label: "Lernmodus",
    description: "Sofortiges Feedback nach jeder Frage.",
    icon: BookOpen,
  },
];

interface ModeSelectorProps {
  selected: string;
  onChange: (value: string) => void;
}

export function ModeSelector({ selected, onChange }: ModeSelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {modes.map((mode) => {
        const isActive = selected === mode.value;
        return (
          <button
            key={mode.value}
            type="button"
            onClick={() => onChange(mode.value)}
            className={cn(
              "flex items-start gap-4 rounded-xl border-2 p-5 text-left transition-all",
              isActive
                ? "border-accent bg-accent-light/50 shadow-sm"
                : "border-border bg-surface hover:border-border-strong hover:bg-surface-raised"
            )}
          >
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                isActive ? "bg-accent text-white" : "bg-muted text-ink-muted"
              )}
            >
              <mode.icon className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-semibold",
                  isActive ? "text-accent" : "text-ink"
                )}
              >
                {mode.label}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {mode.description}
              </p>
            </div>
            <div
              className={cn(
                "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                isActive
                  ? "border-accent bg-accent"
                  : "border-border-strong bg-surface"
              )}
            >
              {isActive && (
                <div className="h-2 w-2 rounded-full bg-white" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
