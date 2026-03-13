import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * POST /api/exams/[id]/attempt — start a new exam attempt
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: examId } = await params;
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // Verify exam exists, belongs to user, and is ready
  const { data: exam } = await supabase
    .from("exams")
    .select("id, status, user_id")
    .eq("id", examId)
    .eq("user_id", user.id)
    .single();

  if (!exam) {
    return NextResponse.json({ error: "Klausur nicht gefunden" }, { status: 404 });
  }

  if (exam.status !== "ready") {
    return NextResponse.json(
      { error: "Klausur ist noch nicht bereit" },
      { status: 400 }
    );
  }

  // Check for existing in-progress attempt
  const { data: existingAttempt } = await supabase
    .from("exam_attempts")
    .select("id")
    .eq("exam_id", examId)
    .eq("user_id", user.id)
    .eq("status", "in_progress")
    .single();

  if (existingAttempt) {
    return NextResponse.json({ attemptId: existingAttempt.id });
  }

  // Create new attempt
  const { data: attempt, error } = await supabase
    .from("exam_attempts")
    .insert({
      exam_id: examId,
      user_id: user.id,
      status: "in_progress",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !attempt) {
    console.error("Failed to create attempt:", error);
    return NextResponse.json(
      { error: "Versuch konnte nicht erstellt werden" },
      { status: 500 }
    );
  }

  return NextResponse.json({ attemptId: attempt.id });
}
