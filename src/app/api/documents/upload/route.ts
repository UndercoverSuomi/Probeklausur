import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

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

    // ── Parse form data ──
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Keine Datei hochgeladen" },
        { status: 400 }
      );
    }

    // ── Validate file type ──
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Nur PDF-Dateien werden unterstuetzt" },
        { status: 400 }
      );
    }

    // ── Validate file size ──
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Datei zu gross. Maximal ${MAX_FILE_SIZE / 1024 / 1024} MB erlaubt.` },
        { status: 400 }
      );
    }

    const service = createServiceClient();

    // ── Create document record ──
    const documentId = crypto.randomUUID();
    const storagePath = `${user.id}/${documentId}/${file.name}`;

    const { error: insertError } = await service.from("documents").insert({
      id: documentId,
      user_id: user.id,
      filename: file.name,
      file_size: file.size,
      storage_path: storagePath,
      status: "uploaded",
      page_count: null,
      error_message: null,
    });

    if (insertError) {
      console.error("Failed to create document record:", insertError);
      return NextResponse.json(
        { error: "Dokument konnte nicht erstellt werden" },
        { status: 500 }
      );
    }

    // ── Upload to storage ──
    const buffer = await file.arrayBuffer();

    const { error: uploadError } = await service.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      // Clean up the document record
      await service.from("documents").delete().eq("id", documentId);
      console.error("Storage upload failed:", uploadError);
      return NextResponse.json(
        { error: "Datei konnte nicht hochgeladen werden" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      documentId,
      filename: file.name,
      fileSize: file.size,
      storagePath,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Interner Serverfehler beim Hochladen" },
      { status: 500 }
    );
  }
}
