import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

// ── Provider instances ──

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
});

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// ── Model registry ──

export const AI_MODELS = {
  "gpt-5.4": {
    id: "gpt-5.4",
    label: "GPT 5.4",
    provider: "openai",
    description: "OpenAI Flaggschiff-Modell",
    modelId: "gpt-5.4",
  },
  "gpt-5.3-instant": {
    id: "gpt-5.3-instant",
    label: "GPT 5.3 Instant",
    provider: "openai",
    description: "Schnelles OpenAI-Modell",
    modelId: "gpt-5.3-instant",
  },
  "claude-sonnet-4.6": {
    id: "claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
    provider: "anthropic",
    description: "Anthropic Sonnet — intelligent & schnell",
    modelId: "claude-sonnet-4-6-20250514",
  },
  "gemini-3.1-pro": {
    id: "gemini-3.1-pro",
    label: "Gemini 3.1 Pro Preview",
    provider: "google",
    description: "Google DeepMind Pro-Modell",
    modelId: "gemini-3.1-pro-preview",
  },
  "gemini-3-flash": {
    id: "gemini-3-flash",
    label: "Gemini 3 Flash",
    provider: "google",
    description: "Google DeepMind — ultraschnell",
    modelId: "gemini-3.0-flash",
  },
  "kimi-k2.5": {
    id: "kimi-k2.5",
    label: "Kimi K2.5",
    provider: "openrouter",
    description: "Moonshot AI via OpenRouter",
    modelId: "moonshotai/kimi-k2.5",
  },
  "glm-5": {
    id: "glm-5",
    label: "GLM 5",
    provider: "openrouter",
    description: "Zhipu AI via OpenRouter",
    modelId: "zhipu/glm-5",
  },
} as const;

export type ModelId = keyof typeof AI_MODELS;

export const MODEL_OPTIONS = Object.values(AI_MODELS);

export const DEFAULT_MODEL: ModelId = "claude-sonnet-4.6";

/**
 * Resolve a model ID to a Vercel AI SDK LanguageModel instance.
 */
export function getModelById(modelId?: string | null): LanguageModel {
  const id = (modelId ?? DEFAULT_MODEL) as ModelId;
  const entry = AI_MODELS[id];

  if (!entry) {
    return getModelById(DEFAULT_MODEL);
  }

  switch (entry.provider) {
    case "openai":
      return openai(entry.modelId);
    case "anthropic":
      return anthropic(entry.modelId);
    case "google":
      return google(entry.modelId);
    case "openrouter":
      return openrouter(entry.modelId);
  }
}

/** Legacy compat — uses default model or env override */
export function getModel() {
  const envModel = process.env.OPENAI_MODEL;
  if (envModel) return openai(envModel);
  return getModelById(DEFAULT_MODEL);
}

/** Small/fast model for validation, embeddings meta, etc. */
export function getSmallModel() {
  return openai("gpt-4o-mini");
}
