import type { ISignalSource, IntelligenceSignalData } from "./provider";
import { storeSignal } from "./signal-store";

const _sources = new Map<string, ISignalSource>();

export function registerSource(source: ISignalSource): void {
  _sources.set(source.name, source);
}

export function getRegisteredSources(): ISignalSource[] {
  return Array.from(_sources.values());
}

export function getConfiguredSources(): ISignalSource[] {
  return Array.from(_sources.values()).filter(s => s.isConfigured());
}

export async function fetchAllSignals(): Promise<{ fetched: number; stored: number }> {
  let fetched = 0;
  let stored = 0;

  for (const source of _sources.values()) {
    if (!source.isConfigured()) continue;
    try {
      const signals = await source.fetch();
      fetched += signals.length;
      for (const signal of signals) {
        await storeSignal(signal);
        stored++;
      }
    } catch (err) {
      console.error(`[intelligence] Source "${source.name}" failed:`, err);
    }
  }

  return { fetched, stored };
}

// Built-in internal signal source: reads from MioOS DB state
export function createInternalSignalSource(): ISignalSource {
  return {
    name: "internal",
    signalType: "internal",
    isConfigured: () => true,
    fetch: async (): Promise<IntelligenceSignalData[]> => {
      // Import here to avoid circular dep at load time
      const { prisma } = await import("@/lib/db");
      const signals: IntelligenceSignalData[] = [];

      // Check for critical support issues
      const criticalIssues = await prisma.supportIssue.findMany({
        where: { severity: "critical", status: { notIn: ["resolved", "archived"] } },
        take: 3,
        select: { title: true, description: true },
      });
      for (const issue of criticalIssues) {
        signals.push({
          signalType: "internal",
          source: "support_module",
          title: `Critical: ${issue.title}`,
          content: issue.description ?? issue.title,
        });
      }

      // Check for overdue leads
      const now = new Date();
      const overdueLeads = await prisma.lead.count({
        where: {
          status: { notIn: ["won", "lost", "archived"] },
          nextActionDate: { lt: now },
        },
      });
      if (overdueLeads > 0) {
        signals.push({
          signalType: "internal",
          source: "leads_module",
          title: `${overdueLeads} leads have overdue follow-up actions`,
          content: `${overdueLeads} active leads have passed their next action date without contact.`,
        });
      }

      return signals;
    },
  };
}
