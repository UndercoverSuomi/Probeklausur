import type { ParsedPage, DocumentChunkData } from "@/types/document";

interface ChunkerConfig {
  maxChunkTokens: number;
  overlapTokens: number;
  minChunkTokens: number;
}

const DEFAULT_CONFIG: ChunkerConfig = {
  maxChunkTokens: 800,
  overlapTokens: 150,
  minChunkTokens: 50,
};

// Rough token estimation: ~4 chars per token for German/English mixed text
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Detect section headings in text.
 * Heuristic: short lines (< 100 chars) that are ALL CAPS, numbered, or end without punctuation.
 */
function isLikelyHeading(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 120) return false;

  // Numbered headings: "1.", "1.1", "1.1.1", etc.
  if (/^\d+(\.\d+)*\.?\s+\S/.test(trimmed)) return true;

  // ALL CAPS with at least 3 words
  if (trimmed === trimmed.toUpperCase() && trimmed.split(/\s+/).length >= 2 && trimmed.length > 5) {
    return true;
  }

  // Lines that are short and don't end with typical sentence punctuation
  if (trimmed.length < 80 && !/[.!?;,:]$/.test(trimmed) && /^[A-ZÄÖÜ]/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Split pages into semantic chunks based on headings and paragraph boundaries.
 */
export function chunkDocument(
  pages: ParsedPage[],
  config: ChunkerConfig = DEFAULT_CONFIG
): DocumentChunkData[] {
  const chunks: DocumentChunkData[] = [];
  let currentChunk: string[] = [];
  let currentHeading: string | null = null;
  let chunkPageStart: number | null = null;
  let chunkPageEnd: number | null = null;
  let chunkIndex = 0;

  function flushChunk() {
    const text = currentChunk.join("\n").trim();
    if (estimateTokens(text) >= config.minChunkTokens) {
      chunks.push({
        content: text,
        chunkIndex: chunkIndex++,
        pageStart: chunkPageStart,
        pageEnd: chunkPageEnd,
        sectionTitle: currentHeading,
        chunkType: classifyChunk(text),
        metadata: {
          tokenEstimate: estimateTokens(text),
        },
      });
    }
    currentChunk = [];
    chunkPageStart = null;
    chunkPageEnd = null;
  }

  function addOverlap(): string[] {
    if (currentChunk.length === 0) return [];
    // Take last N tokens worth of text as overlap
    const fullText = currentChunk.join("\n");
    const tokens = estimateTokens(fullText);
    if (tokens <= config.overlapTokens) return currentChunk.slice();

    // Approximate: take the last portion
    const ratio = config.overlapTokens / tokens;
    const charCount = Math.floor(fullText.length * ratio);
    const overlapText = fullText.slice(-charCount);
    return [overlapText];
  }

  for (const page of pages) {
    const lines = page.text.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length === 0) {
        // Empty line: potential paragraph break
        if (currentChunk.length > 0) {
          currentChunk.push("");
        }
        continue;
      }

      // Check if this is a heading -> start new chunk
      if (isLikelyHeading(trimmed)) {
        if (currentChunk.length > 0) {
          flushChunk();
        }
        currentHeading = trimmed;
        chunkPageStart = page.pageNumber;
        chunkPageEnd = page.pageNumber;
        currentChunk.push(trimmed);
        continue;
      }

      // Check if adding this line would exceed max
      const prospectiveText = [...currentChunk, trimmed].join("\n");
      if (estimateTokens(prospectiveText) > config.maxChunkTokens && currentChunk.length > 0) {
        const overlap = addOverlap();
        flushChunk();
        // Start new chunk with overlap
        currentChunk = [...overlap, trimmed];
        chunkPageStart = page.pageNumber;
        chunkPageEnd = page.pageNumber;
      } else {
        if (chunkPageStart === null) chunkPageStart = page.pageNumber;
        chunkPageEnd = page.pageNumber;
        currentChunk.push(trimmed);
      }
    }
  }

  // Flush remaining
  if (currentChunk.length > 0) {
    flushChunk();
  }

  return chunks;
}

/**
 * Classify chunk content type for academic materials.
 */
function classifyChunk(text: string): string {
  const lower = text.toLowerCase();

  // Definition patterns
  if (/(?:definition|definiert als|bezeichnet|versteht man unter|ist definiert)/i.test(text)) {
    return "definition";
  }

  // Formula/calculation patterns
  if (/[=+\-*/÷×].*\d/.test(text) && /(?:formel|berechnung|gleichung|koeffizient|varianz|sigma|mittelwert)/i.test(text)) {
    return "formula";
  }

  // Example/case patterns
  if (/(?:beispiel|fallbeispiel|case|vignette|z\.?\s*b\.|beispielsweise)/i.test(text)) {
    return "example";
  }

  // List patterns (many bullet points or numbered items)
  const bulletCount = (text.match(/^[\s]*[-•–]\s/gm) || []).length;
  if (bulletCount >= 3) {
    return "list";
  }

  // Method/procedure patterns
  if (/(?:methode|verfahren|vorgehen|schritt|prozess|durchführung)/i.test(lower)) {
    return "method";
  }

  // Theory patterns
  if (/(?:theorie|modell|ansatz|hypothese|annahme|paradigma)/i.test(lower)) {
    return "theory";
  }

  return "narrative";
}
