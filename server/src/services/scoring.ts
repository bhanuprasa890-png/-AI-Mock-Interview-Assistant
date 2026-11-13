import {
  HR_QUESTIONS,
  MAX_SCORE_PER_QUESTION,
  TECHNICAL_QUESTIONS,
  TOTAL_QUESTIONS,
  type InterviewQuestion,
} from '../../../shared/types.js';

export const clampScore = (value: number): number =>
  Math.min(MAX_SCORE_PER_QUESTION, Math.max(0, Math.round(value * 10) / 10));

/** Trim, collapse whitespace and drop bullet markers the model may add. */
export function cleanBullet(value: string): string {
  return value
    .replace(/^[\s•\-*–—\d.)]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanBullets(values: string[], max = 4): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const text = cleanBullet(raw);
    const key = text.toLowerCase();
    if (text.length < 3 || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= max) break;
  }
  return out;
}

const normalise = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Reject near-duplicates (identical after normalisation, or very high token overlap). */
export function isDuplicateQuestion(candidate: string, others: string[]): boolean {
  const a = normalise(candidate);
  if (!a) return true;
  const aTokens = new Set(a.split(' '));
  for (const other of others) {
    const b = normalise(other);
    if (!b) continue;
    if (a === b) return true;
    const bTokens = new Set(b.split(' '));
    let shared = 0;
    for (const token of aTokens) if (bTokens.has(token)) shared += 1;
    const overlap = shared / Math.max(aTokens.size, bTokens.size);
    if (overlap > 0.85) return true;
  }
  return false;
}

export interface BuildQuestionsInput {
  raw: Array<{ type: string; question: string; focus?: string | null }>;
  previousQuestions: string[];
}

export interface BuildQuestionsResult {
  questions: InterviewQuestion[];
  /** True when the model output could not satisfy the 3+2 shape. */
  incomplete: boolean;
}

/**
 * Normalise model output into a valid question set: exactly 3 technical + 2 HR,
 * no duplicates, no repeats of questions the candidate has already seen.
 * Returns `incomplete: true` when it could not fill all slots so the caller can
 * retry once or fail loudly instead of shipping a broken interview.
 */
export function buildQuestionSet({ raw, previousQuestions }: BuildQuestionsInput): BuildQuestionsResult {
  const seen: string[] = [...previousQuestions];
  const technical: InterviewQuestion[] = [];
  const hr: InterviewQuestion[] = [];

  for (const item of raw) {
    const text = item.question.replace(/\s+/g, ' ').trim();
    if (isDuplicateQuestion(text, seen)) continue;
    const type = item.type?.toLowerCase().includes('hr') ? 'hr' : 'technical';
    const bucket = type === 'hr' ? hr : technical;
    if (bucket.length >= (type === 'hr' ? HR_QUESTIONS : TECHNICAL_QUESTIONS)) continue;
    seen.push(text);
    bucket.push({
      id: '',
      type,
      question: text,
      focus: item.focus?.trim() || undefined,
    });
  }

  const questions = [...technical, ...hr].map((question, index) => ({
    ...question,
    id: `q${index + 1}`,
  }));

  return {
    questions,
    incomplete: questions.length !== TOTAL_QUESTIONS,
  };
}

export function percentageOf(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.round((score / maxScore) * 1000) / 10;
}
