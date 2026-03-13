import { searchChunks, buildContextFromChunks, type SearchResult } from "./vector-search";

interface ContextRequest {
  conceptName: string;
  focusHint?: string;
  documentIds: string[];
  maxChunks?: number;
}

export interface QuestionContext {
  contextText: string;
  sourceChunks: SearchResult[];
}

/**
 * Build rich context for a single question generation request.
 * Combines concept name + focus hint as query, retrieves relevant chunks.
 */
export async function buildQuestionContext(
  request: ContextRequest
): Promise<QuestionContext> {
  const { conceptName, focusHint, documentIds, maxChunks = 8 } = request;

  const query = focusHint
    ? `${conceptName}: ${focusHint}`
    : conceptName;

  const chunks = await searchChunks(query, documentIds, {
    matchCount: maxChunks,
    matchThreshold: 0.25,
  });

  const contextText = buildContextFromChunks(chunks);

  return {
    contextText,
    sourceChunks: chunks,
  };
}

/**
 * Build context that spans multiple concepts (for hard/very_hard questions).
 */
export async function buildCrossConceptContext(
  concepts: string[],
  documentIds: string[],
  maxChunksPerConcept: number = 4
): Promise<QuestionContext> {
  const allChunks: SearchResult[] = [];
  const seenChunkIds = new Set<string>();

  for (const concept of concepts) {
    const chunks = await searchChunks(concept, documentIds, {
      matchCount: maxChunksPerConcept,
      matchThreshold: 0.25,
    });

    for (const chunk of chunks) {
      if (!seenChunkIds.has(chunk.id)) {
        seenChunkIds.add(chunk.id);
        allChunks.push(chunk);
      }
    }
  }

  // Sort by similarity descending
  allChunks.sort((a, b) => b.similarity - a.similarity);

  const contextText = buildContextFromChunks(allChunks);

  return {
    contextText,
    sourceChunks: allChunks,
  };
}
