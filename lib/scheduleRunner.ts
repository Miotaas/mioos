import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/auditLog";
import { computeNextRunAt } from "@/lib/agentEngine";
import { isAutonomyPaused } from "@/lib/autonomy";

interface ScheduleRunResult {
  triggered: number;
  skipped: number;
  failed: number;
}

export async function runDueSchedules(): Promise<ScheduleRunResult> {
  // Global emergency stop — pause all scheduled execution
  if (await isAutonomyPaused()) {
    console.log("[MioOS] Autonomy paused — skipping schedule run");
    return { triggered: 0, skipped: 0, failed: 0 };
  }

  const now = new Date();
  const result: ScheduleRunResult = { triggered: 0, skipped: 0, failed: 0 };

  const dueSchedules = await prisma.agentSchedule.findMany({
    where: {
      enabled: true,
      frequency: { not: "manual" },
      nextRunAt: { lte: now },
    },
    include: {
      agent: { select: { id: true, status: true, name: true } },
    },
  });

  for (const schedule of dueSchedules) {
    const exec = await prisma.scheduleExecution.create({
      data: {
        scheduleId: schedule.id,
        agentId: schedule.agentId,
        status: "skipped",
        startedAt: now,
      },
    });

    if (schedule.agent.status !== "active") {
      await prisma.scheduleExecution.update({
        where: { id: exec.id },
        data: { reason: `Agent is ${schedule.agent.status}`, completedAt: new Date() },
      });
      await auditLog("schedule", schedule.id, "schedule_skipped", {
        agentId: schedule.agentId,
        reason: `agent status: ${schedule.agent.status}`,
      });
      result.skipped++;
      continue;
    }

    try {
      const { executeAgent } = await import("@/lib/agentEngine");
      await executeAgent(schedule.agentId);

      const nextRunAt = computeNextRunAt(schedule.frequency, schedule.timeOfDay);
      await prisma.agentSchedule.update({
        where: { id: schedule.id },
        data: { lastRunAt: now, nextRunAt },
      });

      await prisma.scheduleExecution.update({
        where: { id: exec.id },
        data: { status: "success", completedAt: new Date() },
      });

      await auditLog("schedule", schedule.id, "schedule_triggered", {
        agentId: schedule.agentId,
        agentName: schedule.agent.name,
        frequency: schedule.frequency,
      });

      // Trigger completed_run workflows (fire and forget)
      import("@/lib/workflowRunner")
        .then(({ triggerWorkflows }) => triggerWorkflows("completed_run", schedule.agentId, 0))
        .catch(() => {});

      result.triggered++;
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Unknown error";
      await prisma.scheduleExecution.update({
        where: { id: exec.id },
        data: { status: "failed", reason, completedAt: new Date() },
      });
      await auditLog("schedule", schedule.id, "schedule_failed", {
        agentId: schedule.agentId,
        error: reason,
      });
      result.failed++;
    }
  }

  return result;
}

// Long-running interval starter for instrumentation.ts
// Only starts if not already running (singleton guard via module-level flag).
let _runnerStarted = false;

export function startScheduleRunner(intervalMs = 60_000): void {
  if (_runnerStarted) return;
  _runnerStarted = true;

  const tick = () => {
    runDueSchedules().catch(() => {});
  };

  // Run once immediately, then on interval
  tick();
  setInterval(tick, intervalMs);
}
