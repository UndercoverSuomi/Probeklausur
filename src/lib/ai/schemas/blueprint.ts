import { z } from "zod";

export const blueprintItemSchema = z.object({
  questionIndex: z.number(),
  conceptName: z.string(),
  secondaryConceptName: z
    .string()
    .nullable()
    .describe("Zweites Konzept für schwierige Fragen"),
  questionType: z.enum([
    "SINGLE_CHOICE",
    "MULTIPLE_SELECT",
    "SHORT_ANSWER",
    "NUMERIC",
  ]),
  difficulty: z.enum(["standard", "hard", "very_hard"]),
  cognitiveLevel: z.enum([
    "recall",
    "discrimination",
    "application",
    "transfer",
    "synthesis",
    "calculation",
    "evaluation",
  ]),
  points: z.number(),
  focusHint: z
    .string()
    .describe("Spezifischer Fokus: was genau soll geprüft werden"),
});

export const examBlueprintSchema = z.object({
  items: z.array(blueprintItemSchema),
  totalPoints: z.number(),
  conceptCoverage: z
    .record(z.string(), z.number())
    .describe("Konzept -> Anzahl Fragen"),
  difficultyDistribution: z.object({
    standard: z.number(),
    hard: z.number(),
    very_hard: z.number(),
  }),
  typeDistribution: z.record(z.string(), z.number()),
});

export type ExamBlueprint = z.infer<typeof examBlueprintSchema>;
export type BlueprintItem = z.infer<typeof blueprintItemSchema>;
