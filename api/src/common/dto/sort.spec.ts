import { describe, expect, it } from 'vitest';
import { resolveSort } from './sort';

const COLUMNS = { name: 'user.name', year: 'student.entryYear' };
const FALLBACK = { column: 'user.name', direction: 'ASC' as const };

describe('resolveSort', () => {
  it('maps a known field and direction to a column', () => {
    expect(resolveSort('year', 'desc', COLUMNS, FALLBACK)).toEqual({
      column: 'student.entryYear',
      direction: 'DESC',
    });
    expect(resolveSort('year', 'asc', COLUMNS, FALLBACK).direction).toBe('ASC');
  });

  it('defaults to ascending when only the field is given', () => {
    expect(resolveSort('name', undefined, COLUMNS, FALLBACK)).toEqual({
      column: 'user.name',
      direction: 'ASC',
    });
  });

  it('falls back when no sort is requested', () => {
    expect(resolveSort(undefined, 'desc', COLUMNS, FALLBACK)).toEqual(FALLBACK);
  });

  it('never maps an unknown field to a column (no arbitrary ORDER BY)', () => {
    expect(resolveSort('password_hash', 'asc', COLUMNS, FALLBACK)).toEqual(FALLBACK);
    expect(resolveSort('user.name; DROP TABLE users', 'asc', COLUMNS, FALLBACK)).toEqual(
      FALLBACK,
    );
  });
});
