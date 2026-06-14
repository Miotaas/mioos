import { prisma } from "@/lib/db";

export async function processUnprocessedSignals(): Promise<{ processed: number }> {
  const unprocessed = await prisma.intelligenceSignal.findMany({
    where: { processed: false },
    take: 20,
    orderBy: { createdAt: "asc" },
  });

  if (unprocessed.length === 0) return { processed: 0 };

  await prisma.intelligenceSignal.updateMany({
    where: { id: { in: unprocessed.map(s => s.id) } },
    data: { processed: true, processedAt: new Date() },
  });

  for (const signal of unprocessed) {
    await prisma.systemExecutionLog.create({
      data: {
        sourceType: "system",
        sourceId: signal.id,
        event: "intelligence_signal_processed",
        details: JSON.stringify({
          signalType: signal.signalType,
          source: signal.source,
          title: signal.title,
        }),
      },
    }).catch(() => {});
  }

  return { processed: unprocessed.length };
}

export async function getSignalContextForTeam(teamId: string, limit = 5): Promise<string> {
  const signals = await prisma.intelligenceSignal.findMany({
    where: { OR: [{ teamId }, { teamId: null }], processed: false },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { signalType: true, title: true, content: true },
  });

  if (signals.length === 0) return "";

  return (
    "## Active Intelligence Signals\n" +
    signals.map(s => `[${s.signalType.toUpperCase()}] ${s.title}: ${s.content.slice(0, 200)}`).join("\n")
  );
}
