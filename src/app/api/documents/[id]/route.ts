import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    const service = createServiceClient();

    // ── Get document ──
    const { data: doc, error: docError } = await service
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        { error: "Dokument nicht gefunden" },
        { status: 404 }
      );
    }

    // ── Get concepts (if ready) ──
    let concepts: unknown[] = [];
    if (doc.status === "ready") {
      const { data: conceptData } = await service
        .from("document_concepts")
        .select("id, name, description, importance_score, page_references")
        .eq("document_id", id)
        .order("importance_score", { ascending: false });

      concepts = conceptData || [];
    }

    // ── Get processing progress ──
    const { data: progress } = await service
      .from("processing_progress")
      .select("step_name, step_status, step_details, updated_at")
      .eq("entity_type", "document")
      .eq("entity_id", id)
      .order("updated_at", { ascending: true });

    return NextResponse.json({
      ...doc,
      concepts,
      progress: progress || [],
    });
  } catch (err) {
    console.error("Document detail error:", err);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    const service = createServiceClient();

    // ── Verify ownership ──
    const { data: doc, error: docError } = await service
      .from("documents")
      .select("id, storage_path")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        { error: "Dokument nicht gefunden" },
        { status: 404 }
      );
    }

    // ── Delete related data (cascading order) ──
    // Processing progress
    await service
      .from("processing_progress")
      .delete()
      .eq("entity_type", "document")
      .eq("entity_id", id);

    // Concepts
    await service.from("document_concepts").delete().eq("document_id", id);

    // Chunks (embeddings are in the same table)
    await service.from("document_chunks").delete().eq("document_id", id);

    // Pages
    await service.from("document_pages").delete().eq("document_id", id);

    // Storage file
    if (doc.storage_path) {
      await service.storage.from("documents").remove([doc.storage_path]);
    }

    // Document record itself
    const { error: deleteError } = await service
      .from("documents")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Delete document error:", deleteError);
      return NextResponse.json(
        { error: "Dokument konnte nicht gelöscht werden" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Document delete error:", err);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
