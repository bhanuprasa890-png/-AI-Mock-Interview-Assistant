import { beforeEach, describe, expect, it } from 'vitest';
import type { InterviewRecord, InterviewRecordItem } from '@shared/types';
import {
  addSeenQuestions,
  clearActive,
  computeTotals,
  deleteRecord,
  getRecord,
  loadActive,
  loadHistory,
  loadLastConfig,
  loadSeenQuestions,
  newId,
  saveActive,
  saveLastConfig,
  saveRecord,
} from '../lib/storage';

const item = (id: string, score: number): InterviewRecordItem => ({
  questionId: id,
  type: 'technical',
  question: `Question ${id}`,
  answer: 'Some answer',
  score,
  scores: {
    technicalCorrectness: score,
    relevance: score,
    clarity: score,
    completeness: score,
    communication: score,
  },
  good: ['good'],
  missing: ['missing'],
  suggestions: ['suggestion'],
  improvedAnswer: 'A better answer goes here.',
  timeSpentSeconds: 42,
});

const record = (id: string, items: InterviewRecordItem[], createdAt: string): InterviewRecord => ({
  id,
  createdAt,
  completedAt: createdAt,
  config: { role: 'Python Developer', experience: 'Fresher', difficulty: 'Medium' },
  questions: [],
  items,
  score: computeTotals(items).score,
  maxScore: 50,
  percentage: computeTotals(items).percentage,
  summary: null,
  status: 'completed',
});

describe('computeTotals', () => {
  it('sums scores to one decimal and computes percentage', () => {
    const totals = computeTotals([item('q1', 7.5), item('q2', 8), item('q3', 6), item('q4', 9), item('q5', 4.5)]);
    expect(totals.score).toBe(35);
    expect(totals.maxScore).toBe(50);
    expect(totals.percentage).toBe(70);
  });

  it('never divides by zero', () => {
    expect(computeTotals([]).percentage).toBe(0);
  });
});

describe('history storage', () => {
  beforeEach(() => localStorage.clear());

  it('stores records newest first and replaces duplicates', () => {
    saveRecord(record('a', [item('q1', 5)], '2024-01-01T10:00:00.000Z'));
    saveRecord(record('b', [item('q1', 7)], '2024-02-01T10:00:00.000Z'));
    saveRecord(record('a', [item('q1', 9)], '2024-01-01T10:00:00.000Z'));

    const history = loadHistory();
    expect(history).toHaveLength(2);
    expect(history[0]?.id).toBe('b');
    expect(history.find((entry) => entry.id === 'a')?.score).toBe(9);
  });

  it('deletes a single record and reads one by id', () => {
    saveRecord(record('a', [item('q1', 5)], '2024-01-01T10:00:00.000Z'));
    saveRecord(record('b', [item('q1', 7)], '2024-02-01T10:00:00.000Z'));
    deleteRecord('a');
    expect(getRecord('a')).toBeNull();
    expect(getRecord('b')?.id).toBe('b');
  });

  it('survives corrupted localStorage values', () => {
    localStorage.setItem('interviewmate.history.v1', 'not json');
    expect(loadHistory()).toEqual([]);
  });
});

describe('active interview', () => {
  it('saves, loads and clears the in-progress interview', () => {
    const active = {
      recordId: newId(),
      config: { role: 'Data Analyst' as const, experience: 'Experienced' as const, difficulty: 'Hard' as const },
      questions: [{ id: 'q1', type: 'technical' as const, question: 'Explain window functions in SQL deeply.' }],
      items: [],
      currentIndex: 0,
      startedAt: new Date().toISOString(),
      simulated: false,
    };
    saveActive(active);
    expect(loadActive()?.recordId).toBe(active.recordId);
    clearActive();
    expect(loadActive()).toBeNull();
  });
});

describe('seen questions', () => {
  it('deduplicates case-insensitively and keeps newest first', () => {
    addSeenQuestions(['What is SQL?', 'How does a GIL work?']);
    addSeenQuestions(['what is sql?', 'What is a tuple?']);
    const seen = loadSeenQuestions();
    expect(seen).toHaveLength(3);
    expect(seen).toContain('What is a tuple?');
    // The re-added question keeps its original casing from the first pass.
    expect(seen).toContain('What is SQL?');
    expect(seen.filter((item) => item.toLowerCase() === 'what is sql?')).toHaveLength(1);
  });
});

describe('last config', () => {
  it('round-trips the last selected setup', () => {
    saveLastConfig({ role: 'Backend Developer', experience: 'Experienced', difficulty: 'Easy' });
    expect(loadLastConfig()?.role).toBe('Backend Developer');
  });
});
