import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { gradeSingleChoice } from "@/lib/scoring/single-choice";
import { gradeMultipleSelect } from "@/lib/scoring/multiple-select";
import { gradeNumeric } from "@/lib/scoring/numeric";
import { gradeShortAnswer } from "@/lib/ai/grade";
import type { UserAnswer, QuestionOption } from "@/types/exam";

/**
 * POST /api/exams/[id]/attempt/[attemptId]/answer — save an answer
 * In learning mode with grade=true, returns immediate grading feedback.
 */
export async function POST(
  request: NextRequest,
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

  const body = await request.json();
  const { questionId, answer, grade: shouldGrade } = body as {
    questionId: string;
    answer: UserAnswer;
    grade?: boolean;
  };

  if (!questionId || !answer) {
    return NextResponse.json(
      { error: "questionId und answer erforderlich" },
      { status: 400 }
    );
  }

  // Verify attempt belongs to user and is in progress
  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("id, status, exam_id")
    .eq("id", attemptId)
    .eq("exam_id", examId)
    .eq("user_id", user.id)
    .single();

  if (!attempt || attempt.status !== "in_progress") {
    return NextResponse.json(
      { error: "Ungültiger oder abgeschlossener Versuch" },
      { status: 400 }
    );
  }

  // Load question for validation/grading
  const { data: question } = await supabase
    .from("exam_questions")
    .select("*")
    .eq("id", questionId)
    .eq("exam_id", examId)
    .single();

  if (!question) {
    return NextResponse.json(
      { error: "Frage nicht gefunden" },
      { status: 404 }
    );
  }

  // Upsert the answer
  const { error: upsertError } = await supabase
    .from("question_attempts")
    .upsert(
      {
        attempt_id: attemptId,
        question_id: questionId,
        user_answer: answer,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "attempt_id,question_id" }
    );

  if (upsertError) {
    console.error("Failed to save answer:", upsertError);
    return NextResponse.json(
      { error: "Antwort konnte nicht gespeichert werden" },
      { status: 500 }
    );
  }

  // If grading requested (learning mode), compute and return feedback
  if (shouldGrade) {
    try {
      const qd = question.question_data as Record<string, unknown>;
      const points = question.points as number;
      let gradeResult;
      let questionWithAnswers = qd;

      switch (answer.type) {
        case "SINGLE_CHOICE": {
          const options = qd.options as QuestionOption[];
          gradeResult = gradeSingleChoice(
            answer.selectedOptionId,
            options,
            points
          );
          questionWithAnswers = qd; // includes isCorrect etc.
          break;
        }

        case "MULTIPLE_SELECT": {
          const options = qd.options as QuestionOption[];
          gradeResult = gradeMultipleSelect(
            answer.selectedOptionIds,
            options,
            points
          );
          questionWithAnswers = qd;
          break;
        }

        case "NUMERIC": {
          const correctValue = qd.correctValue as number;
          const tolerance = qd.tolerance as number;
          const toleranceType = (qd.toleranceType as string) || "absolute";
          gradeResult = {
            isCorrect: false,
            score: 0,
            maxScore: points,
            feedback: {} as Record<string, unknown>,
          };

          const diff = Math.abs(answer.numericValue - correctValue);
          const isWithinTolerance =
            toleranceType === "percentage"
              ? diff <= (Math.abs(correctValue) * tolerance) / 100
              : diff <= tolerance;

          gradeResult.isCorrect = isWithinTolerance;
          gradeResult.score = isWithinTolerance ? points : 0;
          gradeResult.feedback = {
            correctValue,
            givenValue: answer.numericValue,
            tolerance,
            toleranceType,
            modelSolution: qd.modelSolution || "",
          };
          questionWithAnswers = qd;
          break;
        }

        case "SHORT_ANSWER": {
          const gradingResult = await gradeShortAnswer(
            qd.questionText as string,
            qd.modelAnswer as string,
            (qd.keywords as string[]) || [],
            (qd.rubric as { criterion: string; points: number; description: string }[]) || [],
            answer.answerText
          );

          gradeResult = {
            isCorrect: gradingResult.totalScore >= gradingResult.maxScore * 0.7,
            score:
              (gradingResult.totalScore / Math.max(gradingResult.maxScore, 1)) *
              points,
            maxScore: points,
            feedback: {
              criterionScores: gradingResult.criterionScores,
              overallFeedback: gradingResult.overallFeedback,
              keyStrengths: gradingResult.keyStrengths,
              keyWeaknesses: gradingResult.keyWeaknesses,
            },
          };
          questionWithAnswers = qd;
          break;
        }
      }

      // Save grade to DB
      if (gradeResult) {
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

      return NextResponse.json({
        saved: true,
        gradeResult,
        questionWithAnswers,
      });
    } catch (err) {
      console.error("Grading error:", err);
      return NextResponse.json({ saved: true, gradeResult: null, gradingFailed: true });
    }
  }

  return NextResponse.json({ saved: true });
}
