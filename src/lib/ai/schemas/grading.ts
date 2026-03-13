import { z } from "zod";

export const gradingResultSchema = z.object({
  criterionScores: z.array(
    z.object({
      criterion: z.string(),
      awarded: z.number().min(0),
      max: z.number().min(0),
      feedback: z.string(),
    })
  ),
  totalScore: z.number().min(0),
  maxScore: z.number().min(0),
  overallFeedback: z.string(),
  keyStrengths: z.array(z.string()),
  keyWeaknesses: z.array(z.string()),
});

export type GradingResult = z.infer<typeof gradingResultSchema>;
