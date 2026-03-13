"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  className?: string;
  showValue?: boolean;
}

export function Slider({
  min,
  max,
  step = 1,
  value,
  onChange,
  className,
  showValue = true,
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="relative flex-1">
        <div className="relative h-2 rounded-full bg-muted">
          <div
            className="absolute h-2 rounded-full bg-accent"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(
            "absolute inset-0 h-2 w-full cursor-pointer appearance-none bg-transparent",
            "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent",
            "[&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:shadow-sm",
            "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110",
            "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:appearance-none",
            "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-accent",
            "[&::-moz-range-thumb]:bg-surface [&::-moz-range-thumb]:shadow-sm"
          )}
        />
      </div>
      {showValue && (
        <span className="min-w-[3ch] text-right font-mono text-sm font-semibold text-ink">
          {value}
        </span>
      )}
    </div>
  );
}
