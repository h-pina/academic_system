import { Global, Injectable, Module } from '@nestjs/common';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Source of "now". Business rules about deadlines and future dates read the
 * time here, so tests can pin it, and a development session can travel in
 * time (see `ClockController`) to watch what happens when a period ends.
 */
@Injectable()
export class ClockService {
  private fixed: Date | null = null;
  /** Milliseconds added to the real time while time travelling. */
  private offsetMs = 0;

  now(): Date {
    return this.fixed ? new Date(this.fixed) : new Date(Date.now() + this.offsetMs);
  }

  /** Today as `YYYY-MM-DD` (UTC). */
  today(): string {
    return this.now().toISOString().slice(0, 10);
  }

  /** Pins the clock (tests only); `null` returns to the real time. */
  setNow(value: Date | string | null): void {
    this.fixed = value === null ? null : new Date(value);
  }

  /** True while the clock is not showing the real time. */
  isSimulated(): boolean {
    return this.fixed !== null || this.offsetMs !== 0;
  }

  /** Moves to noon (UTC) of `date`; time keeps flowing from there. */
  travelTo(date: string): void {
    this.fixed = null;
    this.offsetMs = new Date(`${date}T12:00:00Z`).getTime() - Date.now();
  }

  /** Moves the current (possibly simulated) time by a number of days. */
  advanceDays(days: number): void {
    const target = this.now().getTime() + days * DAY_MS;
    this.fixed = null;
    this.offsetMs = target - Date.now();
  }

  /** Back to the real time. */
  reset(): void {
    this.fixed = null;
    this.offsetMs = 0;
  }
}

@Global()
@Module({
  providers: [ClockService],
  exports: [ClockService],
})
export class ClockModule {}
