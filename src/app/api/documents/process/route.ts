import { NextRequest, NextResponse, after } from "next/server";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { parsePdf } from "@/lib/documents/pdf-parser";
import { chunkDocument } from "@/lib/documents/chunker";
import { generateEmbeddings } from "@/lib/documents/embedder";
import { extractConcepts } from "@/lib/ai/generate";

export const maxDuration = 300; // 5 minutes for processing large PDFs

const EMBED_BATCH_SIZE = 50;

export async function POST(request: NextRequest) {
  try {
    // ── Auth ──
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId ist erforderlich" },
        { status: 400 }
      );
    }

    const service = createServiceClient();

    // ── Verify document ownership ──
    const { data: doc, error: docError } = await service
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        { error: "Dokument nicht gefunden" },
        { status: 404 }
      );
    }

    // ── Helper functions ──
    async function updateProgress(
      stepName: string,
      status: string,
      details: Record<string, unknown> = {}
    ) {
      await service.from("processing_progress").upsert(
        {
          entity_type: "document",
          entity_id: documentId,
          user_id: user!.id,
          step_name: stepName,
          step_status: status,
          step_details: details,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "entity_type,entity_id,step_name" }
      );
    }

    async function updateDocumentStatus(
      status: string,
      extra: Record<string, unknown> = {}
    ) {
      await service
        .from("documents")
        .update({ status, updated_at: new Date().toISOString(), ...extra })
        .eq("id", documentId);
    }

    // ── Start background processing ──
    // Use Next.js after() to keep the function alive after the response is sent.
    // The client polls /api/documents/[id] for status updates.
    after(async () => {
      try {
        // ── Step 1: Download & parse PDF ──
        await updateProgress("parsing", "in_progress");
        await updateDocumentStatus("parsing");

        const { data: fileData, error: downloadError } = await service.storage
          .from("documents")
          .download(doc.storage_path);

        if (downloadError || !fileData) {
          throw new Error(
            `Datei konnte nicht heruntergeladen werden: ${downloadError?.message}`
          );
        }

        const buffer = await fileData.arrayBuffer();
        const parsedDoc = await parsePdf(buffer);

        if (parsedDoc.pages.length === 0) {
          throw new Error(
            "Keine extrahierbaren Textinhalte im PDF gefunden. Das PDF koennte bildbasiert/gescannt sein."
          );
        }

        // Save pages
        const pageRows = parsedDoc.pages.map((p) => ({
          document_id: documentId,
          page_number: p.pageNumber,
          text_content: p.text,
        }));

        const { error: pagesError } = await service
          .from("document_pages")
          .insert(pageRows);

        if (pagesError) {
          throw new Error(`Seiten konnten nicht gespeichert werden: ${pagesError.message}`);
        }

        await updateDocumentStatus("parsing", {
          page_count: parsedDoc.metadata.pageCount,
        });
        await updateProgress("parsing", "completed", {
          pageCount: parsedDoc.metadata.pageCount,
        });

        // ── Step 2: Chunk document ──
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

        const { data: insertedChunks, error: chunksError } = await service
          .from("document_chunks")
          .insert(chunkRows)
          .select("id, chunk_index");

        if (chunksError) {
          throw new Error(`Chunks konnten nicht gespeichert werden: ${chunksError.message}`);
        }

        const chunkIds =
          insertedChunks?.map((c) => ({
            id: c.id,
            index: c.chunk_index,
          })) || [];

        await updateProgress("chunking", "completed", {
          chunkCount: chunks.length,
        });

        // ── Step 3: Generate embeddings ──
        await updateProgress("embedding", "in_progress");
        await updateDocumentStatus("embedding");

        const totalBatches = Math.ceil(chunks.length / EMBED_BATCH_SIZE);

        for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
          await updateProgress("embedding", "in_progress", {
            batch: batchIdx + 1,
            totalBatches,
          });

          const start = batchIdx * EMBED_BATCH_SIZE;
          const end = Math.min(start + EMBED_BATCH_SIZE, chunks.length);
          const batchChunks = chunks.slice(start, end);
          const batchChunkIds = chunkIds.slice(start, end);

          const texts = batchChunks.map((c) => c.content);
          const embeddings = await generateEmbeddings(texts);

          for (let i = 0; i < embeddings.length; i++) {
            const chunkId = batchChunkIds[i]?.id;
            if (chunkId) {
              await service
                .from("document_chunks")
                .update({ embedding: JSON.stringify(embeddings[i]) })
                .eq("id", chunkId);
            }
          }
        }

        await updateProgress("embedding", "completed", {
          totalChunks: chunks.length,
        });

        // ── Step 4: Extract concepts ──
        await updateProgress("analyzing", "in_progress");
        await updateDocumentStatus("analyzing");

        const rawText = parsedDoc.pages.map((p) => p.text).join("\n\n");

        const conceptMap = await extractConcepts(
          doc.filename,
          parsedDoc.metadata.pageCount,
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

        const { error: conceptsError } = await service
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

        // ── Step 5: Mark as ready ──
        await updateDocumentStatus("ready");
        await updateProgress("complete", "completed");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unbekannter Fehler";
        console.error("Document processing error:", message);
        await updateDocumentStatus("error", { error_message: message });
        await updateProgress("error", "failed", { error: message });
      }
    });

    return NextResponse.json({ success: true, documentId });
  } catch (err) {
    console.error("Process route error:", err);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
