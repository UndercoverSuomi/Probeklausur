"use client";

import { cn } from "@/lib/utils";

interface NumericQuestionProps {
  value: string;
  onChange: (value: string) => void;
  unit?: string | null;
  disabled?: boolean;
  placeholder?: string;
}

export function NumericQuestion({
  value,
  onChange,
  unit,
  disabled = false,
  placeholder = "Numerischen Wert eingeben\u2026",
}: NumericQuestionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          step="any"
          className={cn(
            "w-full max-w-xs rounded-lg border border-border bg-surface px-4 py-3 text-sm text-ink font-mono",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
            "transition-colors",
            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            disabled && "opacity-60 cursor-not-allowed bg-muted"
          )}
        />
        {unit && (
          <span className="text-sm font-medium text-ink-muted whitespace-nowrap">
            {unit}
          </span>
        )}
      </div>
      <p className="text-xs text-ink-muted">
        Geben Sie einen numerischen Wert ein. Verwenden Sie einen Punkt als Dezimaltrennzeichen.
      </p>
    </div>
  );
}
