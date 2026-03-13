import { z } from "zod";

export const QuestionType = {
  SINGLE_CHOICE: "SINGLE_CHOICE",
  MULTIPLE_SELECT: "MULTIPLE_SELECT",
  SHORT_ANSWER: "SHORT_ANSWER",
  NUMERIC: "NUMERIC",
} as const;

export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

export const Difficulty = {
  STANDARD: "standard",
  HARD: "hard",
  VERY_HARD: "very_hard",
} as const;

export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

export const ExamMode = {
  EXAM: "exam",
  LEARNING: "learning",
} as const;

export type ExamMode = (typeof ExamMode)[keyof typeof ExamMode];

export const CognitiveLevel = {
  RECALL: "recall",
  DISCRIMINATION: "discrimination",
  APPLICATION: "application",
  TRANSFER: "transfer",
  SYNTHESIS: "synthesis",
  CALCULATION: "calculation",
  EVALUATION: "evaluation",
} as const;

export type CognitiveLevel =
  (typeof CognitiveLevel)[keyof typeof CognitiveLevel];

// Zod schemas for exam configuration
export const examConfigSchema = z.object({
  questionCount: z.number().min(5).max(50).default(20),
  questionTypes: z
    .array(z.enum(["SINGLE_CHOICE", "MULTIPLE_SELECT", "SHORT_ANSWER", "NUMERIC"]))
    .min(1),
  difficulty: z.enum(["standard", "hard", "very_hard"]).default("standard"),
  mode: z.enum(["exam", "learning"]).default("exam"),
  timeLimitMinutes: z.number().min(5).max(300).nullable().default(null),
  documentIds: z.array(z.string().uuid()).min(1),
  focusAreas: z.array(z.string()).optional(),
  modelId: z.string().optional(),
});

export type ExamConfig = z.infer<typeof examConfigSchema>;

// Source reference
export interface SourceReference {
  chunkId: string;
  documentId: string;
  filename: string;
  pageStart: number | null;
  pageEnd: number | null;
  excerpt: string;
}

// Question option (for choice questions)
export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation: string;
}

// Rubric criterion (for short answer)
export interface RubricCriterion {
  criterion: string;
  points: number;
  description: string;
}

// Base question data
export interface BaseQuestionData {
  questionText: string;
  explanation: string;
  sourceReferences: SourceReference[];
  cognitiveLevel: CognitiveLevel;
  topic: string;
  subtopic: string;
}

export interface SingleChoiceData extends BaseQuestionData {
  type: "SINGLE_CHOICE";
  options: QuestionOption[];
}

export interface MultipleSelectData extends BaseQuestionData {
  type: "MULTIPLE_SELECT";
  options: QuestionOption[];
}

export interface ShortAnswerData extends BaseQuestionData {
  type: "SHORT_ANSWER";
  modelAnswer: string;
  keywords: string[];
  rubric: RubricCriterion[];
}

export interface NumericData extends BaseQuestionData {
  type: "NUMERIC";
  correctValue: number;
  tolerance: number;
  toleranceType: "absolute" | "percentage";
  unit: string | null;
  modelSolution: string;
}

export type QuestionData =
  | SingleChoiceData
  | MultipleSelectData
  | ShortAnswerData
  | NumericData;

// Answer types
export interface SingleChoiceAnswer {
  type: "SINGLE_CHOICE";
  selectedOptionId: string;
}

export interface MultipleSelectAnswer {
  type: "MULTIPLE_SELECT";
  selectedOptionIds: string[];
}

export interface ShortAnswerAnswer {
  type: "SHORT_ANSWER";
  answerText: string;
}

export interface NumericAnswer {
  type: "NUMERIC";
  numericValue: number;
}

export type UserAnswer =
  | SingleChoiceAnswer
  | MultipleSelectAnswer
  | ShortAnswerAnswer
  | NumericAnswer;

// Grade result
export interface GradeResult {
  isCorrect: boolean;
  score: number;
  maxScore: number;
  feedback: Record<string, unknown>;
}

// Exam attempt state
export interface ExamAttemptState {
  examId: string;
  attemptId: string;
  mode: ExamMode;
  currentQuestionIndex: number;
  answers: Record<string, UserAnswer>;
  startedAt: string;
  timeSpentSeconds: number;
}
