import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/exams/[id]/attempt/[attemptId]/review — get full review data
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attemptId: string }> }
) {
  const { id: examId, attemptId } = await params;
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // Load attempt
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

  // Load exam config — verify ownership
  const { data: exam } = await supabase
    .from("exams")
    .select("*")
    .eq("id", examId)
    .eq("user_id", user.id)
    .single();

  if (!exam) {
    return NextResponse.json(
      { error: "Klausur nicht gefunden" },
      { status: 404 }
    );
  }

  // Load all questions with full data
  const { data: questions } = await supabase
    .from("exam_questions")
    .select("*")
    .eq("exam_id", examId)
    .order("question_index", { ascending: true });

  // Load all answers for this attempt
  const { data: questionAttempts } = await supabase
    .from("question_attempts")
    .select("*")
    .eq("attempt_id", attemptId);

  // Load source chunk details for each question
  const answerMap = new Map<string, Record<string, unknown>>();
  for (const qa of questionAttempts || []) {
    const qaTyped = qa as Record<string, unknown>;
    answerMap.set(qaTyped.question_id as string, qaTyped);
  }

  // Build review items
  const reviewItems = (questions || []).map((q: Record<string, unknown>) => {
    const qa = answerMap.get(q.id as string);
    const qd = q.question_data as Record<string, unknown>;
    const sourceRefs = q.source_refs as Record<string, unknown>[] | null;

    return {
      questionId: q.id,
      questionIndex: q.question_index,
      questionType: q.question_type,
      difficulty: q.difficulty,
      points: q.points,
      topic: (q.metadata as Record<string, unknown>)?.topic || "",
      subtopic: (q.metadata as Record<string, unknown>)?.subtopic || "",
      cognitiveLevel:
        (q.metadata as Record<string, unknown>)?.cognitiveLevel || "",

      // Full question data (including correct answers)
      questionText: qd.questionText,
      explanation: qd.explanation,
      options: qd.options || null,
      modelAnswer: qd.modelAnswer || null,
      correctValue: qd.correctValue ?? null,
      tolerance: qd.tolerance ?? null,
      toleranceType: qd.toleranceType || null,
      unit: qd.unit || null,
      modelSolution: qd.modelSolution || null,
      keywords: qd.keywords || null,
      rubric: qd.rubric || null,

      // User's answer and grading
      userAnswer: qa ? (qa.user_answer as unknown) : null,
      isCorrect: qa ? qa.is_correct : false,
      score: qa ? qa.score : 0,
      maxScore: qa ? qa.max_score : q.points,
      feedback: qa ? qa.feedback : null,

      // Source references
      sourceReferences: (sourceRefs || []).map((sr) => ({
        chunkId: sr.chunkId || "",
        documentId: sr.documentId || "",
        filename: sr.filename || "",
        pageStart: sr.pageStart ?? null,
        pageEnd: sr.pageEnd ?? null,
        sectionTitle: sr.sectionTitle || "",
        excerpt: sr.excerpt || "",
      })),
    };
  });

  // Compute topic-level analysis
  const topicScores = new Map<
    string,
    { correct: number; total: number; score: number; maxScore: number }
  >();
  for (const item of reviewItems) {
    const topic = (item.topic as string) || "Allgemein";
    const existing = topicScores.get(topic) || {
      correct: 0,
      total: 0,
      score: 0,
      maxScore: 0,
    };
    existing.total++;
    existing.score += (item.score as number) || 0;
    existing.maxScore += (item.maxScore as number) || 0;
    if (item.isCorrect) existing.correct++;
    topicScores.set(topic, existing);
  }

  const topicAnalysis = Array.from(topicScores.entries())
    .map(([topic, data]) => ({
      topic,
      ...data,
      percentage:
        data.maxScore > 0
          ? Math.round((data.score / data.maxScore) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => a.percentage - b.percentage);

  const config = exam.config as Record<string, unknown>;

  return NextResponse.json({
    examId,
    attemptId,
    title:
      (config.difficulty === "very_hard"
        ? "Sehr schwere"
        : config.difficulty === "hard"
        ? "Schwere"
        : "Standard") + " Probeklausur",
    mode: config.mode,
    difficulty: config.difficulty,

    // Attempt summary
    score: attempt.score,
    maxScore: attempt.max_score,
    percentage: attempt.percentage,
    startedAt: attempt.started_at,
    completedAt: attempt.completed_at,

    // Questions with full review data
    questions: reviewItems,

    // Analysis
    topicAnalysis,
    totalQuestions: reviewItems.length,
    correctCount: reviewItems.filter((i) => i.isCorrect).length,
    incorrectCount: reviewItems.filter(
      (i) => !i.isCorrect && i.userAnswer != null
    ).length,
    unansweredCount: reviewItems.filter((i) => i.userAnswer == null).length,
  });
}
