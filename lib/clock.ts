/**
 * Controllable clock (Phase 0 item 1).
 *
 * Production code that needs "now" should call clock.now() instead of
 * Date.now() / new Date(), so tests can control time. In production the
 * clock is always the system clock: the override can only be set under
 * the Vitest harness.
 *
 * Phase 0 item 1 adds the abstraction only. No production module uses it
 * yet; modules move to it when a test needs to control their time.
 */

export interface Clock {
  now(): Date;
}

const systemClock: Clock = { now: () => new Date() };

let current: Clock = systemClock;

export const clock: Clock = {
  now: () => current.now(),
};

/** Test-only: replace the clock. Pass null to restore the system clock. */
export function setClockForTesting(replacement: Clock | null): void {
  if (process.env.VITEST !== "true" || process.env.NODE_ENV === "production") {
    throw new Error("[clock] setClockForTesting is test-only and cannot be used outside the Vitest harness");
  }
  current = replacement ?? systemClock;
}
