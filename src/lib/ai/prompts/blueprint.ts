import type { Concept } from "../schemas/concept-map";

export const BLUEPRINT_SYSTEM = `Du bist ein Prüfungsarchitekt. Gegeben sind Konzepte mit Wichtigkeitsbewertungen und eine gewünschte Prüfungskonfiguration. Erstelle einen detaillierten Prüfungsblueprint.

REGELN:
1. Verteile Fragen proportional zur Konzeptwichtigkeit
2. Jedes Konzept mit Wichtigkeit >= 0.3 sollte mindestens 1 Frage haben
3. Schwierige Fragen (hard/very_hard) sollen Verbindungen zwischen Konzepten testen
4. Punkteverteilung: standard=1, hard=2, very_hard=3
5. Fragetypen gleichmäßig über erlaubte Typen verteilen
6. SHORT_ANSWER und NUMERIC bevorzugt bei hard/very_hard
7. Bei "very_hard": Cross-Konzept-Synthese, mehrstufiges Schlussfolgern, fallbasierte Analyse
8. Mindestens 25-40% der Fragen sollten Anwendung/Transfer/Interpretation testen
9. Wenn das Material Formeln enthält: mindestens 1-3 numerische/rechnerische Fragen einplanen

SCHWIERIGKEITSHEURISTIK:
- standard: 1 Konzept, saubere Abgrenzung, moderate Distraktoren, Anwendung > Reproduktion
- hard: 2+ Konzepte, hohe Distraktorähnlichkeit, Fallbezug, methodische Entscheidung
- very_hard: Cross-Topic/Cross-Document, mehrstufige Logik, Berechnung+Interpretation, extrem plausible Distraktoren`;

export function buildBlueprintPrompt(
  concepts: Concept[],
  questionCount: number,
  questionTypes: string[],
  difficulty: string
): string {
  const difficultyDistribution = getDifficultyDistribution(difficulty, questionCount);

  return `Erstelle einen Prüfungsblueprint für folgende Konfiguration:

KONZEPTE (aus hochgeladenen Dokumenten):
${JSON.stringify(concepts.map(c => ({
  name: c.name,
  importance: c.importanceScore,
  difficulty: c.difficulty,
  hasFormulas: c.hasFormulas,
  hasCaseExamples: c.hasCaseExamples,
  relatedConcepts: c.relatedConcepts,
})), null, 2)}

PRÜFUNGSKONFIGURATION:
- Gesamtanzahl Fragen: ${questionCount}
- Erlaubte Fragetypen: ${questionTypes.join(", ")}
- Schwierigkeitsverteilung:
  - Standard: ${difficultyDistribution.standard} Fragen
  - Schwer: ${difficultyDistribution.hard} Fragen
  - Sehr schwer: ${difficultyDistribution.very_hard} Fragen

ANFORDERUNGEN:
1. Jede Frage braucht einen spezifischen focusHint (was genau geprüft wird)
2. hard/very_hard Fragen sollen secondaryConceptName nutzen
3. Kognitive Level variieren: nicht nur "recall"
4. Bei Konzepten mit Formeln: NUMERIC-Fragen einplanen
5. Bei Konzepten mit Fallbeispielen: APPLICATION/TRANSFER-Fragen einplanen
6. Themenbreite sicherstellen

Gib das Ergebnis als strukturiertes JSON zurück.`;
}

function getDifficultyDistribution(
  difficulty: string,
  questionCount: number
): { standard: number; hard: number; very_hard: number } {
  switch (difficulty) {
    case "very_hard":
      return {
        standard: Math.round(questionCount * 0.1),
        hard: Math.round(questionCount * 0.4),
        very_hard: Math.round(questionCount * 0.5),
      };
    case "hard":
      return {
        standard: Math.round(questionCount * 0.2),
        hard: Math.round(questionCount * 0.5),
        very_hard: Math.round(questionCount * 0.3),
      };
    default: // standard
      return {
        standard: Math.round(questionCount * 0.4),
        hard: Math.round(questionCount * 0.4),
        very_hard: Math.round(questionCount * 0.2),
      };
  }
}
