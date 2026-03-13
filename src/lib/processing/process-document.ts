import { createServiceClient } from "@/lib/supabase/server";
import { parsePdf } from "@/lib/documents/pdf-parser";
import { chunkDocument } from "@/lib/documents/chunker";
import { generateEmbeddings } from "@/lib/documents/embedder";
import { extractConcepts } from "@/lib/ai/generate";

interface ProcessDocumentInput {
  documentId: string;
  userId: string;
  storagePath: string;
  filename: string;
}

/**
 * Process a document through the full pipeline:
 * Parse → Chunk → Embed → Analyze concepts
 *
 * Updates document status and processing_progress throughout.
 */
export async function processDocumentPipeline(
  input: ProcessDocumentInput
): Promise<{ success: boolean; error?: string }> {
  const { documentId, userId, storagePath, filename } = input;
  const supabase = createServiceClient();

  async function updateProgress(
    stepName: string,
    status: string,
    details: Record<string, unknown> = {}
  ) {
    await supabase.from("processing_progress").upsert(
      {
        entity_type: "document",
        entity_id: documentId,
        user_id: userId,
        step_name: stepName,
        step_status: status,
        step_details: details,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "entity_type,entity_id,step_name" }
    );
  }

  async function updateDocStatus(
    status: string,
    extra: Record<string, unknown> = {}
  ) {
    await supabase
      .from("documents")
      .update({ status, updated_at: new Date().toISOString(), ...extra })
      .eq("id", documentId);
  }

  try {
    // ── Step 1: Parse PDF ──────────────────────────────────
    await updateProgress("parsing", "in_progress");
    await updateDocStatus("parsing");

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new Error(
        `Datei konnte nicht heruntergeladen werden: ${downloadError?.message}`
      );
    }

    const buffer = await fileData.arrayBuffer();
    const parsed = await parsePdf(buffer);

    if (parsed.pages.length === 0) {
      throw new Error(
        "Keine extrahierbaren Textinhalte gefunden. Das PDF ist möglicherweise bildbasiert/gescannt."
      );
    }

    // Save pages
    const pageRows = parsed.pages.map((p) => ({
      document_id: documentId,
      page_number: p.pageNumber,
      text_content: p.text,
    }));

    const { error: pagesError } = await supabase
      .from("document_pages")
      .insert(pageRows);

    if (pagesError) {
      throw new Error(`Seiten konnten nicht gespeichert werden: ${pagesError.message}`);
    }

    await updateDocStatus("parsing", { page_count: parsed.metadata.pageCount });
    await updateProgress("parsing", "completed", {
      pageCount: parsed.metadata.pageCount,
    });

    // ── Step 2: Chunk document ─────────────────────────────
    await updateProgress("chunking", "in_progress");
    await updateDocStatus("chunking");

    const chunks = chunkDocument(parsed.pages);

    const chunkRows = chunks.map((c) => ({
      document_id: documentId,
      content: c.content,
      chunk_index: c.chunkIndex,
      page_start: c.pageStart,
      page_end: c.pageEnd,
      section_title: c.sectionTitle,
      chunk_type: c.chunkType,
      metadata: c.metadata,
    }));

    const { data: insertedChunks, error: chunksError } = await supabase
      .from("document_chunks")
      .insert(chunkRows)
      .select("id, chunk_index");

    if (chunksError) {
      throw new Error(`Chunks konnten nicht gespeichert werden: ${chunksError.message}`);
    }

    await updateProgress("chunking", "completed", {
      chunkCount: chunks.length,
    });

    // ── Step 3: Generate embeddings ────────────────────────
    await updateProgress("embedding", "in_progress");
    await updateDocStatus("embedding");

    const chunkIds = insertedChunks?.map((c) => ({
      id: c.id,
      index: c.chunk_index,
    })) || [];

    const BATCH_SIZE = 50;
    const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      await updateProgress("embedding", "in_progress", {
        batch: batchIdx + 1,
        totalBatches,
      });

      const start = batchIdx * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, chunks.length);
      const batchChunks = chunks.slice(start, end);
      const batchChunkIds = chunkIds.slice(start, end);

      const texts = batchChunks.map((c) => c.content);
      const embeddings = await generateEmbeddings(texts);

      for (let i = 0; i < embeddings.length; i++) {
        const chunkId = batchChunkIds[i]?.id;
        if (chunkId) {
          await supabase
            .from("document_chunks")
            .update({ embedding: JSON.stringify(embeddings[i]) })
            .eq("id", chunkId);
        }
      }
    }

    await updateProgress("embedding", "completed", {
      totalChunks: chunks.length,
    });

    // ── Step 4: Extract concepts ───────────────────────────
    await updateProgress("analyzing", "in_progress");
    await updateDocStatus("analyzing");

    const rawText = parsed.pages.map((p) => p.text).join("\n\n");
    const conceptMap = await extractConcepts(
      filename,
      parsed.metadata.pageCount,
      rawText
    );

    const conceptRows = conceptMap.concepts.map((c) => ({
      document_id: documentId,
      name: c.name,
      description: c.description,
      importance_score: c.importanceScore,
      page_references: c.pageReferences,
      metadata: {
        difficulty: c.difficulty,
        hasFormulas: c.hasFormulas,
        hasCaseExamples: c.hasCaseExamples,
        relatedConcepts: c.relatedConcepts,
      },
    }));

    const { error: conceptsError } = await supabase
      .from("document_concepts")
      .insert(conceptRows);

    if (conceptsError) {
      throw new Error(
        `Konzepte konnten nicht gespeichert werden: ${conceptsError.message}`
      );
    }

    await updateProgress("analyzing", "completed", {
      conceptCount: conceptMap.concepts.length,
      summary: conceptMap.documentSummary,
    });

    // ── Step 5: Mark ready ─────────────────────────────────
    await updateDocStatus("ready");
    await updateProgress("complete", "completed");

    return { success: true };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error(`Document processing failed for ${documentId}:`, errorMessage);

    await updateDocStatus("error", { error_message: errorMessage });
    await updateProgress("error", "error", { message: errorMessage });

    return { success: false, error: errorMessage };
  }
}
