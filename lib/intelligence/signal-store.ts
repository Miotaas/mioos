import { prisma } from "@/lib/db";
import type { IntelligenceSignalData } from "./provider";

export async function storeSignal(signal: IntelligenceSignalData): Promise<string> {
  const record = await prisma.intelligenceSignal.create({
    data: {
      signalType: signal.signalType,
      source: signal.source,
      title: signal.title,
      content: signal.content,
      metadata: JSON.stringify(signal.metadata ?? {}),
      processed: false,
    },
  });
  return record.id;
}

export async function getRecentSignals(
  types?: IntelligenceSignalData["signalType"][],
  limit = 20,
): Promise<Array<{
  id: string;
  signalType: string;
  source: string;
  title: string;
  content: string;
  createdAt: string;
}>> {
  const signals = await prisma.intelligenceSignal.findMany({
    where: types?.length ? { signalType: { in: types } } : {},
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return signals.map(s => ({
    id: s.id,
    signalType: s.signalType,
    source: s.source,
    title: s.title,
    content: s.content,
    createdAt: s.createdAt.toISOString(),
  }));
}

export function buildSignalContext(
  signals: Array<{ signalType: string; title: string; content: string }>,
): string {
  if (signals.length === 0) return "";
  return (
    "## External Intelligence Signals\n" +
    signals.map(s => `[${s.signalType.toUpperCase()}] ${s.title}: ${s.content.slice(0, 150)}`).join("\n")
  );
}
