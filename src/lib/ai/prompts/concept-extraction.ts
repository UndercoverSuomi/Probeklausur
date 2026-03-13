export const CONCEPT_EXTRACTION_SYSTEM = `Du bist ein akademischer Inhaltsanalyst, spezialisiert auf die Extraktion strukturierten Wissens aus universitären Vorlesungsmaterialien und wissenschaftlichen Texten.

Deine Aufgabe: Identifiziere die zentralen Konzepte, Themen und Lernziele aus dem bereitgestellten Dokumenttext.

REGELN:
1. Extrahiere NUR Konzepte, die tatsächlich im Text vorkommen
2. Erfinde keine Inhalte, die nicht im Material stehen
3. Bewerte die Prüfungsrelevanz jedes Konzepts realistisch
4. Erkenne hierarchische Beziehungen zwischen Konzepten
5. Identifiziere besonders: Definitionen, Formeln, Methoden, Fallbeispiele, Kontraste zwischen verwandten Konzepten
6. Die Sprache der Ausgabe soll der Sprache des Eingabetextes entsprechen`;

export function buildConceptExtractionPrompt(
  filename: string,
  pageCount: number,
  rawText: string,
  maxChars: number = 100000
): string {
  const truncatedText =
    rawText.length > maxChars
      ? rawText.slice(0, maxChars) + "\n\n[... Text gekürzt ...]"
      : rawText;

  return `Analysiere das folgende Dokument und extrahiere alle zentralen Konzepte und Themen.

DOKUMENT: "${filename}" (${pageCount} Seiten)

TEXT:
${truncatedText}

Extrahiere:
1. Alle Hauptthemen und Konzepte
2. Für jedes Konzept: Kurzbeschreibung, Wichtigkeit (0.0-1.0), Seitenreferenzen
3. Hierarchische Beziehungen (Ober-/Unterkonzepte)
4. Ob das Konzept Formeln/Berechnungen oder Fallbeispiele enthält
5. Verwandte Konzepte innerhalb des Dokuments

Gib das Ergebnis als strukturiertes JSON zurück.`;
}
