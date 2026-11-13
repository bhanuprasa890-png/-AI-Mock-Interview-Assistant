import { describe, expect, it } from 'vitest';
import {
  buildQuestionSet,
  clampScore,
  cleanBullets,
  isDuplicateQuestion,
  percentageOf,
} from '../services/scoring.js';
import { extractJsonObject } from '../services/gemini.js';

const raw = [
  { type: 'technical', question: 'Explain the difference between a list and a tuple in Python.' },
  { type: 'technical', question: 'How does Python manage memory and what is the GIL?' },
  { type: 'technical', question: 'How do you structure a Python project with tests?' },
  { type: 'hr', question: 'Tell me about a project you are proud of.' },
  { type: 'hr', question: 'Describe a time you received difficult feedback.' },
];

describe('buildQuestionSet', () => {
  it('produces exactly 3 technical then 2 HR with sequential ids', () => {
    const { questions, incomplete } = buildQuestionSet({ raw, previousQuestions: [] });
    expect(incomplete).toBe(false);
    expect(questions).toHaveLength(5);
    expect(questions.map((q) => q.type)).toEqual(['technical', 'technical', 'technical', 'hr', 'hr']);
    expect(questions.map((q) => q.id)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5']);
  });

  it('drops questions the candidate has already seen', () => {
    const { questions, incomplete } = buildQuestionSet({
      raw,
      previousQuestions: ['explain the difference between a list and a tuple in python'],
    });
    expect(questions).toHaveLength(4);
    expect(incomplete).toBe(true);
    expect(questions.some((q) => q.question.startsWith('Explain the difference'))).toBe(false);
  });

  it('caps the number of technical questions at 3', () => {
    const extras = [
      ...raw,
      { type: 'technical', question: 'What is a generator in Python and when is it useful?' },
    ];
    const { questions } = buildQuestionSet({ raw: extras, previousQuestions: [] });
    expect(questions.filter((q) => q.type === 'technical')).toHaveLength(3);
  });

  it('treats unrecognised types as technical', () => {
    const { questions } = buildQuestionSet({
      raw: [{ type: 'behavioural-ish', question: 'Something long enough to pass validation?' }],
      previousQuestions: [],
    });
    expect(questions[0]?.type).toBe('technical');
  });
});

describe('isDuplicateQuestion', () => {
  it('matches identical text regardless of punctuation and case', () => {
    expect(isDuplicateQuestion('What is SQL?', ['what is sql'])).toBe(true);
  });

  it('matches heavy token overlap', () => {
    expect(
      isDuplicateQuestion(
        'Explain the difference between list and tuple in Python',
        ['Explain the difference between a list and a tuple in Python'],
      ),
    ).toBe(true);
  });

  it('keeps genuinely different questions', () => {
    expect(isDuplicateQuestion('What is SQL?', ['How do you handle conflict?'])).toBe(false);
  });

  it('rejects blank candidates', () => {
    expect(isDuplicateQuestion('   ', [])).toBe(true);
  });
});

describe('scoring helpers', () => {
  it('clamps scores into 0-10 and rounds to one decimal', () => {
    expect(clampScore(12.34)).toBe(10);
    expect(clampScore(-2)).toBe(0);
    expect(clampScore(7.46)).toBe(7.5);
  });

  it('strips bullet markers and duplicates', () => {
    expect(cleanBullets(['- Good point', '• Good point', '1. Another'])).toEqual([
      'Good point',
      'Another',
    ]);
  });

  it('computes percentages with one decimal', () => {
    expect(percentageOf(41.5, 50)).toBe(83);
    expect(percentageOf(0, 50)).toBe(0);
  });
});

describe('extractJsonObject', () => {
  it('parses fenced JSON with surrounding prose', () => {
    const text = 'Here you go:\n```json\n{"a":1}\n```\nThanks!';
    expect(extractJsonObject<{ a: number }>(text)).toEqual({ a: 1 });
  });

  it('throws a client-safe error on unparseable text', () => {
    expect(() => extractJsonObject('not json at all')).toThrowError(/unreadable/i);
  });
});
