import type { InterviewConfig, InterviewRecord, InterviewRecordItem } from '@shared/types';
import { MAX_TOTAL_SCORE } from '@shared/types';

const HISTORY_KEY = 'interviewmate.history.v1';
const ACTIVE_KEY = 'interviewmate.active.v1';
const SEEN_KEY = 'interviewmate.seenQuestions.v1';
const CONFIG_KEY = 'interviewmate.lastConfig.v1';

const HISTORY_LIMIT = 40;
const SEEN_LIMIT = 60;

/** Everything needed to resume an interview that is still in progress. */
export interface ActiveInterview {
  recordId: string;
  config: InterviewConfig;
  questions: InterviewRecord['questions'];
  items: InterviewRecordItem[];
  currentIndex: number;
  startedAt: string;
  simulated: boolean;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readJson<T>(key: string): T | null {
  try {
    return safeParse<T>(localStorage.getItem(key));
  } catch {
    // Private mode / storage disabled.
    return null;
  }
}

function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------ history ------------------------------ */

export function loadHistory(): InterviewRecord[] {
  const raw = readJson<InterviewRecord[]>(HISTORY_KEY);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((record): record is InterviewRecord => Boolean(record?.id && record?.config))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function saveRecord(record: InterviewRecord): void {
  const history = loadHistory().filter((item) => item.id !== record.id);
  writeJson(HISTORY_KEY, [record, ...history].slice(0, HISTORY_LIMIT));
}

export function deleteRecord(id: string): void {
  writeJson(
    HISTORY_KEY,
    loadHistory().filter((item) => item.id !== id),
  );
}

export function clearHistory(): void {
  writeJson(HISTORY_KEY, []);
}

export function getRecord(id: string): InterviewRecord | null {
  return loadHistory().find((item) => item.id === id) ?? null;
}

/* ------------------------------ active ------------------------------- */

export function loadActive(): ActiveInterview | null {
  const raw = readJson<ActiveInterview>(ACTIVE_KEY);
  if (!raw?.recordId || !Array.isArray(raw.questions) || raw.questions.length === 0) return null;
  return raw;
}

export function saveActive(active: ActiveInterview): void {
  writeJson(ACTIVE_KEY, active);
}

export function clearActive(): void {
  try {
    localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

/* -------------------------- seen questions --------------------------- */

export function loadSeenQuestions(): string[] {
  const raw = readJson<string[]>(SEEN_KEY);
  return Array.isArray(raw) ? raw.filter((item) => typeof item === 'string') : [];
}

export function addSeenQuestions(questions: string[]): void {
  const previous = loadSeenQuestions();
  const merged: string[] = [];
  const keys = new Set<string>();

  // Newest first, but keep the casing already stored for a question we have
  // seen before so the list stays stable across sessions.
  for (const candidate of [...questions, ...previous]) {
    const key = candidate.trim().toLowerCase();
    if (!key || keys.has(key)) continue;
    keys.add(key);
    const stored = previous.find((item) => item.trim().toLowerCase() === key);
    merged.push((stored ?? candidate).trim());
    if (merged.length >= SEEN_LIMIT) break;
  }

  writeJson(SEEN_KEY, merged);
}

/* ---------------------------- last config ---------------------------- */

export function loadLastConfig(): InterviewConfig | null {
  return readJson<InterviewConfig>(CONFIG_KEY);
}

export function saveLastConfig(config: InterviewConfig): void {
  writeJson(CONFIG_KEY, config);
}

/* ------------------------------ helpers ------------------------------ */

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `iv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function computeTotals(items: InterviewRecordItem[]): {
  score: number;
  maxScore: number;
  percentage: number;
} {
  const score = Math.round(items.reduce((sum, item) => sum + item.score, 0) * 10) / 10;
  const maxScore = MAX_TOTAL_SCORE;
  return {
    score,
    maxScore,
    percentage: maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0,
  };
}

export const storageKeys = { HISTORY_KEY, ACTIVE_KEY, SEEN_KEY, CONFIG_KEY } as const;
