/**
 * Shared TYPE contract between the React client and the Express server.
 *
 * Types only - no runtime values live here, so the server can compile this
 * file to CJS while the client bundles it as ESM without conflict.
 * Runtime constants live in `shared/constants.ts`.
 */

import type { JOB_ROLES, EXPERIENCE_LEVELS, DIFFICULTIES } from './constants.js';

export type JobRole = (typeof JOB_ROLES)[number];
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Re-export constants so consumers can import both from one place. */
export * from './constants.js';

export type QuestionType = 'technical' | 'hr';

export interface InterviewQuestion {
  /** Stable id chosen by the server, e.g. "q1". */
  id: string;
  type: QuestionType;
  question: string;
  /** Short hint about what a strong answer covers. Shown once the answer is submitted. */
  focus?: string;
}

export interface InterviewConfig {
  role: JobRole;
  experience: ExperienceLevel;
  difficulty: Difficulty;
}

export interface QuestionSetResponse {
  questions: InterviewQuestion[];
  /** Hash-free normalised question texts, used to avoid repeats on restart. */
  generatedAt: string;
  /** True when the payload came from the deterministic offline simulator. */
  simulated: boolean;
}

export interface EvaluationScores {
  technicalCorrectness: number;
  relevance: number;
  clarity: number;
  completeness: number;
  communication: number;
}

export interface Evaluation {
  /** 0-10, rounded to one decimal at most. */
  score: number;
  scores: EvaluationScores;
  good: string[];
  missing: string[];
  suggestions: string[];
  improvedAnswer: string;
  simulated: boolean;
}

export interface EvaluateRequest {
  config: InterviewConfig;
  question: InterviewQuestion;
  answer: string;
}

export interface SubmitAnswerResult extends Evaluation {
  questionId: string;
}

export interface FinalSummaryRequest {
  config: InterviewConfig;
  items: Array<{
    question: string;
    type: QuestionType;
    answer: string;
    score: number;
  }>;
}

export interface FinalSummary {
  overall: string;
  strongestAreas: string[];
  improvementAreas: string[];
  futureSuggestions: string[];
  simulated: boolean;
}

export type ApiErrorCode =
  | 'bad_request'
  | 'rate_limited'
  | 'model_error'
  | 'missing_api_key'
  | 'not_found'
  | 'server_error';

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    /** Present for validation failures: field -> message. */
    details?: Record<string, string>;
  };
}

/** A single graded question inside a saved interview. */
export interface InterviewRecordItem {
  questionId: string;
  type: QuestionType;
  question: string;
  answer: string;
  score: number;
  scores: EvaluationScores;
  good: string[];
  missing: string[];
  suggestions: string[];
  improvedAnswer: string;
  /** Seconds the candidate actually spent on the question. */
  timeSpentSeconds: number;
  /** True when the grade came from the offline simulator. */
  simulated?: boolean;
}

/** A completed (or abandoned) interview persisted to localStorage. */
export interface InterviewRecord {
  id: string;
  createdAt: string;
  completedAt: string | null;
  config: InterviewConfig;
  questions: InterviewQuestion[];
  items: InterviewRecordItem[];
  score: number;
  maxScore: number;
  percentage: number;
  summary: FinalSummary | null;
  status: 'in_progress' | 'completed';
}
