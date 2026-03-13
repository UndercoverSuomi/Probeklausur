import { NextResponse } from "next/server";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
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

    const service = createServiceClient();

    // ── List documents ──
    const { data: documents, error: docsError } = await service
      .from("documents")
      .select(
        "id, filename, file_size, page_count, status, error_message, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (docsError) {
      console.error("Failed to list documents:", docsError);
      return NextResponse.json(
        { error: "Dokumente konnten nicht geladen werden" },
        { status: 500 }
      );
    }

    return NextResponse.json({ documents: documents || [] });
  } catch (err) {
    console.error("Documents list error:", err);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
