import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClockService } from '../../common/clock/clock.service';
import { isTimeTravelEnabled } from './time-travel';

describe('isTimeTravelEnabled', () => {
  it('is on in development and test, off in production', () => {
    expect(isTimeTravelEnabled({ NODE_ENV: 'development' })).toBe(true);
    expect(isTimeTravelEnabled({ NODE_ENV: 'test' })).toBe(true);
    expect(isTimeTravelEnabled({ NODE_ENV: 'production' })).toBe(false);
  });
  it('can be forced either way', () => {
    expect(isTimeTravelEnabled({ NODE_ENV: 'production', TIME_TRAVEL: 'true' })).toBe(true);
    expect(isTimeTravelEnabled({ NODE_ENV: 'development', TIME_TRAVEL: 'false' })).toBe(false);
  });
});

describe('ClockService time travel', () => {
  afterEach(() => vi.useRealTimers());

  it('jumps to noon of a day and keeps flowing', () => {
    vi.useFakeTimers({ now: new Date('2026-01-01T00:00:00Z') });
    const clock = new ClockService();
    clock.travelTo('2026-03-10');
    expect(clock.today()).toBe('2026-03-10');
    expect(clock.isSimulated()).toBe(true);
    vi.advanceTimersByTime(13 * 60 * 60 * 1000); // 13 hours later it is the next day
    expect(clock.today()).toBe('2026-03-11');
  });

  it('advances and goes back by days, from the simulated time', () => {
    vi.useFakeTimers({ now: new Date('2026-01-01T12:00:00Z') });
    const clock = new ClockService();
    clock.advanceDays(7);
    expect(clock.today()).toBe('2026-01-08');
    clock.advanceDays(-2);
    expect(clock.today()).toBe('2026-01-06');
  });

  it('returns to the real time', () => {
    vi.useFakeTimers({ now: new Date('2026-01-01T12:00:00Z') });
    const clock = new ClockService();
    clock.travelTo('2030-05-05');
    clock.reset();
    expect(clock.today()).toBe('2026-01-01');
    expect(clock.isSimulated()).toBe(false);
  });

  it('keeps the pinned clock of the tests working', () => {
    const clock = new ClockService();
    clock.setNow('2026-02-10T12:00:00Z');
    expect(clock.today()).toBe('2026-02-10');
    expect(clock.isSimulated()).toBe(true);
    clock.setNow(null);
    expect(clock.isSimulated()).toBe(false);
  });
});
