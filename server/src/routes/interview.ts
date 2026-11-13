import { Router } from 'express';
import type { ZodType } from 'zod';
import { env, hasGeminiCredentials } from '../env.js';
import { badRequest, rateLimited } from '../lib/errors.js';
import {
  evaluateRequestSchema,
  modelEvaluationSchema,
  modelQuestionsSchema,
  modelSummarySchema,
  questionsRequestSchema,
  summaryRequestSchema,
} from '../lib/schemas.js';
import {
  evaluateAnswer,
  generateQuestions,
  generateSummary,
} from '../services/interviewService.js';
import { MAX_SUMMARY_CHARS } from '../services/limits.js';

export const interviewRouter = Router();

/* --------------------------------------------------------------- */
/* Very small in-memory rate limiter (per IP, per route).           */
/* Enough to stop accidental loops and casual abuse of a paid API.  */
/* --------------------------------------------------------------- */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) throw rateLimited();
}

// Periodically drop expired buckets so the map cannot grow without bound.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}, 60_000).unref?.();

function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  const details: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.join('.') || 'body';
    details[field] ??= issue.message;
  }
  throw badRequest('Some fields are missing or invalid.', details);
}

function clientKey(req: { ip?: string }, route: string): string {
  return `${route}:${req.ip ?? 'unknown'}`;
}

/** GET /api/health - lets the client show a clear "AI not configured" state. */
interviewRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: hasGeminiCredentials() || env.mock,
    simulated: env.mock,
    model: env.mock ? 'offline-simulator' : env.geminiModel,
  });
});

/** POST /api/interview/questions */
interviewRouter.post('/questions', async (req, res, next) => {
  try {
    rateLimit(clientKey(req, 'questions'), 20, 10 * 60_000);
    const { config, previousQuestions } = parseBody(questionsRequestSchema, req.body);
    const result = await generateQuestions(config, previousQuestions ?? []);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** POST /api/interview/evaluate */
interviewRouter.post('/evaluate', async (req, res, next) => {
  try {
    rateLimit(clientKey(req, 'evaluate'), 40, 10 * 60_000);
    const { config, question, answer } = parseBody(evaluateRequestSchema, req.body);
    const result = await evaluateAnswer(config, question, answer);
    res.json({ questionId: question.id, ...result });
  } catch (error) {
    next(error);
  }
});

/** POST /api/interview/summary */
interviewRouter.post('/summary', async (req, res, next) => {
  try {
    rateLimit(clientKey(req, 'summary'), 20, 10 * 60_000);
    const { config, items } = parseBody(summaryRequestSchema, req.body);
    const totalChars = items.reduce((sum, item) => sum + item.answer.length, 0);
    if (totalChars > MAX_SUMMARY_CHARS) {
      throw badRequest('The interview transcript is too long to summarise.');
    }
    const result = await generateSummary(config, items);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** Exported for tests. */
export function resetRateLimits(): void {
  buckets.clear();
}
