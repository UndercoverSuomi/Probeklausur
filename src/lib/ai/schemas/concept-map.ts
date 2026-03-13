import { z } from "zod";

export const conceptSchema = z.object({
  name: z.string().describe("Name des Konzepts"),
  description: z.string().describe("Kurze Beschreibung (1-2 Sätze)"),
  importanceScore: z
    .number()
    .min(0)
    .max(1)
    .describe("Wichtigkeit 0.0-1.0 für Prüfungsrelevanz"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  pageReferences: z.array(z.number()).describe("Seitenzahlen im Dokument"),
  parentConceptName: z
    .string()
    .nullable()
    .describe("Übergeordnetes Konzept, falls vorhanden"),
  relatedConcepts: z
    .array(z.string())
    .describe("Verwandte Konzepte im Dokument"),
  hasFormulas: z
    .boolean()
    .describe("Enthält das Konzept Formeln oder Berechnungen?"),
  hasCaseExamples: z
    .boolean()
    .describe("Enthält das Konzept Fallbeispiele?"),
});

export const conceptMapSchema = z.object({
  concepts: z.array(conceptSchema),
  documentSummary: z
    .string()
    .describe("Kurze Zusammenfassung des Dokuments (2-3 Sätze)"),
  mainTopics: z.array(z.string()).describe("Hauptthemen des Dokuments"),
  estimatedDifficulty: z
    .enum(["introductory", "intermediate", "advanced"])
    .describe("Geschätztes Schwierigkeitsniveau des Materials"),
});

export type ConceptMap = z.infer<typeof conceptMapSchema>;
export type Concept = z.infer<typeof conceptSchema>;
