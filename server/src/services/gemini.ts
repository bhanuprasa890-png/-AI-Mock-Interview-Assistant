import { env } from '../env.js';
import { AppError, modelError, missingApiKey, rateLimited } from '../lib/errors.js';

/**
 * Thin, dependency-free client for the Google Gemini REST API
 * (`generativelanguage.googleapis.com/v1beta`).
 *
 * We call REST directly instead of using a vendor SDK so the server has no
 * extra runtime dependency, and so the request shape (JSON response mode,
 * temperature, timeout) is fully explicit and testable.
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiPart {
  text?: string;
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
}

export interface GenerateOptions {
  systemInstruction: string;
  userPrompt: string;
  /** Ask Gemini for a strict JSON object response. */
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
}

/** Raised when the model replied but the text was not usable JSON. */
export class EmptyModelResponseError extends Error {
  constructor(message = 'The AI service returned an empty response.') {
    super(message);
    this.name = 'EmptyModelResponseError';
  }
}

function extractText(payload: GeminiResponse): string {
  if (payload.promptFeedback?.blockReason) {
    throw new AppError(
      422,
      'model_error',
      'That request was blocked by the AI safety filters. Please rephrase and try again.',
    );
  }
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => part.text ?? '')
    .join('')
    .trim();
}

/**
 * Send one prompt to Gemini and return the raw text of the first candidate.
 * Retries transient failures (429 / 5xx / network) with exponential backoff.
 */
export async function generateText(
  options: GenerateOptions,
  attempt = 0,
): Promise<string> {
  if (!env.geminiApiKey) throw missingApiKey();

  const url = `${API_BASE}/models/${encodeURIComponent(env.geminiModel)}:generateContent`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.requestTimeoutMs);

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: options.systemInstruction }] },
    contents: [{ role: 'user', parts: [{ text: options.userPrompt }] }],
    generationConfig: {
      temperature: options.temperature ?? 0.6,
      maxOutputTokens: options.maxOutputTokens ?? 2048,
      ...(options.json ? { responseMimeType: 'application/json' } : {}),
    },
    // Interview content must never be silently truncated by safety defaults.
    safetySettings: [],
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.geminiApiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (response.status === 429) {
      if (attempt < 2) return retry(options, attempt, 800);
      throw rateLimited();
    }
    if (response.status >= 500) {
      if (attempt < 2) return retry(options, attempt, 600);
      throw modelError('The AI service is temporarily unavailable. Please try again.');
    }
    if (!response.ok) {
      const detail = await safeText(response);
      // 400/403 for a bad key or unsupported model - surface a helpful message
      // without ever echoing the key itself.
      if (response.status === 403 || response.status === 401) {
        throw new AppError(
          503,
          'missing_api_key',
          'The AI service rejected the configured API key. Check GEMINI_API_KEY on the server.',
        );
      }
      if (response.status === 404) {
        throw modelError(
          `The configured Gemini model ("${env.geminiModel}") was not found. Check GEMINI_MODEL in .env.`,
        );
      }
      throw modelError(`The AI service returned an error (${response.status}). ${detail}`.trim());
    }

    const data = (await response.json()) as GeminiResponse;
    const text = extractText(data);
    if (!text) throw new EmptyModelResponseError();
    return text;
  } catch (error) {
    if (error instanceof AppError || error instanceof EmptyModelResponseError) throw error;
    const aborted = error instanceof Error && error.name === 'AbortError';
    if (attempt < 1) return retry(options, attempt, 500);
    if (aborted) throw modelError('The AI service took too long to respond. Please try again.');
    throw modelError('Could not reach the AI service. Check the server network connection.');
  } finally {
    clearTimeout(timeout);
  }
}

function retry(options: GenerateOptions, attempt: number, delayMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      generateText(options, attempt + 1).then(resolve, reject);
    }, delayMs * (attempt + 1));
  });
}

async function safeText(response: Response): Promise<string> {
  try {
    const raw = await response.text();
    return raw.slice(0, 300);
  } catch {
    return '';
  }
}

/** Strip ```json fences and any prose the model added around the object. */
export function extractJsonObject<T>(text: string): T {
  const cleaned = text
    .replace(/^\uFEFF/, '')
    .replace(/```(?:json)?/gi, '')
    .trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const candidate = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;

  try {
    return JSON.parse(candidate) as T;
  } catch {
    throw modelError('The AI returned an unreadable response. Please try again.');
  }
}
