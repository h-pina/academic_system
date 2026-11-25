import { describe, expect, it } from 'vitest';
import {
  absencePercent,
  resolveResult,
  toScale,
  weightedAverage,
} from './results';

const exam = { id: 1, weight: 3, maxScore: 10 };
const project = { id: 2, weight: 1, maxScore: 20 };

describe('weightedAverage', () => {
  it('weights grades on the 0-10 scale', () => {
    const result = weightedAverage([exam, project], new Map([[1, 8], [2, 10]]));
    // (8*3 + 5*1) / 4 = 7.25
    expect(result).toEqual({ final: 7.25, partial: 7.25, complete: true });
  });

  it('has no final grade while an assessment is missing, but a running average', () => {
    const result = weightedAverage([exam, project], new Map([[1, 8]]));
    expect(result).toEqual({ final: null, partial: 8, complete: false });
  });

  it('is empty without assessments or grades', () => {
    expect(weightedAverage([], new Map())).toEqual({ final: null, partial: null, complete: false });
    expect(weightedAverage([exam], new Map())).toEqual({ final: null, partial: null, complete: false });
  });

  it('rescales other maximums', () => {
    expect(toScale(15, 20)).toBe(7.5);
  });
});

describe('absencePercent', () => {
  it('is zero before any lesson', () => {
    expect(absencePercent(0, 0)).toBe(0);
  });
  it('computes the share', () => {
    expect(absencePercent(1, 4)).toBe(25);
    expect(absencePercent(1, 3)).toBe(33.33);
  });
});

describe('resolveResult (RN07, RN08)', () => {
  const base = { minPassingGrade: 6 };
  it('approves at or above the minimum', () => {
    expect(resolveResult({ ...base, finalGrade: 6, absencePercent: 0 })).toBe('approved');
  });
  it('fails by grade below the minimum', () => {
    expect(resolveResult({ ...base, finalGrade: 5.99, absencePercent: 0 })).toBe('failed_grade');
  });
  it('allows exactly 25 % of absences', () => {
    expect(resolveResult({ ...base, finalGrade: 9, absencePercent: 25 })).toBe('approved');
  });
  it('fails by attendance above 25 %, whatever the grade', () => {
    expect(resolveResult({ ...base, finalGrade: 10, absencePercent: 25.01 })).toBe('failed_attendance');
  });
  it('is in progress without a final grade', () => {
    expect(resolveResult({ ...base, finalGrade: null, absencePercent: 10 })).toBe('in_progress');
  });
  it('fails by attendance even before grades are complete', () => {
    expect(resolveResult({ ...base, finalGrade: null, absencePercent: 40 })).toBe('failed_attendance');
  });
});
