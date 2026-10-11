import { describe, expect, it } from 'vitest';
import { resolveLoginIdentifier } from './identifier.util';

describe('resolveLoginIdentifier', () => {
  it('recognizes a valid CPF, with or without punctuation', () => {
    expect(resolveLoginIdentifier('12345678909')).toEqual({
      type: 'cpf',
      value: '12345678909',
    });
    expect(resolveLoginIdentifier('123.456.789-09')).toEqual({
      type: 'cpf',
      value: '12345678909',
    });
  });

  it('recognizes a 10-digit registration number', () => {
    expect(resolveLoginIdentifier('2026000123')).toEqual({
      type: 'registration',
      value: '2026000123',
    });
  });

  it('never mistakes one for the other: length decides', () => {
    // 11 digits that are not a valid CPF are rejected, not treated as a matrícula.
    expect(resolveLoginIdentifier('20260001234')).toBeNull();
    // 10 digits are never a CPF.
    expect(resolveLoginIdentifier('1234567890')).toEqual({
      type: 'registration',
      value: '1234567890',
    });
  });

  it.each([
    ['empty', ''],
    ['too short', '12345'],
    ['too long', '123456789012'],
    ['letters only', 'abcdefghij'],
    ['repeated digits CPF', '11111111111'],
  ])('rejects %s', (_label, value) => {
    expect(resolveLoginIdentifier(value)).toBeNull();
  });

  it('rejects non-string input', () => {
    expect(resolveLoginIdentifier(undefined)).toBeNull();
    expect(resolveLoginIdentifier(12345678909)).toBeNull();
  });
});
