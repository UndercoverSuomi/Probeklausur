"use client";

import { cn } from "@/lib/utils";
import { Flag } from "lucide-react";

export type QuestionStatus = "unanswered" | "answered" | "flagged" | "current";

interface QuestionNavProps {
  questionCount: number;
  currentIndex: number;
  statuses: QuestionStatus[];
  onNavigate: (index: number) => void;
  className?: string;
}

export function QuestionNav({
  questionCount,
  currentIndex,
  statuses,
  onNavigate,
  className,
}: QuestionNavProps) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {Array.from({ length: questionCount }, (_, i) => {
        const status = statuses[i] || "unanswered";
        const isCurrent = i === currentIndex;

        return (
          <button
            key={i}
            onClick={() => onNavigate(i)}
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-md text-xs font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
              isCurrent && "ring-2 ring-accent ring-offset-1 font-bold",
              status === "unanswered" &&
                !isCurrent &&
                "border border-border bg-surface text-ink-muted hover:bg-muted",
              status === "answered" &&
                !isCurrent &&
                "bg-accent-light text-accent border border-accent/20",
              status === "flagged" &&
                !isCurrent &&
                "bg-partial-light text-partial border border-partial/20",
              isCurrent &&
                status === "unanswered" &&
                "bg-surface text-ink border border-accent",
              isCurrent &&
                status === "answered" &&
                "bg-accent text-white",
              isCurrent &&
                status === "flagged" &&
                "bg-partial text-white"
            )}
            aria-label={`Frage ${i + 1}${isCurrent ? " (aktuell)" : ""}${
              status === "flagged" ? " (markiert)" : ""
            }`}
            title={`Frage ${i + 1}`}
          >
            {i + 1}
            {status === "flagged" && (
              <Flag
                className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 text-partial"
                fill="currentColor"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
