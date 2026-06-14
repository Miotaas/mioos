/**
 * POST /api/runtime/trigger
 *
 * Runs a single runtime loop iteration.
 * Used by Vercel cron or external schedulers when a persistent worker isn't running.
 *
 * Example vercel.json cron:
 *   { "crons": [{ "path": "/api/runtime/trigger", "schedule": "0 * * * *" }] }
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runDueSchedules } from "@/lib/scheduleRunner";
import { evaluateObjectives } from "@/lib/workforce/objective-evaluator";
import { processPendingHandoffs } from "@/lib/workforce/handoff-executor";
import { processUnprocessedSignals } from "@/lib/intelligence/signal-processor";
import { executeAssignment } from "@/lib/workforce/executor";

const MAX_QUEUE_PER_TICK = 3;

async function processQueueItems(): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed    = 0;

  for (let i = 0; i < MAX_QUEUE_PER_TICK; i++) {
    const item = await prisma.runtimeQueue.findFirst({
      where: { status: "queued", lockedAt: null },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });

    if (!item) break;

    const updated = await prisma.runtimeQueue.updateMany({
      where: { id: item.id, status: "queued", lockedAt: null },
      data:  { status: "running", lockedAt: new Date(), startedAt: new Date(), attempts: item.attempts + 1 },
    });

    if (updated.count === 0) continue;

    try {
      let assignmentId = item.assignmentId;
      if (!assignmentId) {
        const assignment = await prisma.assignment.create({
          data: { title: item.title, description: item.description, teamId: item.teamId, priority: item.priority, status: "pending" },
        });
        assignmentId = assignment.id;
        await prisma.runtimeQueue.update({ where: { id: item.id }, data: { assignmentId } });
      }

      await executeAssignment(assignmentId);
      await prisma.runtimeQueue.update({
        where: { id: item.id },
        data:  { status: "completed", completedAt: new Date(), lockedAt: null },
      });
      processed++;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      const shouldRetry = item.attempts < item.maxAttempts;
      await prisma.runtimeQueue.update({
        where: { id: item.id },
        data:  { status: shouldRetry ? "queued" : "failed", error, lockedAt: null },
      });
      failed++;
    }
  }

  return { processed, failed };
}

export async function POST() {
  const start = Date.now();

  try {
    const [schedules, queue, handoffs, objectives, signals] = await Promise.allSettled([
      runDueSchedules(),
      processQueueItems(),
      processPendingHandoffs(),
      evaluateObjectives(),
      processUnprocessedSignals(),
    ]);

    // Update heartbeat via RuntimeState
    await prisma.runtimeState.upsert({
      where:  { key: "runtime:heartbeat" },
      create: { key: "runtime:heartbeat", value: new Date().toISOString() },
      update: { value: new Date().toISOString() },
    });

    const elapsed = Date.now() - start;

    return NextResponse.json({
      ok:      true,
      elapsed,
      schedules: schedules.status === "fulfilled" ? schedules.value : { error: String((schedules as PromiseRejectedResult).reason) },
      queue:     queue.status     === "fulfilled" ? queue.value     : { error: String((queue as PromiseRejectedResult).reason) },
      handoffs:  handoffs.status  === "fulfilled" ? handoffs.value  : { error: String((handoffs as PromiseRejectedResult).reason) },
      objectives:objectives.status=== "fulfilled" ? objectives.value: { error: String((objectives as PromiseRejectedResult).reason) },
      signals:   signals.status   === "fulfilled" ? signals.value   : { error: String((signals as PromiseRejectedResult).reason) },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
