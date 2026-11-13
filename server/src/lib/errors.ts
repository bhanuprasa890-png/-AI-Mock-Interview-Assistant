import type { ApiErrorCode } from '../../../shared/types.js';

/** An error that is safe to surface to the client with a specific status code. */
export class AppError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: Record<string, string>;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    details?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: Record<string, string>) =>
  new AppError(400, 'bad_request', message, details);

export const rateLimited = (message = 'Too many requests. Please wait a moment and try again.') =>
  new AppError(429, 'rate_limited', message);

export const missingApiKey = () =>
  new AppError(
    503,
    'missing_api_key',
    'The AI service is not configured. Add GEMINI_API_KEY to the server .env file and restart.',
  );

export const modelError = (message = 'The AI service could not complete that request. Please try again.') =>
  new AppError(502, 'model_error', message);
