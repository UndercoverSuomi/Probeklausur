export const VALIDATION_SYSTEM = `Du bist ein Qualitätsprüfer für Prüfungsfragen. Bewerte die folgende Frage auf Qualität, Quellenbasierung und Eindeutigkeit.

Prüfe:
1. Ist die Frage durch das bereitgestellte Quellmaterial beantwortbar?
2. Bei Multiple Choice: Sind die Distraktoren plausibel aber klar unterscheidbar?
3. Ist das Schwierigkeitslabel akkurat?
4. Ist die Frage eindeutig formuliert?
5. Ist die Erklärung korrekt und hilfreich?
6. Gibt es möglicherweise mehrere vertretbare korrekte Antworten?
7. Ist die Frage nicht-trivial?

Sei streng aber fair in deiner Bewertung.`;

export function buildValidationPrompt(
  questionJson: string,
  contextText: string
): string {
  return `Bewerte die Qualität dieser Prüfungsfrage:

FRAGE:
${questionJson}

QUELLMATERIAL (auf dem die Frage basieren soll):
${contextText}

Gib eine detaillierte Qualitätsbewertung als strukturiertes JSON zurück.
- qualityScore: 0.0-1.0 (unter 0.6 = Frage sollte ersetzt werden)
- isSourceGrounded: Ist die Frage durch das Material gedeckt?
- isUnambiguous: Ist die korrekte Antwort eindeutig?
- isNonTrivial: Ist die Frage anspruchsvoll genug?
- issues: Liste konkreter Probleme
- suggestions: Verbesserungsvorschläge`;
}
