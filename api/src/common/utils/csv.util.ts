/** Characters that make spreadsheets evaluate a cell as a formula. */
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  // Neutralise CSV/formula injection; numbers (including negatives) stay as is.
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  return /[";\r\n,]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Builds a CSV for Excel in pt-BR: `;` separator, CRLF line ends and a UTF-8
 * BOM so accents open correctly.
 */
export function toCsv(
  header: readonly string[],
  rows: readonly (readonly (string | number | null | undefined)[])[],
): string {
  const lines = [header, ...rows].map((row) => row.map(cell).join(';'));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
