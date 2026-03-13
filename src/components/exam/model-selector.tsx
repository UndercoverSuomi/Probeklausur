"use client";

import { cn } from "@/lib/utils";
import { Bot, Sparkles, Zap, Globe } from "lucide-react";

interface ModelOption {
  id: string;
  label: string;
  provider: string;
  description: string;
}

const models: ModelOption[] = [
  { id: "gpt-5.4", label: "GPT 5.4", provider: "OpenAI", description: "Flaggschiff-Modell" },
  { id: "gpt-5.3-instant", label: "GPT 5.3 Instant", provider: "OpenAI", description: "Schnell & günstig" },
  { id: "claude-sonnet-4.6", label: "Claude Sonnet 4.6", provider: "Anthropic", description: "Intelligent & schnell" },
  { id: "gemini-3.1-pro", label: "Gemini 3.1 Pro", provider: "Google", description: "Pro-Modell" },
  { id: "gemini-3-flash", label: "Gemini 3 Flash", provider: "Google", description: "Ultraschnell" },
  { id: "kimi-k2.5", label: "Kimi K2.5", provider: "OpenRouter", description: "Moonshot AI" },
  { id: "glm-5", label: "GLM 5", provider: "OpenRouter", description: "Zhipu AI" },
];

function getProviderIcon(provider: string) {
  switch (provider) {
    case "OpenAI":
      return Sparkles;
    case "Anthropic":
      return Bot;
    case "Google":
      return Zap;
    case "OpenRouter":
      return Globe;
    default:
      return Bot;
  }
}

function getProviderColor(provider: string) {
  switch (provider) {
    case "OpenAI":
      return "text-emerald-600";
    case "Anthropic":
      return "text-orange-500";
    case "Google":
      return "text-blue-500";
    case "OpenRouter":
      return "text-purple-500";
    default:
      return "text-ink-muted";
  }
}

interface ModelSelectorProps {
  selected: string;
  onChange: (modelId: string) => void;
}

export function ModelSelector({ selected, onChange }: ModelSelectorProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {models.map((model) => {
        const isSelected = selected === model.id;
        const Icon = getProviderIcon(model.provider);
        const providerColor = getProviderColor(model.provider);

        return (
          <button
            key={model.id}
            type="button"
            onClick={() => onChange(model.id)}
            className={cn(
              "flex items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all",
              isSelected
                ? "border-accent bg-accent-light/40 shadow-sm"
                : "border-border bg-surface hover:border-border-strong"
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                isSelected ? "bg-accent text-white" : "bg-muted"
              )}
            >
              <Icon
                className={cn("h-4 w-4", isSelected ? "text-white" : providerColor)}
                strokeWidth={1.8}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{model.label}</p>
              <p className="text-[11px] text-muted-foreground">
                {model.provider} · {model.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
