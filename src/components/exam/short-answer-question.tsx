"use client";

import { cn } from "@/lib/utils";

interface ShortAnswerQuestionProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxLength?: number;
  placeholder?: string;
}

export function ShortAnswerQuestion({
  value,
  onChange,
  disabled = false,
  maxLength = 2000,
  placeholder = "Ihre Antwort hier eingeben\u2026",
}: ShortAnswerQuestionProps) {
  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={6}
        className={cn(
          "w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-ink",
          "placeholder:text-muted-foreground resize-y min-h-[120px]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
          "transition-colors",
          disabled && "opacity-60 cursor-not-allowed bg-muted"
        )}
      />
      <div className="flex items-center justify-between text-xs text-ink-muted">
        <span>Freitextantwort</span>
        <span className="font-mono tabular-nums">
          {value.length} / {maxLength}
        </span>
      </div>
    </div>
  );
}
