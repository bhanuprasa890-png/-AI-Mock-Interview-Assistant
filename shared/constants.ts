/**
 * Shared runtime constants - single source of truth for both the React client
 * and the Express server, so limits can never drift apart.
 *
 * These are plain `const` values (no imports) which keeps this module safe for
 * both the CJS server build and the ESM client bundle.
 */

export const JOB_ROLES = [
  'Python Developer',
  'Web Developer',
  'Data Analyst',
  'Java Developer',
  'AI/ML Engineer',
  'Frontend Developer',
  'Backend Developer',
] as const;

export const EXPERIENCE_LEVELS = ['Fresher', 'Experienced'] as const;

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;

/** A mock interview is always exactly 5 questions: 3 technical + 2 HR. */
export const TOTAL_QUESTIONS = 5;
export const TECHNICAL_QUESTIONS = 3;
export const HR_QUESTIONS = 2;
export const MAX_SCORE_PER_QUESTION = 10;
export const MAX_TOTAL_SCORE = TOTAL_QUESTIONS * MAX_SCORE_PER_QUESTION; // 50

/** Seconds allowed per question before the timer auto-submits / expires. */
export const SECONDS_PER_QUESTION = 120;
