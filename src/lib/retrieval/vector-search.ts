import { createServiceClient } from "@/lib/supabase/server";
import { generateQueryEmbedding } from "@/lib/documents/embedder";

export interface SearchResult {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  pageStart: number | null;
  pageEnd: number | null;
  sectionTitle: string | null;
  chunkType: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

/**
 * Search for relevant chunks using vector similarity.
 */
export async function searchChunks(
  query: string,
  documentIds: string[],
  options: {
    matchThreshold?: number;
    matchCount?: number;
  } = {}
): Promise<SearchResult[]> {
  const { matchThreshold = 0.3, matchCount = 10 } = options;

  const embedding = await generateQueryEmbedding(query);
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: embedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    filter_document_ids: documentIds,
  });

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    documentId: row.document_id as string,
    content: row.content as string,
    chunkIndex: row.chunk_index as number,
    pageStart: row.page_start as number | null,
    pageEnd: row.page_end as number | null,
    sectionTitle: row.section_title as string | null,
    chunkType: row.chunk_type as string,
    metadata: (row.metadata as Record<string, unknown>) || {},
    similarity: row.similarity as number,
  }));
}

/**
 * Build context string from search results for AI prompts.
 */
export function buildContextFromChunks(
  chunks: SearchResult[],
  maxTokens: number = 6000
): string {
  const parts: string[] = [];
  let estimatedTokens = 0;

  for (const chunk of chunks) {
    const chunkTokens = Math.ceil(chunk.content.length / 4);
    if (estimatedTokens + chunkTokens > maxTokens) break;

    const header = [
      `[Quelle: Seite ${chunk.pageStart || "?"}`,
      chunk.pageEnd && chunk.pageEnd !== chunk.pageStart
        ? `-${chunk.pageEnd}`
        : "",
      chunk.sectionTitle ? `, Abschnitt: ${chunk.sectionTitle}` : "",
      `]`,
    ].join("");

    parts.push(`${header}\n${chunk.content}`);
    estimatedTokens += chunkTokens + 10; // header overhead
  }

  return parts.join("\n\n---\n\n");
}
