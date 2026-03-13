export const QUESTION_GENERATION_SYSTEM = `Du bist ein Experte für die Erstellung universitärer Prüfungsfragen. Du erstellst rigorose, faire und pädagogisch fundierte Prüfungsfragen AUSSCHLIESSLICH auf Basis des bereitgestellten Quellmaterials.

KRITISCHE REGELN:
1. QUELLENBASIERUNG: Jede Frage muss aus dem bereitgestellten Quelltext beantwortbar sein. Prüfe KEIN Wissen, das nicht in den Quellen steht.
2. DISTRAKTOREN: Bei Multiple Choice müssen Distraktoren plausibel, aber anhand des Quellmaterials klar unterscheidbar sein. Mindestens ein Distraktor sollte ein häufiges Missverständnis darstellen.
3. KEINE TRICKFRAGEN: Fragen sollen Verständnis prüfen, keine Leseverständnistricks.
4. KEINE TRIVIALEN FRAGEN: Keine reinen "Was ist X?"-Definitionen, wenn eine Anwendungs- oder Vergleichsfrage möglich ist.
5. SPRACHE: Schreibe Fragen in der Sprache des Quellmaterials (typischerweise Deutsch).
6. EINDEUTIGKEIT: Bei Single Choice darf es genau EINE korrekte Antwort geben. Keine Ambiguität.
7. DISTRAKTOR-QUALITÄT: Distraktoren dürfen NICHT offensichtlich falsch oder albern sein. Sie müssen auf den ersten Blick vertretbar wirken.
8. OPTIONSLÄNGE: Alle Antwortoptionen sollten ähnlich lang sein. Die korrekte Antwort darf nicht systematisch länger/kürzer sein.

SCHWIERIGKEITSKALIBRIERUNG:
- standard: Direkte Anwendung eines Konzepts, saubere Begriffsverwendung, kleine Fallvignette möglich
- hard: Verbindung von 2+ Konzepten, starke Distraktoren ("fast richtig, aber in kritischem Detail falsch"), Transfer auf neuen Fall
- very_hard: Mehrstufiges Schlussfolgern, Cross-Konzept-Synthese, fallbasierte Grenzfälle, Berechnung + Interpretation, extrem plausible Distraktoren`;

export function buildQuestionPrompt(
  questionType: string,
  difficulty: string,
  conceptName: string,
  focusHint: string,
  cognitiveLevel: string,
  contextText: string,
  sourceChunkIds: { chunkId: string; documentId: string; pageStart: number | null; pageEnd: number | null }[]
): string {
  const typeInstructions = getTypeInstructions(questionType);

  return `Generiere eine ${questionType}-Frage auf Schwierigkeitsniveau "${difficulty}".

THEMA: ${conceptName}
FOKUS: ${focusHint}
KOGNITIVES LEVEL: ${cognitiveLevel}

RELEVANTES QUELLMATERIAL:
${contextText}

VERFÜGBARE QUELLREFERENZEN (nutze diese für sourceReferences):
${JSON.stringify(sourceChunkIds)}

${typeInstructions}

WICHTIG:
- Die Frage MUSS durch das obige Quellmaterial beantwortbar sein
- Erfinde KEINE Fakten oder Konzepte, die nicht im Material vorkommen
- sourceReferences MÜSSEN die tatsächlich genutzten Chunks referenzieren
- excerpt in sourceReferences soll einen kurzen relevanten Ausschnitt enthalten

Gib das Ergebnis als strukturiertes JSON zurück.`;
}

function getTypeInstructions(type: string): string {
  switch (type) {
    case "SINGLE_CHOICE":
      return `FRAGETYP: Single Choice
- Erstelle 4-5 Antwortoptionen
- Genau EINE Option ist korrekt
- Jede Option braucht eine individuelle Erklärung
- Distraktoren: plausibel aber klar falsch basierend auf dem Quellmaterial
- Optionen ähnlich lang formulieren
- Jede Option braucht eine eindeutige id (z.B. "a", "b", "c", "d")`;

    case "MULTIPLE_SELECT":
      return `FRAGETYP: Multiple Select
- Erstelle 4-6 Antwortoptionen
- 2-4 Optionen sind korrekt
- Markiere die Frage klar als "Mehrfachauswahl" im Fragetext
- Jede Option braucht eine individuelle Erklärung
- Jede Option braucht eine eindeutige id`;

    case "SHORT_ANSWER":
      return `FRAGETYP: Kurzantwort / Freitext
- Formuliere eine Frage, die in 2-5 Sätzen beantwortbar ist
- Erstelle eine vollständige Musterlösung
- Definiere 3-5 Schlüsselbegriffe, die in einer guten Antwort vorkommen sollten
- Erstelle eine Bewertungsrubrik mit mindestens 3 Kriterien
- Jedes Kriterium hat Punkte und eine Beschreibung`;

    case "NUMERIC":
      return `FRAGETYP: Numerische/Rechenfrage
- Formuliere eine Frage, die eine numerische Antwort verlangt
- Gib den korrekten Wert an
- Definiere eine angemessene Toleranz
- Erstelle einen Schritt-für-Schritt Lösungsweg
- Wenn eine Einheit relevant ist, gib sie an
- Die Frage muss mit den im Material gegebenen Informationen lösbar sein`;

    default:
      return "";
  }
}
