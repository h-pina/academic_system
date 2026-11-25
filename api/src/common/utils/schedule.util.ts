export interface TimeSlot {
  weekday: number;
  startTime: string;
  endTime: string;
}

/** `HH:MM` to minutes after midnight; `NaN` when malformed. */
export function toMinutes(time: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : NaN;
}

/** True when two slots share a weekday and their time ranges intersect. */
export function slotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  if (a.weekday !== b.weekday) return false;
  return (
    toMinutes(a.startTime) < toMinutes(b.endTime) &&
    toMinutes(b.startTime) < toMinutes(a.endTime)
  );
}

/** Pairs of slots in `left` and `right` that overlap. */
export function findOverlaps<T extends TimeSlot, U extends TimeSlot>(
  left: readonly T[],
  right: readonly U[],
): [T, U][] {
  const pairs: [T, U][] = [];
  for (const a of left) {
    for (const b of right) {
      if (slotsOverlap(a, b)) pairs.push([a, b]);
    }
  }
  return pairs;
}

/** ISO weekday of a `YYYY-MM-DD` date: 1 = Monday ... 7 = Sunday. */
export function isoWeekday(date: string): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export const isIsoDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
