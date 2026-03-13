import type { GradeResult } from "@/types/exam";

export function gradeNumeric(
  studentValue: number,
  correctValue: number,
  tolerance: number,
  toleranceType: "absolute" | "percentage",
  points: number
): GradeResult {
  const diff = Math.abs(studentValue - correctValue);
  let isWithinTolerance: boolean;

  if (toleranceType === "percentage") {
    const allowedDiff = Math.abs(correctValue * (tolerance / 100));
    isWithinTolerance = diff <= allowedDiff;
  } else {
    isWithinTolerance = diff <= tolerance;
  }

  return {
    isCorrect: isWithinTolerance,
    score: isWithinTolerance ? points : 0,
    maxScore: points,
    feedback: {
      correctValue,
      studentValue,
      difference: diff,
      tolerance,
      toleranceType,
      isWithinTolerance,
    },
  };
}
