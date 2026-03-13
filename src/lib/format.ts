/**
 * Format file size in bytes to human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Format a date string to German locale.
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format a date with time.
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format time as mm:ss.
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format percentage with one decimal.
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value * 10) / 10}%`;
}

/**
 * Get a difficulty label in German.
 */
export function getDifficultyLabel(difficulty: string): string {
  switch (difficulty) {
    case "standard":
      return "Standard";
    case "hard":
      return "Schwer";
    case "very_hard":
      return "Sehr schwer";
    default:
      return difficulty;
  }
}

/**
 * Get a question type label in German.
 */
export function getQuestionTypeLabel(type: string): string {
  switch (type) {
    case "SINGLE_CHOICE":
      return "Single Choice";
    case "MULTIPLE_SELECT":
      return "Multiple Select";
    case "SHORT_ANSWER":
      return "Kurzantwort";
    case "NUMERIC":
      return "Numerisch";
    default:
      return type;
  }
}

/**
 * Get a cognitive level label in German.
 */
export function getCognitiveLevelLabel(level: string): string {
  switch (level) {
    case "recall":
      return "Wissen";
    case "discrimination":
      return "Unterscheidung";
    case "application":
      return "Anwendung";
    case "transfer":
      return "Transfer";
    case "synthesis":
      return "Synthese";
    case "calculation":
      return "Berechnung";
    case "evaluation":
      return "Evaluation";
    default:
      return level;
  }
}

/**
 * Get status label in German.
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case "uploaded":
      return "Hochgeladen";
    case "parsing":
      return "Text wird extrahiert";
    case "chunking":
      return "Text wird strukturiert";
    case "embedding":
      return "Embeddings werden erstellt";
    case "analyzing":
      return "Konzepte werden analysiert";
    case "ready":
      return "Bereit";
    case "error":
      return "Fehler";
    case "created":
      return "Erstellt";
    case "generating":
      return "Wird generiert";
    case "in_progress":
      return "In Bearbeitung";
    case "completed":
      return "Abgeschlossen";
    default:
      return status;
  }
}
