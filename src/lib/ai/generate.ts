import { generateObject } from "ai";
import { z } from "zod";
import type { LanguageModel } from "ai";
import { getModel, getModelById } from "./provider";
import { conceptMapSchema } from "./schemas/concept-map";
import { examBlueprintSchema } from "./schemas/blueprint";
import {
  singleChoiceSchema,
  multipleSelectSchema,
  shortAnswerSchema,
  numericSchema,
  questionValidationSchema,
} from "./schemas/question";
import {
  CONCEPT_EXTRACTION_SYSTEM,
  buildConceptExtractionPrompt,
} from "./prompts/concept-extraction";
import { BLUEPRINT_SYSTEM, buildBlueprintPrompt } from "./prompts/blueprint";
import {
  QUESTION_GENERATION_SYSTEM,
  buildQuestionPrompt,
} from "./prompts/question-generation";
import {
  VALIDATION_SYSTEM,
  buildValidationPrompt,
} from "./prompts/question-validation";
import type { Concept } from "./schemas/concept-map";
import type { BlueprintItem } from "./schemas/blueprint";

/**
 * Generate with retry and structured output.
 */
async function generateWithRetry<T>(
  system: string,
  prompt: string,
  schema: z.ZodType<T>,
  maxRetries: number = 3,
  modelOverride?: LanguageModel
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await generateObject({
        model: modelOverride ?? getModel(),
        system,
        prompt:
          attempt > 0 && lastError
            ? `${prompt}\n\nDein vorheriger Versuch hatte Validierungsfehler: ${lastError.message}. Bitte korrigiere diese.`
            : prompt,
        schema,
      });

      return result.object;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Generation attempt ${attempt + 1} failed:`, lastError.message);
    }
  }

  throw new Error(
    `Generation failed after ${maxRetries} attempts: ${lastError?.message}`
  );
}

/**
 * Extract concepts from document text.
 */
export async function extractConcepts(
  filename: string,
  pageCount: number,
  rawText: string,
  modelId?: string | null
) {
  const prompt = buildConceptExtractionPrompt(filename, pageCount, rawText);
  const model = modelId ? getModelById(modelId) : undefined;
  return generateWithRetry(CONCEPT_EXTRACTION_SYSTEM, prompt, conceptMapSchema, 3, model);
}

/**
 * Generate exam blueprint.
 */
export async function generateBlueprint(
  concepts: Concept[],
  questionCount: number,
  questionTypes: string[],
  difficulty: string,
  modelId?: string | null
) {
  const prompt = buildBlueprintPrompt(
    concepts,
    questionCount,
    questionTypes,
    difficulty
  );
  const model = modelId ? getModelById(modelId) : undefined;
  return generateWithRetry(BLUEPRINT_SYSTEM, prompt, examBlueprintSchema, 3, model);
}

/**
 * Generate a single question based on blueprint item.
 */
export async function generateQuestion(
  blueprintItem: BlueprintItem,
  contextText: string,
  sourceChunkIds: {
    chunkId: string;
    documentId: string;
    pageStart: number | null;
    pageEnd: number | null;
  }[],
  modelId?: string | null
) {
  const prompt = buildQuestionPrompt(
    blueprintItem.questionType,
    blueprintItem.difficulty,
    blueprintItem.conceptName,
    blueprintItem.focusHint,
    blueprintItem.cognitiveLevel,
    contextText,
    sourceChunkIds
  );

  const schema = getSchemaForType(blueprintItem.questionType);
  const model = modelId ? getModelById(modelId) : undefined;
  return generateWithRetry(QUESTION_GENERATION_SYSTEM, prompt, schema, 3, model);
}

/**
 * Validate a generated question.
 */
export async function validateQuestion(
  questionJson: string,
  contextText: string,
  modelId?: string | null
) {
  const prompt = buildValidationPrompt(questionJson, contextText);
  const model = modelId ? getModelById(modelId) : undefined;
  return generateWithRetry(
    VALIDATION_SYSTEM,
    prompt,
    questionValidationSchema,
    3,
    model
  );
}

function getSchemaForType(type: string): z.ZodType {
  switch (type) {
    case "SINGLE_CHOICE":
      return singleChoiceSchema;
    case "MULTIPLE_SELECT":
      return multipleSelectSchema;
    case "SHORT_ANSWER":
      return shortAnswerSchema;
    case "NUMERIC":
      return numericSchema;
    default:
      return singleChoiceSchema;
  }
}
