import { prisma } from "./db";

export async function enqueueItem(opts: {
  teamId: string;
  assignmentId?: string | null;
  title: string;
  description?: string | null;
  priority?: string;
  source?: string;
}): Promise<string> {
  const item = await prisma.runtimeQueue.create({
    data: {
      teamId:       opts.teamId,
      assignmentId: opts.assignmentId ?? null,
      title:        opts.title,
      description:  opts.description ?? null,
      priority:     opts.priority ?? "medium",
      source:       opts.source ?? "runtime",
      status:       "queued",
    },
  });
  return item.id;
}

async function dequeueNext() {
  const item = await prisma.runtimeQueue.findFirst({
    where: { status: "queued", lockedAt: null },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
  if (!item) return null;

  // Optimistic lock — if another process grabbed it first, count = 0
  const updated = await prisma.runtimeQueue.updateMany({
    where:  { id: item.id, status: "queued", lockedAt: null },
    data:   { status: "running", lockedAt: new Date(), startedAt: new Date(), attempts: item.attempts + 1 },
  });

  return updated.count > 0 ? item : null;
}

export async function processQueue(): Promise<{ processed: number; failed: number }> {
  // Dynamic import so the AI/Prisma modules don't load until first use
  const { executeAssignment } = await import("../lib/workforce/executor");

  const maxPerTick = Number(process.env.RUNTIME_MAX_QUEUE_PER_TICK ?? "2");
  let processed = 0;
  let failed    = 0;

  for (let i = 0; i < maxPerTick; i++) {
    const item = await dequeueNext();
    if (!item) break;

    try {
      let assignmentId = item.assignmentId;

      // If there's no assignment record yet, create one now
      if (!assignmentId) {
        const assignment = await prisma.assignment.create({
          data: {
            title:       item.title,
            description: item.description,
            teamId:      item.teamId,
            priority:    item.priority,
            status:      "pending",
          },
        });
        assignmentId = assignment.id;
        await prisma.runtimeQueue.update({
          where: { id: item.id },
          data:  { assignmentId },
        });
      }

      await executeAssignment(assignmentId);

      await prisma.runtimeQueue.update({
        where: { id: item.id },
        data:  { status: "completed", completedAt: new Date(), lockedAt: null },
      });
      processed++;

      console.log(`[queue] ✓ Completed: ${item.title.slice(0, 60)}`);
    } catch (err) {
      const error    = err instanceof Error ? err.message : String(err);
      const shouldRetry = item.attempts < item.maxAttempts;

      await prisma.runtimeQueue.update({
        where: { id: item.id },
        data: {
          status:   shouldRetry ? "queued" : "failed",
          error,
          lockedAt: null,
        },
      });

      console.error(`[queue] ✗ Failed (${item.attempts}/${item.maxAttempts}): ${item.title.slice(0, 60)} — ${error}`);
      failed++;
    }
  }

  return { processed, failed };
}
