import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

/**
 * Server-side configuration. Everything here stays on the server:
 * GEMINI_API_KEY is never serialised into a response or sent to the client.
 */

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Locate the repository root by walking up until the workspace root (which
 * owns client/ and server/) is found. Works from server/src and server/dist.
 */
function findRepoRoot(start: string): string {
  let current = start;
  for (let depth = 0; depth < 6; depth += 1) {
    if (
      fs.existsSync(path.join(current, 'client', 'package.json')) &&
      fs.existsSync(path.join(current, 'server', 'package.json'))
    ) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(start, '..', '..');
}

export const repoRoot = findRepoRoot(here);

/**
 * Load `.env` from the repo root (preferred, documented in the README) and
 * fall back to `server/.env` so either location works. Real process env vars
 * always win - dotenv never overrides them.
 */
for (const file of [path.join(repoRoot, '.env'), path.join(repoRoot, 'server', '.env')]) {
  if (fs.existsSync(file)) dotenv.config({ path: file });
}

function optionalInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isTruthy(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes((value ?? '').trim().toLowerCase());
}

const nodeEnv = process.env.NODE_ENV ?? 'development';

export const env = {
  nodeEnv,
  port: optionalInt(process.env.PORT, 8787),
  geminiApiKey: (process.env.GEMINI_API_KEY ?? '').trim(),
  geminiModel: (process.env.GEMINI_MODEL ?? 'gemini-2.5-flash').trim(),
  /**
   * Offline simulator. Only honoured outside production so a stray env var in
   * a deployed environment can never pass fake feedback off as real AI output.
   */
  mock: isTruthy(process.env.GEMINI_MOCK) && nodeEnv !== 'production',
  requestTimeoutMs: optionalInt(process.env.GEMINI_TIMEOUT_MS, 30_000),
};

export const isProduction = env.nodeEnv === 'production';

/** True when real Gemini calls are possible. */
export function hasGeminiCredentials(): boolean {
  return env.geminiApiKey.length > 0;
}
