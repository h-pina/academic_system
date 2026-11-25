import { describe, expect, it } from 'vitest';
import { toCsv } from './csv.util';

describe('toCsv', () => {
  it('starts with a BOM and uses ; and CRLF', () => {
    expect(toCsv(['a', 'b'], [[1, 'x']])).toBe('﻿a;b\r\n1;x\r\n');
  });

  it('quotes cells with separators, quotes and line breaks', () => {
    const csv = toCsv(['n'], [['a;b'], ['say "hi"'], ['l1\nl2']]);
    expect(csv).toContain('"a;b"');
    expect(csv).toContain('"say ""hi"""');
    expect(csv).toContain('"l1\nl2"');
  });

  it('neutralises formula injection in text but keeps negative numbers', () => {
    const csv = toCsv(['n'], [['=HYPERLINK("x")'], ['+1'], ['@cmd'], [-5]]);
    expect(csv).toContain(`'=HYPERLINK`);
    expect(csv).toContain(`'+1`);
    expect(csv).toContain(`'@cmd`);
    expect(csv).toContain('\r\n-5\r\n');
  });

  it('writes empty cells for null and undefined', () => {
    expect(toCsv(['a', 'b'], [[null, undefined]])).toBe('﻿a;b\r\n;\r\n');
  });
});
