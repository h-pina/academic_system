const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export const WEEKDAY_HEADERS = ["D", "S", "T", "Q", "Q", "S", "S"];
export const WEEKDAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const pad = (n: number) => String(n).padStart(2, "0");

/** `YYYY-MM-DD` for a year, a month (0-11) and a day. */
export const toIso = (year: number, month: number, day: number): string =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

/** `{ year, month }` of an ISO date (month 0-11). */
export function monthOf(date: string): { year: number; month: number } {
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) - 1 };
}

/** The month `delta` months away, handling the year boundary. */
export function addMonths(view: { year: number; month: number }, delta: number) {
  const index = view.year * 12 + view.month + delta;
  return { year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 };
}

/** "março de 2026" */
export function monthTitle(view: { year: number; month: number }): string {
  return `${MONTHS[view.month]} de ${view.year}`;
}

/**
 * The weeks of a month, Sunday first. Each week has 7 cells: the ISO date of
 * the day, or `null` for the blanks before the 1st and after the last day.
 */
export function monthGrid(view: { year: number; month: number }): (string | null)[][] {
  const first = new Date(Date.UTC(view.year, view.month, 1)).getUTCDay();
  const days = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array<null>(first).fill(null),
    ...Array.from({ length: days }, (_, i) => toIso(view.year, view.month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}
