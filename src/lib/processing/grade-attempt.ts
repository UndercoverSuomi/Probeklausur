import { createServiceClient } from "@/lib/supabase/server";
import { gradeSingleChoice } from "@/lib/scoring/single-choice";
import { gradeMultipleSelect } from "@/lib/scoring/multiple-select";
import { gradeNumeric } from "@/lib/scoring/numeric";
import { gradeShortAnswer } from "@/lib/ai/grade";

interface GradeAttemptInput {
  attemptId: string;
  userId: string;
}

/**
 * Grade all questions in an exam attempt.
 * Objective questions are graded instantly.
 * Short answer questions are graded via AI.
 */
export async function gradeAttemptPipeline(
  input: GradeAttemptInput
): Promise<{ success: boolean; error?: string }> {
  const { attemptId } = input;
  const supabase = createServiceClient();

  try {
    // Load attempt and question attempts
    const { data: questionAttempts, error: qaError } = await supabase
      .from("question_attempts")
      .select("*, exam_questions(*)")
      .eq("attempt_id", attemptId);

    if (qaError) {
      throw new Error("Antworten konnten nicht geladen werden");
    }

    // Grade each question
    for (const qa of questionAttempts || []) {
      const question = qa.exam_questions;
      const answerData = qa.answer_data as Record<string, unknown>;
      const questionData = question.question_data as Record<string, unknown>;
      const points = Number(question.points);

      let result;

      try {
        switch (question.question_type) {
          case "SINGLE_CHOICE": {
            result = gradeSingleChoice(
              answerData.selectedOptionId as string,
              questionData.options as {
                id: string;
                text: string;
                isCorrect: boolean;
                explanation: string;
              }[],
              points
            );
            break;
          }
          case "MULTIPLE_SELECT": {
            result = gradeMultipleSelect(
              answerData.selectedOptionIds as string[],
              questionData.options as {
                id: string;
                text: string;
                isCorrect: boolean;
                explanation: string;
              }[],
              points
            );
            break;
          }
          case "NUMERIC": {
            result = gradeNumeric(
              answerData.numericValue as number,
              questionData.correctValue as number,
              questionData.tolerance as number,
              questionData.toleranceType as "absolute" | "percentage",
              points
            );
            break;
          }
          case "SHORT_ANSWER": {
            const gradingResult = await gradeShortAnswer(
              questionData.questionText as string,
              questionData.modelAnswer as string,
              (questionData.keywords as string[]) || [],
              (questionData.rubric as {
                criterion: string;
                points: number;
                description: string;
              }[]) || [],
              (answerData.answerText as string) || ""
            );

            result = {
              isCorrect:
                gradingResult.totalScore >= gradingResult.maxScore * 0.8,
              score: gradingResult.totalScore,
              maxScore: gradingResult.maxScore,
              feedback: gradingResult,
            };
            break;
          }
          default:
            continue;
        }

        if (result) {
          await supabase
            .from("question_attempts")
            .update({
              is_correct: result.isCorrect,
              score: result.score,
              max_score: result.maxScore,
              feedback: result.feedback,
              grading_status: "graded",
            })
            .eq("id", qa.id);
        }
      } catch (gradeError) {
        console.error(
          `Failed to grade question ${qa.id}:`,
          gradeError
        );
        await supabase
          .from("question_attempts")
          .update({ grading_status: "error" })
          .eq("id", qa.id);
      }
    }

    // Compute aggregate scores
    const { data: gradedQAs } = await supabase
      .from("question_attempts")
      .select("*, exam_questions(question_type, metadata)")
      .eq("attempt_id", attemptId)
      .eq("grading_status", "graded");

    const totalScore = (gradedQAs || []).reduce(
      (sum, qa) => sum + (Number(qa.score) || 0),
      0
    );
    const maxScore = (gradedQAs || []).reduce(
      (sum, qa) => sum + (Number(qa.max_score) || 0),
      0
    );
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    // Compute weak concepts
    const conceptScores = new Map<
      string,
      { score: number; max: number }
    >();
    for (const qa of gradedQAs || []) {
      const topic =
        ((qa.exam_questions?.metadata as Record<string, unknown>)
          ?.topic as string) || "Allgemein";
      const existing = conceptScores.get(topic) || { score: 0, max: 0 };
      existing.score += Number(qa.score) || 0;
      existing.max += Number(qa.max_score) || 0;
      conceptScores.set(topic, existing);
    }

    const weakConcepts = Array.from(conceptScores.entries())
      .map(([name, scores]) => ({
        conceptName: name,
        score: scores.score,
        maxScore: scores.max,
        percentage:
          scores.max > 0 ? (scores.score / scores.max) * 100 : 0,
      }))
      .filter((c) => c.percentage < 60)
      .sort((a, b) => a.percentage - b.percentage);

    await supabase
      .from("exam_attempts")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        total_score: Math.round(totalScore * 100) / 100,
        max_score: Math.round(maxScore * 100) / 100,
        percentage: Math.round(percentage * 10) / 10,
        weak_concepts: weakConcepts,
      })
      .eq("id", attemptId);

    return { success: true };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error(`Grading failed for attempt ${attemptId}:`, errorMessage);

    await supabase
      .from("exam_attempts")
      .update({ status: "error" })
      .eq("id", attemptId);

    return { success: false, error: errorMessage };
  }
}
