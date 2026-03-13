import type { GradeResult } from "@/types/exam";

export interface AggregatedScore {
  totalScore: number;
  maxScore: number;
  percentage: number;
  questionResults: {
    questionId: string;
    result: GradeResult;
  }[];
  weakConcepts: {
    conceptName: string;
    score: number;
    maxScore: number;
    percentage: number;
  }[];
}

export function aggregateScores(
  results: {
    questionId: string;
    conceptName: string;
    result: GradeResult;
  }[]
): AggregatedScore {
  const totalScore = results.reduce((sum, r) => sum + r.result.score, 0);
  const maxScore = results.reduce((sum, r) => sum + r.result.maxScore, 0);
  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  // Group by concept
  const conceptScores = new Map<
    string,
    { score: number; maxScore: number }
  >();

  for (const r of results) {
    const existing = conceptScores.get(r.conceptName) || {
      score: 0,
      maxScore: 0,
    };
    existing.score += r.result.score;
    existing.maxScore += r.result.maxScore;
    conceptScores.set(r.conceptName, existing);
  }

  // Find weak concepts (below 50%)
  const weakConcepts = Array.from(conceptScores.entries())
    .map(([name, scores]) => ({
      conceptName: name,
      score: scores.score,
      maxScore: scores.maxScore,
      percentage:
        scores.maxScore > 0 ? (scores.score / scores.maxScore) * 100 : 0,
    }))
    .filter((c) => c.percentage < 50)
    .sort((a, b) => a.percentage - b.percentage);

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    maxScore: Math.round(maxScore * 100) / 100,
    percentage: Math.round(percentage * 10) / 10,
    questionResults: results.map((r) => ({
      questionId: r.questionId,
      result: r.result,
    })),
    weakConcepts,
  };
}
