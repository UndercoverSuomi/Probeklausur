import { inngest } from "../client";
import { createServiceClient } from "@/lib/supabase/server";
import { parsePdf } from "@/lib/documents/pdf-parser";
import { chunkDocument } from "@/lib/documents/chunker";
import { generateEmbeddings } from "@/lib/documents/embedder";
import { extractConcepts } from "@/lib/ai/generate";

export const processDocument = inngest.createFunction(
  {
    id: "process-document",
    retries: 2,
  },
  { event: "document/uploaded" },
  async ({ event, step }) => {
    const { documentId, userId, storagePath, filename } = event.data;
    const supabase = createServiceClient();

    // Helper to update progress
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

    async function updateDocumentStatus(status: string, extra: Record<string, unknown> = {}) {
      await supabase
        .from("documents")
        .update({ status, updated_at: new Date().toISOString(), ...extra })
        .eq("id", documentId);
    }

    // Step 1: Download and parse PDF
    const parsedDoc = await step.run("parse-pdf", async () => {
      await updateProgress("parsing", "in_progress");
      await updateDocumentStatus("parsing");

      const { data: fileData, error: downloadError } = await supabase.storage
        .from("documents")
        .download(storagePath);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download file: ${downloadError?.message}`);
      }

      const buffer = await fileData.arrayBuffer();
      const result = await parsePdf(buffer);

      if (result.pages.length === 0) {
        throw new Error(
          "Keine extrahierbaren Textinhalte im PDF gefunden. Das PDF könnte bildbasiert/gescannt sein."
        );
      }

      // Save pages to DB
      const pageRows = result.pages.map((p) => ({
        document_id: documentId,
        page_number: p.pageNumber,
        text_content: p.text,
      }));

      const { error: pagesError } = await supabase
        .from("document_pages")
        .insert(pageRows);

      if (pagesError) {
        throw new Error(`Failed to save pages: ${pagesError.message}`);
      }

      await updateDocumentStatus("parsing", {
        page_count: result.metadata.pageCount,
      });
      await updateProgress("parsing", "completed", {
        pageCount: result.metadata.pageCount,
      });

      return {
        pageCount: result.metadata.pageCount,
        pages: result.pages,
      };
    });

    // Step 2: Chunk document
    const chunkData = await step.run("chunk-document", async () => {
      await updateProgress("chunking", "in_progress");
      await updateDocumentStatus("chunking");

      const chunks = chunkDocument(parsedDoc.pages);

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
        throw new Error(`Failed to save chunks: ${chunksError.message}`);
      }

      await updateProgress("chunking", "completed", {
        chunkCount: chunks.length,
      });

      return {
        chunks,
        chunkIds: insertedChunks?.map((c) => ({
          id: c.id,
          index: c.chunk_index,
        })) || [],
        totalChunks: chunks.length,
      };
    });

    // Step 3: Generate embeddings (batched for large documents)
    const EMBED_BATCH_SIZE = 50;
    const totalBatches = Math.ceil(
      chunkData.totalChunks / EMBED_BATCH_SIZE
    );

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      await step.run(`embed-batch-${batchIdx}`, async () => {
        await updateProgress("embedding", "in_progress", {
          batch: batchIdx + 1,
          totalBatches,
        });
        if (batchIdx === 0) {
          await updateDocumentStatus("embedding");
        }

        const start = batchIdx * EMBED_BATCH_SIZE;
        const end = Math.min(start + EMBED_BATCH_SIZE, chunkData.totalChunks);
        const batchChunks = chunkData.chunks.slice(start, end);
        const batchChunkIds = chunkData.chunkIds.slice(start, end);

        const texts = batchChunks.map((c) => c.content);
        const embeddings = await generateEmbeddings(texts);

        // Update chunks with embeddings
        for (let i = 0; i < embeddings.length; i++) {
          const chunkId = batchChunkIds[i]?.id;
          if (chunkId) {
            await supabase
              .from("document_chunks")
              .update({ embedding: JSON.stringify(embeddings[i]) })
              .eq("id", chunkId);
          }
        }
      });
    }

    await step.run("embedding-done", async () => {
      await updateProgress("embedding", "completed", {
        totalChunks: chunkData.totalChunks,
      });
    });

    // Step 4: Extract concepts
    await step.run("extract-concepts", async () => {
      await updateProgress("analyzing", "in_progress");
      await updateDocumentStatus("analyzing");

      // Combine all page text
      const rawText = parsedDoc.pages.map((p) => p.text).join("\n\n");

      const conceptMap = await extractConcepts(
        filename,
        parsedDoc.pageCount,
        rawText
      );

      // Save concepts
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
        throw new Error(`Failed to save concepts: ${conceptsError.message}`);
      }

      await updateProgress("analyzing", "completed", {
        conceptCount: conceptMap.concepts.length,
        summary: conceptMap.documentSummary,
      });
    });

    // Step 5: Mark document as ready
    await step.run("mark-ready", async () => {
      await updateDocumentStatus("ready");
      await updateProgress("complete", "completed");
    });

    return { success: true, documentId };
  }
);
