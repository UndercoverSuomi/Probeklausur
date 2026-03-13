import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/exams/[id] — fetch exam details for display.
 * If ?attempt=xxx is present, load that attempt's data for the take page.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: examId } = await params;
  const attemptId = request.nextUrl.searchParams.get("attempt");
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // Load exam
  const { data: exam, error } = await supabase
    .from("exams")
    .select("*")
    .eq("id", examId)
    .eq("user_id", user.id)
    .single();

  if (error || !exam) {
    return NextResponse.json({ error: "Klausur nicht gefunden" }, { status: 404 });
  }

  // If attempt param, load full exam data for the "take" page
  if (attemptId) {
    const { data: attempt } = await supabase
      .from("exam_attempts")
      .select("*")
      .eq("id", attemptId)
      .eq("exam_id", examId)
      .eq("user_id", user.id)
      .single();

    if (!attempt) {
      return NextResponse.json(
        { error: "Versuch nicht gefunden" },
        { status: 404 }
      );
    }

    // Load questions (without correct answers in exam mode before submission)
    const { data: questions } = await supabase
      .from("exam_questions")
      .select("*")
      .eq("exam_id", examId)
      .order("question_index", { ascending: true });

    // Load existing answers
    const { data: existingAnswers } = await supabase
      .from("question_attempts")
      .select("*")
      .eq("attempt_id", attemptId);

    const config = exam.config as Record<string, unknown>;
    const isExamMode = config.mode === "exam";
    const isSubmitted = attempt.status === "completed";

    // Map questions, stripping correct answers in exam mode before submission
    const mappedQuestions = (questions || []).map((q: Record<string, unknown>) => {
      const qd = q.question_data as Record<string, unknown>;
      const sanitized = { ...qd };

      // In exam mode before submission, strip correct answers
      if (isExamMode && !isSubmitted) {
        if (sanitized.options && Array.isArray(sanitized.options)) {
          sanitized.options = (sanitized.options as Record<string, unknown>[]).map(
            (opt) => ({
              ...opt,
              isCorrect: undefined,
              explanation: undefined,
            })
          );
        }
        delete sanitized.modelAnswer;
        delete sanitized.keywords;
        delete sanitized.correctValue;
        delete sanitized.modelSolution;
        delete sanitized.rubric;
      }

      return {
        id: q.id,
        order_index: q.question_index,
        points: q.points,
        ...sanitized,
      };
    });

    // Map existing answers
    const answerMap: Record<string, unknown> = {};
    for (const ea of existingAnswers || []) {
      const eaTyped = ea as Record<string, unknown>;
      answerMap[eaTyped.question_id as string] = eaTyped.user_answer;
    }

    return NextResponse.json({
      examId: exam.id,
      attemptId: attempt.id,
      title: (config.difficulty === "very_hard"
        ? "Sehr schwere"
        : config.difficulty === "hard"
        ? "Schwere"
        : "Standard") +
        " Probeklausur",
      mode: config.mode,
      timeLimitMinutes: config.timeLimitMinutes ?? null,
      questions: mappedQuestions,
      existingAnswers: answerMap,
      startedAt: attempt.started_at,
    });
  }

  // Otherwise just return exam overview info
  return NextResponse.json(exam);
}
