"use client";

import { useEffect, useState, useCallback } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExamTimerProps {
  /** Total time in seconds */
  totalSeconds: number;
  /** Called when timer reaches zero */
  onTimeUp?: () => void;
  /** Whether timer is running */
  isRunning?: boolean;
  className?: string;
}

export function ExamTimer({
  totalSeconds,
  onTimeUp,
  isRunning = true,
  className,
}: ExamTimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    if (!isRunning || remaining <= 0) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, remaining, onTimeUp]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isWarning = remaining > 0 && remaining <= 300; // 5 min
  const isCritical = remaining > 0 && remaining <= 60; // 1 min

  const formatTime = useCallback(() => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}:${mins.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }, [minutes, seconds]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-sm tabular-nums transition-colors",
        isCritical
          ? "border-incorrect bg-incorrect-light text-incorrect animate-pulse"
          : isWarning
            ? "border-partial bg-partial-light text-partial"
            : "border-border bg-surface text-ink-muted",
        className
      )}
    >
      <Clock
        className={cn(
          "h-4 w-4",
          isCritical
            ? "text-incorrect"
            : isWarning
              ? "text-partial"
              : "text-ink-muted"
        )}
        strokeWidth={1.8}
      />
      <span>{formatTime()}</span>
    </div>
  );
}
