import type {
  ApiErrorBody,
  EvaluateRequest,
  FinalSummary,
  FinalSummaryRequest,
  InterviewConfig,
  QuestionSetResponse,
  SubmitAnswerResult,
} from '@shared/types';

/**
 * Every AI call goes through this module. The browser only ever talks to
 * same-origin `/api/...` endpoints; the Gemini key lives in the server env.
 */

const REQUEST_TIMEOUT_MS = 55_000;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string>;

  constructor(status: number, code: string, message: string, details?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isMissingApiKey(): boolean {
    return this.code === 'missing_api_key';
  }
}

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const response = await fetch(`/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      let payload: ApiErrorBody | null = null;
      try {
        payload = (await response.json()) as ApiErrorBody;
      } catch {
        /* non-JSON error page */
      }
      throw new ApiError(
        response.status,
        payload?.error.code ?? 'server_error',
        payload?.error.message ??
          (response.status === 404
            ? 'The API server was not found. Make sure the backend is running.'
            : 'The request failed. Please try again.'),
        payload?.error.details,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(0, 'timeout', signal?.aborted ? 'Request cancelled.' : 'The request timed out. Please try again.');
    }
    throw new ApiError(
      0,
      'network_error',
      'Could not reach the server. Check that the backend is running and try again.',
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}

export type HealthResponse = {
  ok: boolean;
  aiConfigured: boolean;
  simulated: boolean;
  model: string;
};

export const api = {
  health: async (): Promise<HealthResponse> => {
    const response = await fetch('/api/interview/health');
    if (!response.ok) throw new ApiError(response.status, 'server_error', 'Health check failed.');
    return (await response.json()) as HealthResponse;
  },

  generateQuestions: (
    config: InterviewConfig,
    previousQuestions: string[],
    signal?: AbortSignal,
  ): Promise<QuestionSetResponse> =>
    post<QuestionSetResponse>('/interview/questions', { config, previousQuestions }, signal),

  evaluateAnswer: (payload: EvaluateRequest, signal?: AbortSignal): Promise<SubmitAnswerResult> =>
    post<SubmitAnswerResult>('/interview/evaluate', payload, signal),

  getSummary: (payload: FinalSummaryRequest, signal?: AbortSignal): Promise<FinalSummary> =>
    post<FinalSummary>('/interview/summary', payload, signal),
};
