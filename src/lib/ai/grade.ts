import { generateObject } from "ai";
import { z } from "zod";
import { getModel, getModelById } from "./provider";
import {
  GRADING_SYSTEM,
  buildGradingPrompt,
} from "./prompts/grading-short-answer";

const gradingResultSchema = z.object({
  criterionScores: z.array(
    z.object({
      criterion: z.string(),
      awarded: z.number(),
      max: z.number(),
      feedback: z.string(),
    })
  ),
  totalScore: z.number(),
  maxScore: z.number(),
  overallFeedback: z.string(),
  keyStrengths: z.array(z.string()),
  keyWeaknesses: z.array(z.string()),
});

export type GradingResult = z.infer<typeof gradingResultSchema>;

/**
 * Grade a short answer using AI.
 */
export async function gradeShortAnswer(
  questionText: string,
  modelAnswer: string,
  keywords: string[],
  rubric: { criterion: string; points: number; description: string }[],
  studentAnswer: string,
  modelId?: string | null
): Promise<GradingResult> {
  const prompt = buildGradingPrompt(
    questionText,
    modelAnswer,
    keywords,
    rubric,
    studentAnswer
  );

  const result = await generateObject({
    model: modelId ? getModelById(modelId) : getModel(),
    system: GRADING_SYSTEM,
    prompt,
    schema: gradingResultSchema,
  });

  return result.object;
}
