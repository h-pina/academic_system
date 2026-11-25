import { describe, expect, it } from 'vitest';
import { buildPdf } from './pdf.util';

describe('buildPdf', () => {
  it('produces a well-formed PDF skeleton', () => {
    const pdf = buildPdf(['Relatório', { text: 'Título', bold: true }]).toString('latin1');
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(pdf).toContain('/Count 1');
    expect(pdf).toContain('(Relat\xF3rio) Tj');
  });

  it('escapes parentheses and backslashes and replaces unsupported characters', () => {
    const pdf = buildPdf(['a (b) \\ c ☃']).toString('latin1');
    expect(pdf).toContain('(a \\(b\\) \\\\ c ?) Tj');
  });

  it('paginates long reports', () => {
    const lines = Array.from({ length: 120 }, (_, i) => `linha ${i}`);
    const pdf = buildPdf(lines).toString('latin1');
    expect(pdf).toMatch(/\/Count [3-9]/);
  });

  it('writes a valid xref offset table', () => {
    const buffer = buildPdf(['x']);
    const text = buffer.toString('latin1');
    const start = Number(/startxref\n(\d+)/.exec(text)?.[1]);
    expect(text.slice(start, start + 4)).toBe('xref');
    const first = /0000000009 00000 n/.exec(text);
    expect(first).not.toBeNull();
  });

  it('handles an empty report', () => {
    expect(buildPdf([]).length).toBeGreaterThan(100);
  });
});
