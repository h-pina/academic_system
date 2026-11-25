import { describe, expect, it } from 'vitest';
import { semesterFitsCalendar, validateCalendarDates } from './calendar-rules';

const valid = {
  startDate: '2026-02-02',
  endDate: '2026-06-30',
  enrollmentStart: '2026-01-15',
  enrollmentEnd: '2026-02-20',
  withdrawalDeadline: '2026-04-15',
  gradesDeadline: '2026-07-10',
};

describe('validateCalendarDates', () => {
  it('accepts consistent dates (grades may close after the term)', () => {
    expect(validateCalendarDates({ ...valid, enrollmentStart: '2026-02-02' })).toEqual([]);
  });

  it('rejects malformed dates', () => {
    expect(validateCalendarDates({ ...valid, startDate: '2026-13-01' })).toHaveLength(1);
  });

  it('rejects a start after the end', () => {
    const problems = validateCalendarDates({
      ...valid,
      enrollmentStart: '2026-02-02',
      startDate: '2026-07-01',
    });
    expect(problems.join(' ')).toContain('anterior à data de término');
  });

  it('rejects an enrollment window outside the term', () => {
    expect(validateCalendarDates(valid).join(' ')).toContain('dentro do período letivo');
  });

  it('rejects a withdrawal deadline after the term', () => {
    const problems = validateCalendarDates({
      ...valid,
      enrollmentStart: '2026-02-02',
      withdrawalDeadline: '2026-08-01',
    });
    expect(problems.join(' ')).toContain('cancelamento e trancamento');
  });
});

describe('semesterFitsCalendar', () => {
  const calendar = { startDate: '2026-02-02', endDate: '2026-06-30' };
  it('accepts a semester inside the period', () => {
    expect(semesterFitsCalendar({ startDate: '2026-02-02', endDate: '2026-06-30' }, calendar)).toBe(true);
  });
  it('rejects a semester that spills over', () => {
    expect(semesterFitsCalendar({ startDate: '2026-01-30', endDate: '2026-06-30' }, calendar)).toBe(false);
  });
});
