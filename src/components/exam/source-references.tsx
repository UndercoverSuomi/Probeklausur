"use client";

import { useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SourceReference } from "@/types/exam";

interface SourceReferencesProps {
  sources: SourceReference[];
  className?: string;
  defaultOpen?: boolean;
}

export function SourceReferences({
  sources,
  className,
  defaultOpen = false,
}: SourceReferencesProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!sources || sources.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface-raised",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-ink-muted hover:text-ink transition-colors"
      >
        <BookOpen className="h-4 w-4" strokeWidth={1.8} />
        <span>
          Quellen ({sources.length})
        </span>
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          strokeWidth={1.8}
        />
      </button>

      {isOpen && (
        <div className="border-t border-border px-4 pb-3 pt-2 space-y-3">
          {sources.map((source, index) => (
            <div
              key={source.chunkId || index}
              className="flex gap-3 text-sm"
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-ink-muted mt-0.5">
                {index + 1}
              </div>
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-ink">
                  {source.filename}
                  {source.pageStart && (
                    <span className="ml-1.5 text-ink-muted font-normal">
                      S. {source.pageStart}
                      {source.pageEnd && source.pageEnd !== source.pageStart
                        ? `\u2013${source.pageEnd}`
                        : ""}
                    </span>
                  )}
                </p>
                {source.excerpt && (
                  <p className="text-ink-muted leading-relaxed italic text-xs">
                    &ldquo;{source.excerpt}&rdquo;
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
