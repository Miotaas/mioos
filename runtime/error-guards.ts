/**
 * Phase 0 — runtime error guards.
 *
 * Goal: a single failing tick must NOT kill the persistent worker, and
 * unhandled errors should be recorded (AlertLog + stderr) instead of
 * silently crashing the loop. Dependency-free — no external service.
 */
import { prisma } from "./db";

async function recordAlert(severity: string, message: string): Promise<void> {
  try {
    await prisma.alertLog.create({
      data: {
        alertType: "runtime_error",
        severity,
        message: String(message).slice(0, 2000),
        channel: "none",
        dedupKey: `runtime_error:${new Date().toISOString().slice(0, 13)}`, // hourly dedupe bucket
      },
    });
  } catch {
    // Never let logging crash the worker.
  }
}

/** Run a worker tick; swallow + record any error so the loop keeps running. */
export async function safeTick(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error(`[worker] tick "${label}" failed:`, err);
    await recordAlert("error", `tick "${label}" failed: ${(err as Error)?.message ?? err}`);
  }
}

/** Install process-level guards so stray rejections/exceptions are logged, not fatal. */
export function installGlobalErrorGuards(): void {
  process.on("unhandledRejection", (reason) => {
    console.error("[worker] unhandledRejection:", reason);
    void recordAlert("error", `unhandledRejection: ${(reason as Error)?.message ?? reason}`);
  });
  process.on("uncaughtException", (err) => {
    console.error("[worker] uncaughtException:", err);
    void recordAlert("critical", `uncaughtException: ${err?.message ?? err}`);
    // Do not exit: state lives in the DB and ticks are independent. Docker
    // restart:always will recycle the process if it ever does die.
  });
}
