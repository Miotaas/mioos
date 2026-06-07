// Next.js server instrumentation — runs once on server startup.
// Starts the internal schedule runner so agents run on time
// without requiring an external cron or cloud service.
// Works identically locally and on a VPS.

export async function register() {
  // Only start in the Node.js runtime (not edge), and only in production or when
  // ENABLE_SCHEDULE_RUNNER=true is explicitly set in dev.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production" && process.env.ENABLE_SCHEDULE_RUNNER !== "true") return;

  const { startScheduleRunner } = await import("@/lib/scheduleRunner");
  startScheduleRunner(60_000); // check every 60 seconds
}
