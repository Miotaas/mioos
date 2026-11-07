/** Controllable clock for tests. Inject it with setClockForTesting(fake). */
import type { Clock } from "@/lib/clock";

export class FakeClock implements Clock {
  private current: number;

  constructor(start: Date | string = "2026-01-01T00:00:00.000Z") {
    this.current = new Date(start).getTime();
  }

  now(): Date {
    return new Date(this.current);
  }

  advance(ms: number): void {
    this.current += ms;
  }

  set(at: Date | string): void {
    this.current = new Date(at).getTime();
  }
}
