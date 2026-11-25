import { describe, expect, it } from 'vitest';
import {
  findOverlaps,
  isIsoDate,
  isoWeekday,
  slotsOverlap,
  toMinutes,
} from './schedule.util';

const slot = (weekday: number, startTime: string, endTime: string) => ({
  weekday,
  startTime,
  endTime,
});

describe('schedule util', () => {
  it('parses times and rejects malformed ones', () => {
    expect(toMinutes('08:30')).toBe(510);
    expect(toMinutes('24:00')).toBeNaN();
    expect(toMinutes('8:30')).toBeNaN();
  });

  it('detects overlapping slots on the same weekday', () => {
    expect(slotsOverlap(slot(1, '08:00', '10:00'), slot(1, '09:00', '11:00'))).toBe(true);
    expect(slotsOverlap(slot(1, '08:00', '10:00'), slot(1, '08:00', '10:00'))).toBe(true);
  });

  it('treats back-to-back slots as compatible', () => {
    expect(slotsOverlap(slot(1, '08:00', '10:00'), slot(1, '10:00', '12:00'))).toBe(false);
  });

  it('ignores different weekdays', () => {
    expect(slotsOverlap(slot(1, '08:00', '10:00'), slot(2, '08:00', '10:00'))).toBe(false);
  });

  it('lists every overlapping pair', () => {
    const pairs = findOverlaps(
      [slot(1, '08:00', '10:00'), slot(3, '14:00', '16:00')],
      [slot(1, '09:00', '09:30'), slot(3, '16:00', '17:00')],
    );
    expect(pairs).toHaveLength(1);
  });

  it('computes the ISO weekday', () => {
    expect(isoWeekday('2026-03-02')).toBe(1); // Monday
    expect(isoWeekday('2026-03-08')).toBe(7); // Sunday
  });

  it('validates calendar dates', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('26-02-01')).toBe(false);
  });
});
