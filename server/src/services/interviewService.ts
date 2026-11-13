import { env } from '../env.js';
import type {
  Evaluation,
  FinalSummary,
  InterviewConfig,
  InterviewQuestion,
  QuestionSetResponse,
  QuestionType,
} from '../../../shared/types.js';
import { modelError } from '../lib/errors.js';
import {
  modelEvaluationSchema,
  modelQuestionsSchema,
  modelSummarySchema,
  type ModelEvaluation,
} from '../lib/schemas.js';
import { extractJsonObject, generateText } from './gemini.js';
import {
  evaluationSystemInstruction,
  evaluationUserPrompt,
  questionsSystemInstruction,
  questionsUserPrompt,
  summarySystemInstruction,
  summaryUserPrompt,
} from './prompts.js';
import { buildQuestionSet, clampScore, cleanBullets } from './scoring.js';
import { simulateEvaluation, simulateQuestions, simulateSummary } from './simulator.js';

/* ------------------------------------------------------------------ */
/* Question generation                                                 */
/* ------------------------------------------------------------------ */

export async function generateQuestions(
  config: InterviewConfig,
  previousQuestions: string[],
): Promise<QuestionSetResponse> {
  if (env.mock) {
    const { questions } = simulateQuestions(config, previousQuestions);
    return {
      questions,
      generatedAt: new Date().toISOString(),
      simulated: true,
    };
  }

  const systemInstruction = questionsSystemInstruction();
  let previous = [...previousQuestions];

  // Two attempts: if the model returns duplicates or the wrong 3+2 split, ask
  // again with the rejected questions added to the "do not repeat" list.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const text = await generateText({
      systemInstruction,
      userPrompt: questionsUserPrompt(config, previous),
      json: true,
      temperature: attempt === 0 ? 0.85 : 0.5,
      maxOutputTokens: 1600,
    });

    const parsed = modelQuestionsSchema.safeParse(extractJsonObject<unknown>(text));
    if (!parsed.success) continue;

    const { questions, incomplete } = buildQuestionSet({
      raw: parsed.data.questions,
      previousQuestions,
    });

    if (!incomplete) {
      return {
        questions,
        generatedAt: new Date().toISOString(),
        simulated: false,
      };
    }
    previous = [...previous, ...parsed.data.questions.map((q) => q.question)];
  }

  throw modelError(
    'The AI could not produce a fresh 5-question set (3 technical + 2 HR). Please try again.',
  );
}

/* ------------------------------------------------------------------ */
/* Answer evaluation                                                   */
/* ------------------------------------------------------------------ */

function normaliseEvaluation(raw: ModelEvaluation, simulated: boolean): Evaluation {
  return {
    simulated,
    score: clampScore(raw.score),
    scores: {
      technicalCorrectness: clampScore(raw.scores.technicalCorrectness),
      relevance: clampScore(raw.scores.relevance),
      clarity: clampScore(raw.scores.clarity),
      completeness: clampScore(raw.scores.completeness),
      communication: clampScore(raw.scores.communication),
    },
    good: cleanBullets(raw.good),
    missing: cleanBullets(raw.missing),
    suggestions: cleanBullets(raw.suggestions),
    improvedAnswer: raw.improvedAnswer.trim(),
  };
}

export async function evaluateAnswer(
  config: InterviewConfig,
  question: InterviewQuestion,
  answer: string,
): Promise<Evaluation> {
  if (env.mock) return simulateEvaluation(question, answer);

  const systemInstruction = evaluationSystemInstruction();
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const text = await generateText({
        systemInstruction,
        userPrompt: evaluationUserPrompt(config, question, answer),
        json: true,
        temperature: attempt === 0 ? 0.4 : 0.2,
        maxOutputTokens: 1800,
      });
      const parsed = modelEvaluationSchema.safeParse(extractJsonObject<unknown>(text));
      if (parsed.success) return normaliseEvaluation(parsed.data, false);
      lastError = parsed.error;
    } catch (error) {
      lastError = error;
      // Configuration / quota problems will not fix themselves in one retry.
      const code = (error as { code?: string }).code;
      if (code === 'missing_api_key' || code === 'rate_limited') throw error;
    }
  }

  console.error('[evaluate] unusable model response:', lastError);
  throw modelError('The AI could not grade that answer. Please submit again.');
}

/* ------------------------------------------------------------------ */
/* Final summary                                                       */
/* ------------------------------------------------------------------ */

export async function generateSummary(
  config: InterviewConfig,
  items: Array<{ question: string; type: QuestionType; answer: string; score: number }>,
): Promise<FinalSummary> {
  if (env.mock) return simulateSummary(config, items.map((item) => item.score));

  const systemInstruction = summarySystemInstruction();
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const text = await generateText({
        systemInstruction,
        userPrompt: summaryUserPrompt(config, items),
        json: true,
        temperature: attempt === 0 ? 0.5 : 0.3,
        maxOutputTokens: 1200,
      });
      const parsed = modelSummarySchema.safeParse(extractJsonObject<unknown>(text));
      if (parsed.success) {
        return {
          simulated: false,
          overall: parsed.data.overall.trim(),
          strongestAreas: cleanBullets(parsed.data.strongestAreas),
          improvementAreas: cleanBullets(parsed.data.improvementAreas),
          futureSuggestions: cleanBullets(parsed.data.futureSuggestions),
        };
      }
      lastError = parsed.error;
    } catch (error) {
      lastError = error;
      const code = (error as { code?: string }).code;
      if (code === 'missing_api_key' || code === 'rate_limited') throw error;
    }
  }

  console.error('[summary] unusable model response:', lastError);
  throw modelError('The AI could not write your summary. Please try again.');
}
