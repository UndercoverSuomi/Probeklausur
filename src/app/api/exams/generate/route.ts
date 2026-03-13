import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { examConfigSchema } from "@/types/exam";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Nicht autorisiert" },
        { status: 401 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const parseResult = examConfigSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Ungültige Konfiguration",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const config = parseResult.data;

    // Verify all documents exist and belong to user
    const { data: docs, error: docsError } = await supabase
      .from("documents")
      .select("id, status")
      .in("id", config.documentIds)
      .eq("user_id", user.id);

    if (docsError) {
      return NextResponse.json(
        { error: "Fehler beim Prüfen der Dokumente" },
        { status: 500 }
      );
    }

    if (!docs || docs.length !== config.documentIds.length) {
      return NextResponse.json(
        { error: "Eines oder mehrere Dokumente wurden nicht gefunden" },
        { status: 404 }
      );
    }

    const notReady = docs.filter((d) => d.status !== "ready");
    if (notReady.length > 0) {
      return NextResponse.json(
        { error: "Alle Dokumente müssen fertig verarbeitet sein" },
        { status: 400 }
      );
    }

    // Create exam record
    const { data: exam, error: examError } = await supabase
      .from("exams")
      .insert({
        user_id: user.id,
        status: "created",
        config: {
          questionCount: config.questionCount,
          questionTypes: config.questionTypes,
          difficulty: config.difficulty,
          mode: config.mode,
          timeLimitMinutes: config.timeLimitMinutes,
          modelId: config.modelId,
        },
        total_questions: config.questionCount,
        total_points: 0,
      })
      .select("id")
      .single();

    if (examError || !exam) {
      console.error("Failed to create exam:", examError);
      return NextResponse.json(
        { error: "Klausur konnte nicht erstellt werden" },
        { status: 500 }
      );
    }

    // Create exam_documents entries
    const examDocuments = config.documentIds.map((docId) => ({
      exam_id: exam.id,
      document_id: docId,
    }));

    const { error: edError } = await supabase
      .from("exam_documents")
      .insert(examDocuments);

    if (edError) {
      console.error("Failed to link documents:", edError);
      // Clean up the exam
      await supabase.from("exams").delete().eq("id", exam.id);
      return NextResponse.json(
        { error: "Dokumente konnten nicht verknüpft werden" },
        { status: 500 }
      );
    }

    // Fire-and-forget: trigger question generation
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.nextUrl.origin;

    fetch(`${baseUrl}/api/exams/${exam.id}/generate-questions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Pass a service-level secret to authenticate the internal call
        "x-internal-secret": process.env.INTERNAL_API_SECRET || "internal",
      },
      body: JSON.stringify({ examId: exam.id, userId: user.id }),
    }).catch((err) => {
      console.error("Failed to trigger generation:", err);
    });

    return NextResponse.json({ examId: exam.id });
  } catch (error) {
    console.error("Exam generation error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
