import type { GradeResult, QuestionOption } from "@/types/exam";

export function gradeMultipleSelect(
  selectedOptionIds: string[],
  options: QuestionOption[],
  points: number
): GradeResult {
  const correctIds = new Set(
    options.filter((o) => o.isCorrect).map((o) => o.id)
  );
  const selectedIds = new Set(selectedOptionIds);

  let correctSelections = 0;
  let incorrectSelections = 0;

  for (const id of selectedIds) {
    if (correctIds.has(id)) {
      correctSelections++;
    } else {
      incorrectSelections++;
    }
  }

  const missedCorrect = correctIds.size - correctSelections;

  // Partial scoring: (correct - wrong) / total_correct, floored at 0
  const rawScore =
    correctIds.size > 0
      ? Math.max(0, (correctSelections - incorrectSelections) / correctIds.size)
      : 0;
  const score = Math.round(rawScore * points * 100) / 100;

  return {
    isCorrect: rawScore === 1,
    score,
    maxScore: points,
    feedback: {
      correctOptionIds: Array.from(correctIds),
      selectedOptionIds,
      correctCount: correctSelections,
      incorrectCount: incorrectSelections,
      missedCount: missedCorrect,
      percentage: Math.round(rawScore * 100),
    },
  };
}
