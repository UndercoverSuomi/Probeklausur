import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { gradeSingleChoice } from "@/lib/scoring/single-choice";
import { gradeMultipleSelect } from "@/lib/scoring/multiple-select";
import { gradeShortAnswer } from "@/lib/ai/grade";
import type { UserAnswer, QuestionOption } from "@/types/exam";

export const maxDuration = 120; // 2 min timeout for AI grading

/**
 * POST /api/exams/[id]/attempt/[attemptId]/submit — submit and grade the exam
 */
export async function POST(
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

  // Verify attempt
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

  if (attempt.status === "completed") {
    return NextResponse.json(
      { error: "Klausur bereits abgegeben" },
      { status: 400 }
    );
  }

  // Load all questions
  const { data: questions } = await supabase
    .from("exam_questions")
    .select("*")
    .eq("exam_id", examId)
    .order("question_index", { ascending: true });

  // Load all answers
  const { data: questionAttempts } = await supabase
    .from("question_attempts")
    .select("*")
    .eq("attempt_id", attemptId);

  const answerMap = new Map<string, Record<string, unknown>>();
  for (const qa of questionAttempts || []) {
    const qaTyped = qa as Record<string, unknown>;
    answerMap.set(qaTyped.question_id as string, qaTyped);
  }

  let totalScore = 0;
  let maxScore = 0;

  // Grade each question
  for (const q of questions || []) {
    const qTyped = q as Record<string, unknown>;
    const questionId = qTyped.id as string;
    const points = qTyped.points as number;
    const qd = qTyped.question_data as Record<string, unknown>;
    const existingQA = answerMap.get(questionId);

    maxScore += points;

    // If already graded (learning mode), use existing score
    if (existingQA && (existingQA as Record<string, unknown>).score != null) {
      totalScore += (existingQA as Record<string, unknown>).score as number;
      continue;
    }

    // If no answer, score 0
    if (!existingQA || !(existingQA as Record<string, unknown>).user_answer) {
      await supabase
        .from("question_attempts")
        .upsert(
          {
            attempt_id: attemptId,
            question_id: questionId,
            user_answer: null,
            is_correct: false,
            score: 0,
            max_score: points,
            feedback: { unanswered: true },
          },
          { onConflict: "attempt_id,question_id" }
        );
      continue;
    }

    const answer = (existingQA as Record<string, unknown>).user_answer as UserAnswer;

    try {
      let gradeResult;

      switch (answer.type) {
        case "SINGLE_CHOICE": {
          const options = qd.options as QuestionOption[];
          gradeResult = gradeSingleChoice(
            answer.selectedOptionId,
            options,
            points
          );
          break;
        }

        case "MULTIPLE_SELECT": {
          const options = qd.options as QuestionOption[];
          gradeResult = gradeMultipleSelect(
            answer.selectedOptionIds,
            options,
            points
          );
          break;
        }

        case "NUMERIC": {
          const correctValue = qd.correctValue as number;
          const tolerance = qd.tolerance as number;
          const toleranceType = (qd.toleranceType as string) || "absolute";

          const diff = Math.abs(answer.numericValue - correctValue);
          const isCorrect =
            toleranceType === "percentage"
              ? diff <= (Math.abs(correctValue) * tolerance) / 100
              : diff <= tolerance;

          gradeResult = {
            isCorrect,
            score: isCorrect ? points : 0,
            maxScore: points,
            feedback: {
              correctValue,
              givenValue: answer.numericValue,
              tolerance,
              toleranceType,
              modelSolution: qd.modelSolution || "",
            },
          };
          break;
        }

        case "SHORT_ANSWER": {
          try {
            const gradingResult = await gradeShortAnswer(
              qd.questionText as string,
              qd.modelAnswer as string,
              (qd.keywords as string[]) || [],
              (qd.rubric as { criterion: string; points: number; description: string }[]) || [],
              answer.answerText
            );

            const normalizedScore =
              (gradingResult.totalScore / Math.max(gradingResult.maxScore, 1)) *
              points;

            gradeResult = {
              isCorrect: normalizedScore >= points * 0.7,
              score: Math.round(normalizedScore * 100) / 100,
              maxScore: points,
              feedback: {
                criterionScores: gradingResult.criterionScores,
                overallFeedback: gradingResult.overallFeedback,
                keyStrengths: gradingResult.keyStrengths,
                keyWeaknesses: gradingResult.keyWeaknesses,
              },
            };
          } catch (err) {
            console.error("AI grading failed for question:", questionId, err);
            gradeResult = {
              isCorrect: false,
              score: 0,
              maxScore: points,
              feedback: { error: "Automatische Bewertung fehlgeschlagen" },
            };
          }
          break;
        }
      }

      if (gradeResult) {
        totalScore += gradeResult.score;

        await supabase
          .from("question_attempts")
          .update({
            is_correct: gradeResult.isCorrect,
            score: gradeResult.score,
            max_score: gradeResult.maxScore,
            feedback: gradeResult.feedback,
          })
          .eq("attempt_id", attemptId)
          .eq("question_id", questionId);
      }
    } catch (err) {
      console.error("Error grading question:", questionId, err);
    }
  }

  // Update attempt as completed
  const percentage =
    maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : 0;

  await supabase
    .from("exam_attempts")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      score: Math.round(totalScore * 100) / 100,
      max_score: maxScore,
      percentage,
    })
    .eq("id", attemptId);

  return NextResponse.json({
    success: true,
    score: totalScore,
    maxScore,
    percentage,
  });
}
