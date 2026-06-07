export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";

export async function GET() {
  // Database connectivity
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  // Auth configuration (all three required secrets present)
  const authConfigured =
    Boolean(process.env.MIOOS_USERNAME) &&
    Boolean(process.env.MIOOS_PASSWORD) &&
    Boolean(process.env.SESSION_SECRET);

  // Scheduler: active in production or when explicitly enabled
  const schedulerEnabled =
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_SCHEDULE_RUNNER === "true";

  // Autonomy pause status (safe — returns false if DB is down)
  let autonomyPaused = false;
  if (dbOk) {
    try {
      const cfg = await prisma.systemConfig.findUnique({ where: { key: "autonomy_paused" } });
      autonomyPaused = cfg?.value === "true";
    } catch {
      autonomyPaused = false;
    }
  }

  // Agent runtime: count active agents
  let activeAgents = 0;
  if (dbOk) {
    try {
      activeAgents = await prisma.agent.count({ where: { status: "active" } });
    } catch {
      activeAgents = 0;
    }
  }

  const overallStatus = dbOk ? "ok" : "degraded";

  return Response.json({
    status: overallStatus,
    version: process.env.npm_package_version ?? "0.1.0",
    timestamp: new Date().toISOString(),
    db: { ok: dbOk },
    auth: { configured: authConfigured },
    scheduler: { enabled: schedulerEnabled },
    autonomy: { paused: autonomyPaused },
    agents: { active: activeAgents },
  });
}
