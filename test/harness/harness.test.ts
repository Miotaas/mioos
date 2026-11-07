/**
 * Self-tests for the Phase 0 test harness: the network guard, the provider
 * override seam, the clock seam and the per-file database.
 */
import { afterEach, describe, expect, it } from "vitest";
import { clock, setClockForTesting } from "@/lib/clock";
import { getEmailProvider, setEmailProviderForTesting } from "@/lib/providers";
import { smtpEmailProvider } from "@/lib/providers/email";
import { prisma } from "@/lib/db";
import { FakeClock } from "../fakes/fake-clock";
import { FakeEmailProvider } from "../fakes/fake-email-provider";
import { blockedAttempts, clearBlockedAttempts, RealNetworkAttemptError } from "../helpers/network-guard";

const SMTP_KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"] as const;

describe("network guard", () => {
  const saved: Partial<Record<(typeof SMTP_KEYS)[number], string | undefined>> = {};

  afterEach(() => {
    for (const k of SMTP_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("blocks a real SMTP send through the production provider", async () => {
    for (const k of SMTP_KEYS) saved[k] = process.env[k];
    process.env.SMTP_HOST = "192.0.2.1"; // TEST-NET-1 documentation address: no DNS lookup, never routable
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "harness@example.invalid";
    process.env.SMTP_PASS = "not-a-real-password";
    process.env.SMTP_FROM = "harness@example.invalid";

    await expect(
      smtpEmailProvider.send({ to: "someone@example.invalid", subject: "x", text: "x" }),
    ).rejects.toThrow();
    expect(blockedAttempts().some((a) => a.kind === "socket")).toBe(true);
    clearBlockedAttempts(); // provoked on purpose; do not fail this test
  });

  it("blocks global fetch", async () => {
    await expect(fetch("https://example.invalid/")).rejects.toBeInstanceOf(RealNetworkAttemptError);
    expect(blockedAttempts().map((a) => a.kind)).toEqual(["fetch"]);
    clearBlockedAttempts();
  });
});

describe("email provider override", () => {
  it("uses the real SMTP provider unless a test overrides it", () => {
    expect(getEmailProvider()).toBe(smtpEmailProvider);
    const fake = new FakeEmailProvider();
    setEmailProviderForTesting(fake);
    expect(getEmailProvider()).toBe(fake);
    setEmailProviderForTesting(null);
    expect(getEmailProvider()).toBe(smtpEmailProvider);
  });

  it("refuses to be used outside the Vitest harness", () => {
    const saved = process.env.VITEST;
    try {
      delete process.env.VITEST;
      expect(() => setEmailProviderForTesting(new FakeEmailProvider())).toThrow(/test-only/);
    } finally {
      process.env.VITEST = saved;
    }
    expect(getEmailProvider()).toBe(smtpEmailProvider);
  });
});

describe("clock seam", () => {
  it("is the system clock by default", () => {
    const before = Date.now();
    const now = clock.now().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });

  it("can be replaced and advanced in tests", () => {
    const fake = new FakeClock("2026-10-18T08:00:00.000Z");
    setClockForTesting(fake);
    expect(clock.now().toISOString()).toBe("2026-10-18T08:00:00.000Z");
    fake.advance(60_000);
    expect(clock.now().toISOString()).toBe("2026-10-18T08:01:00.000Z");
    setClockForTesting(null);
    expect(Math.abs(clock.now().getTime() - Date.now())).toBeLessThan(1_000);
  });

  it("refuses to be replaced outside the Vitest harness", () => {
    const saved = process.env.VITEST;
    try {
      delete process.env.VITEST;
      expect(() => setClockForTesting(new FakeClock())).toThrow(/test-only/);
    } finally {
      process.env.VITEST = saved;
    }
  });
});

describe("per-file database", () => {
  it("points at a throw-away SQLite file, not a project database", () => {
    const url = process.env.DATABASE_URL ?? "";
    expect(url.startsWith("file:")).toBe(true);
    expect(url).toMatch(/mioos-test-.*\/file-.*\.db$/);
    expect(url).not.toMatch(/prisma\/mioos\.db|\/data\//);
  });

  it("starts from the current schema with no rows", async () => {
    expect(await prisma.emailDraft.count()).toBe(0);
    expect(await prisma.approval.count()).toBe(0);
  });
});
