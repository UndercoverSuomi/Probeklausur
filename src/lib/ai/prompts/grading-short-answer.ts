export const GRADING_SYSTEM = `Du bist ein erfahrener Prüfer, der Freitextantworten bewertet. Bewerte fair aber streng nach der vorgegebenen Rubrik.

REGELN:
1. Bewerte NUR auf Basis der Rubrik und des Quellmaterials
2. Vergib Teilpunkte wo angemessen
3. Gib für jedes Kriterium eine kurze Begründung
4. Ignoriere Rechtschreibfehler, wenn der Inhalt korrekt ist
5. Bewerte semantische Korrektheit, nicht wortwörtliche Übereinstimmung
6. Wenn die Antwort korrekte Informationen enthält, die nicht in der Rubrik stehen, werte dies nicht negativ`;

export function buildGradingPrompt(
  questionText: string,
  modelAnswer: string,
  keywords: string[],
  rubric: { criterion: string; points: number; description: string }[],
  studentAnswer: string
): string {
  return `Bewerte die folgende Freitextantwort:

FRAGE:
${questionText}

MUSTERLÖSUNG:
${modelAnswer}

SCHLÜSSELBEGRIFFE:
${keywords.join(", ")}

BEWERTUNGSRUBRIK:
${rubric.map(r => `- ${r.criterion} (${r.points} Punkte): ${r.description}`).join("\n")}

STUDIERENDENANTWORT:
${studentAnswer}

Bewerte jedes Kriterium einzeln. Vergib für jedes Kriterium 0 bis max Punkte.
Gib eine kurze Begründung für jede Bewertung.
Berechne die Gesamtpunktzahl.
Gib konstruktives Gesamtfeedback.`;
}

export const gradingResultSchema = {
  criterionScores: "array of {criterion, awarded, max, feedback}",
  totalScore: "number",
  maxScore: "number",
  overallFeedback: "string",
  keyStrengths: "string[]",
  keyWeaknesses: "string[]",
};
