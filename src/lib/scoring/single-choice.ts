import type { GradeResult, QuestionOption } from "@/types/exam";

export function gradeSingleChoice(
  selectedOptionId: string,
  options: QuestionOption[],
  points: number
): GradeResult {
  const correctOption = options.find((o) => o.isCorrect);
  const selectedOption = options.find((o) => o.id === selectedOptionId);
  const isCorrect = selectedOptionId === correctOption?.id;

  return {
    isCorrect,
    score: isCorrect ? points : 0,
    maxScore: points,
    feedback: {
      correctAnswer: correctOption?.text || "",
      correctOptionId: correctOption?.id || "",
      selectedOptionId,
      selectedOptionText: selectedOption?.text || "",
      explanation: correctOption?.explanation || "",
    },
  };
}
