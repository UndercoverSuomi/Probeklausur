import { z } from "zod";

const sourceReferenceSchema = z.object({
  chunkId: z.string(),
  documentId: z.string(),
  pageStart: z.number().nullable(),
  pageEnd: z.number().nullable(),
  excerpt: z.string().describe("Kurzer relevanter Ausschnitt aus der Quelle"),
});

const optionSchema = z.object({
  id: z.string(),
  text: z.string(),
  isCorrect: z.boolean(),
  explanation: z
    .string()
    .describe("Warum diese Option richtig/falsch ist"),
});

const rubricCriterionSchema = z.object({
  criterion: z.string(),
  points: z.number(),
  description: z.string().describe("Was für volle Punktzahl erforderlich ist"),
});

export const singleChoiceSchema = z.object({
  questionText: z.string(),
  options: z
    .array(optionSchema)
    .min(4)
    .max(5)
    .describe("4-5 Antwortoptionen, genau eine korrekt"),
  explanation: z.string().describe("Gesamterklärung der korrekten Antwort"),
  cognitiveLevel: z.enum([
    "recall", "discrimination", "application", "transfer",
    "synthesis", "calculation", "evaluation",
  ]),
  topic: z.string(),
  subtopic: z.string(),
  sourceReferences: z.array(sourceReferenceSchema),
});

export const multipleSelectSchema = z.object({
  questionText: z.string(),
  options: z
    .array(optionSchema)
    .min(4)
    .max(6)
    .describe("4-6 Optionen, mehrere können korrekt sein"),
  explanation: z.string(),
  cognitiveLevel: z.enum([
    "recall", "discrimination", "application", "transfer",
    "synthesis", "calculation", "evaluation",
  ]),
  topic: z.string(),
  subtopic: z.string(),
  sourceReferences: z.array(sourceReferenceSchema),
});

export const shortAnswerSchema = z.object({
  questionText: z.string(),
  modelAnswer: z.string().describe("Vollständige Musterlösung"),
  keywords: z
    .array(z.string())
    .describe("Schlüsselbegriffe die in einer guten Antwort vorkommen sollten"),
  rubric: z
    .array(rubricCriterionSchema)
    .describe("Bewertungsrubrik mit Kriterien und Punkten"),
  explanation: z.string(),
  cognitiveLevel: z.enum([
    "recall", "discrimination", "application", "transfer",
    "synthesis", "calculation", "evaluation",
  ]),
  topic: z.string(),
  subtopic: z.string(),
  sourceReferences: z.array(sourceReferenceSchema),
});

export const numericSchema = z.object({
  questionText: z.string(),
  correctValue: z.number(),
  tolerance: z.number().describe("Erlaubte Abweichung"),
  toleranceType: z.enum(["absolute", "percentage"]),
  unit: z.string().nullable(),
  modelSolution: z
    .string()
    .describe("Schritt-für-Schritt Lösungsweg"),
  explanation: z.string(),
  cognitiveLevel: z.enum([
    "recall", "discrimination", "application", "transfer",
    "synthesis", "calculation", "evaluation",
  ]),
  topic: z.string(),
  subtopic: z.string(),
  sourceReferences: z.array(sourceReferenceSchema),
});

export const questionValidationSchema = z.object({
  qualityScore: z
    .number()
    .min(0)
    .max(1)
    .describe("Gesamtqualität 0.0-1.0"),
  isSourceGrounded: z.boolean(),
  isUnambiguous: z.boolean(),
  isNonTrivial: z.boolean(),
  distractorQuality: z
    .enum(["poor", "acceptable", "good", "excellent"])
    .nullable(),
  issues: z.array(z.string()).describe("Gefundene Probleme"),
  suggestions: z.array(z.string()).describe("Verbesserungsvorschläge"),
});

export type QuestionValidation = z.infer<typeof questionValidationSchema>;
