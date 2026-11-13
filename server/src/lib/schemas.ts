import { z } from 'zod';
import {
  DIFFICULTIES,
  EXPERIENCE_LEVELS,
  JOB_ROLES,
  MAX_SCORE_PER_QUESTION,
} from '../../../shared/types.js';

/** Hard cap on answer length - protects the model and the server from abuse. */
export const MAX_ANSWER_LENGTH = 4000;

export const configSchema = z.object({
  role: z.enum(JOB_ROLES),
  experience: z.enum(EXPERIENCE_LEVELS),
  difficulty: z.enum(DIFFICULTIES),
});

export const questionSchema = z.object({
  id: z.string().min(1).max(40),
  type: z.enum(['technical', 'hr']),
  question: z.string().min(5).max(600),
  focus: z.string().max(300).optional(),
});

export const questionsRequestSchema = z.object({
  config: configSchema,
  /** Previously seen questions, used to avoid repeats. */
  previousQuestions: z.array(z.string().max(600)).max(60).optional(),
});

export const evaluateRequestSchema = z.object({
  config: configSchema,
  question: questionSchema,
  answer: z
    .string()
    .trim()
    .min(1, 'Answer cannot be empty.')
    .max(MAX_ANSWER_LENGTH, `Answer must be ${MAX_ANSWER_LENGTH} characters or fewer.`),
});

export const summaryRequestSchema = z.object({
  config: configSchema,
  items: z
    .array(
      z.object({
        question: z.string().min(1).max(600),
        type: z.enum(['technical', 'hr']),
        answer: z.string().max(MAX_ANSWER_LENGTH),
        score: z.number().min(0).max(MAX_SCORE_PER_QUESTION),
      }),
    )
    .min(1)
    .max(10),
});

/* ------------------------------------------------------------------ */
/* Shapes the model must return. Validated before anything is trusted. */
/* ------------------------------------------------------------------ */

const dimensionScore = z.coerce.number().min(0).max(10);

export const modelQuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        type: z.string(),
        question: z.string().min(5).max(600),
        focus: z.string().max(300).optional().nullable(),
      }),
    )
    .min(1),
});

export const modelEvaluationSchema = z.object({
  score: z.coerce.number().min(0).max(MAX_SCORE_PER_QUESTION),
  scores: z.object({
    technicalCorrectness: dimensionScore,
    relevance: dimensionScore,
    clarity: dimensionScore,
    completeness: dimensionScore,
    communication: dimensionScore,
  }),
  good: z.array(z.string().min(1).max(500)).min(1).max(6),
  missing: z.array(z.string().min(1).max(500)).min(1).max(6),
  suggestions: z.array(z.string().min(1).max(500)).min(1).max(6),
  improvedAnswer: z.string().min(20).max(4000),
});

export const modelSummarySchema = z.object({
  overall: z.string().min(20).max(2000),
  strongestAreas: z.array(z.string().min(1).max(400)).min(1).max(6),
  improvementAreas: z.array(z.string().min(1).max(400)).min(1).max(6),
  futureSuggestions: z.array(z.string().min(1).max(400)).min(1).max(6),
});

export type ModelQuestions = z.infer<typeof modelQuestionsSchema>;
export type ModelEvaluation = z.infer<typeof modelEvaluationSchema>;
export type ModelSummary = z.infer<typeof modelSummarySchema>;
