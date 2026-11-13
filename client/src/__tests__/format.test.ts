import { describe, expect, it } from 'vitest';
import { DIMENSION_LABELS, formatClock, round1, scoreTone } from '../lib/format';

describe('formatClock', () => {
  it('formats seconds as m:ss', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(9)).toBe('0:09');
    expect(formatClock(120)).toBe('2:00');
    expect(formatClock(75)).toBe('1:15');
  });

  it('never shows negative time', () => {
    expect(formatClock(-5)).toBe('0:00');
  });
});

describe('scoreTone', () => {
  it('maps score bands to labels', () => {
    expect(scoreTone(85).label).toBe('Excellent');
    expect(scoreTone(65).label).toBe('Good');
    expect(scoreTone(45).label).toBe('Developing');
    expect(scoreTone(10).label).toBe('Needs work');
  });
});

describe('constants', () => {
  it('rounds to one decimal', () => {
    expect(round1(7.46)).toBe(7.5);
    expect(round1(7.44)).toBe(7.4);
  });

  it('labels all five evaluation dimensions', () => {
    expect(Object.keys(DIMENSION_LABELS)).toHaveLength(5);
  });
});
