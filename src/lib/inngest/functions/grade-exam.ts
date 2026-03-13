import { inngest } from "../client";
import { createServiceClient } from "@/lib/supabase/server";
import { gradeSingleChoice } from "@/lib/scoring/single-choice";
import { gradeMultipleSelect } from "@/lib/scoring/multiple-select";
import { gradeNumeric } from "@/lib/scoring/numeric";
import { gradeShortAnswer } from "@/lib/ai/grade";

export const gradeExamAttempt = inngest.createFunction(
  {
    id: "grade-exam-attempt",
    retries: 2,
  },
  { event: "exam/grade" },
  async ({ event, step }) => {
    const { attemptId, userId } = event.data;
    const supabase = createServiceClient();

    // Load attempt and questions
    const attemptData = await step.run("load-attempt", async () => {
      const { data: attempt, error } = await supabase
        .from("exam_attempts")
        .select("*, exam_id")
        .eq("id", attemptId)
        .single();

      if (error || !attempt) throw new Error("Attempt not found");

      const { data: questionAttempts, error: qaError } = await supabase
        .from("question_attempts")
        .select("*, exam_questions(*)")
        .eq("attempt_id", attemptId);

      if (qaError) throw new Error("Failed to load question attempts");

      return {
        attempt,
        questionAttempts: questionAttempts || [],
      };
    });

    // Step 1: Grade objective questions (instant)
    await step.run("grade-objective", async () => {
      for (const qa of attemptData.questionAttempts) {
        const question = qa.exam_questions;
        const answerData = qa.answer_data;
        const questionData = question.question_data;

        let result;

        switch (question.question_type) {
          case "SINGLE_CHOICE": {
            result = gradeSingleChoice(
              answerData.selectedOptionId,
              questionData.options,
              Number(question.points)
            );
            break;
          }
          case "MULTIPLE_SELECT": {
            result = gradeMultipleSelect(
              answerData.selectedOptionIds,
              questionData.options,
              Number(question.points)
            );
            break;
          }
          case "NUMERIC": {
            result = gradeNumeric(
              answerData.numericValue,
              questionData.correctValue,
              questionData.tolerance,
              questionData.toleranceType,
              Number(question.points)
            );
            break;
          }
          default:
            continue; // SHORT_ANSWER handled in next step
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
      }
    });

    // Step 2: Grade short answer questions (AI)
    const shortAnswerQAs = attemptData.questionAttempts.filter(
      (qa) => qa.exam_questions.question_type === "SHORT_ANSWER"
    );

    for (let i = 0; i < shortAnswerQAs.length; i++) {
      await step.run(`grade-short-answer-${i}`, async () => {
        const qa = shortAnswerQAs[i];
        const question = qa.exam_questions;
        const questionData = question.question_data;

        try {
          const gradingResult = await gradeShortAnswer(
            questionData.questionText,
            questionData.modelAnswer,
            questionData.keywords || [],
            questionData.rubric || [],
            qa.answer_data.answerText || ""
          );

          const score = gradingResult.totalScore;
          const maxScore = gradingResult.maxScore;

          await supabase
            .from("question_attempts")
            .update({
              is_correct: score >= maxScore * 0.8,
              score,
              max_score: maxScore,
              feedback: gradingResult,
              grading_status: "graded",
            })
            .eq("id", qa.id);
        } catch (error) {
          console.error(`Failed to grade short answer ${qa.id}:`, error);
          await supabase
            .from("question_attempts")
            .update({ grading_status: "error" })
            .eq("id", qa.id);
        }
      });
    }

    // Step 3: Compute aggregate scores
    await step.run("compute-scores", async () => {
      // Reload all graded attempts
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
      const conceptScores = new Map<string, { score: number; max: number }>();
      for (const qa of gradedQAs || []) {
        const topic =
          (qa.exam_questions?.metadata as Record<string, unknown>)?.topic as string ||
          "Allgemein";
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
          percentage: scores.max > 0 ? (scores.score / scores.max) * 100 : 0,
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
    });

    return { success: true, attemptId };
  }
);
