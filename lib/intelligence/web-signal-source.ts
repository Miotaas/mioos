/**
 * Web Search Signal Source
 *
 * Generates search queries from active projects, goals, and workforce objectives,
 * then executes them via Serper/Tavily and stores results as IntelligenceSignals.
 *
 * Rate control: WEB_SEARCH_INTERVAL_HOURS (default 6) — won't run more often.
 * Max queries per run: WEB_SEARCH_MAX_QUERIES (default 4) — cost control.
 */

import type { ISignalSource, IntelligenceSignalData } from "./provider";
import { prisma } from "@/lib/db";

const SEARCH_INTERVAL_H  = Number(process.env.WEB_SEARCH_INTERVAL_HOURS  ?? "6");
const MAX_QUERIES        = Number(process.env.WEB_SEARCH_MAX_QUERIES      ?? "4");
const STATE_KEY          = "runtime:webSearchLastRun";

export function createWebSignalSource(): ISignalSource {
  return {
    name:         "web_search",
    signalType:   "web",
    isConfigured: () => !!(process.env.SERPER_API_KEY || process.env.TAVILY_API_KEY),

    fetch: async (): Promise<IntelligenceSignalData[]> => {
      // Rate limiting check — don't spam external APIs
      const lastRunRec = await prisma.runtimeState.findUnique({
        where: { key: STATE_KEY },
      }).catch(() => null);
      if (lastRunRec) {
        const hoursSince = (Date.now() - new Date(lastRunRec.value).getTime()) / 3_600_000;
        if (hoursSince < SEARCH_INTERVAL_H) return [];
      }

      // Update last run timestamp before executing searches
      await prisma.runtimeState.upsert({
        where:  { key: STATE_KEY },
        create: { key: STATE_KEY, value: new Date().toISOString() },
        update: { value: new Date().toISOString() },
      });

      const queries = await buildSearchQueries();
      if (queries.length === 0) return [];

      const signals: IntelligenceSignalData[] = [];
      const { executeWebSearch } = await import("@/lib/connectors/webSearch");

      for (const { query, context } of queries.slice(0, MAX_QUERIES)) {
        try {
          const searchId = await executeWebSearch(query);
          const result   = await prisma.searchResearch.findUnique({
            where: { id: searchId },
          });
          if (!result || result.status === "failed") continue;

          // Parse stored sources
          let topSources: Array<{ title: string; snippet: string }> = [];
          try {
            topSources = (JSON.parse(result.sources ?? "[]") as Array<{ title: string; snippet: string }>).slice(0, 3);
          } catch { /* ignore parse error */ }

          const content = topSources.length > 0
            ? topSources.map(s => `• ${s.title}: ${s.snippet}`).join("\n")
            : result.summary ?? "";

          signals.push({
            signalType: "web",
            source:     "web_search",
            title:      `Web: ${query}`,
            content:    `${context}\n\n${content}`.slice(0, 800),
            metadata:   { query, searchId, source: result.status },
          });
        } catch (err) {
          console.error(`[web-signals] Search failed for "${query}":`, err);
        }
      }

      return signals;
    },
  };
}

async function buildSearchQueries(): Promise<Array<{ query: string; context: string }>> {
  const queries: Array<{ query: string; context: string }> = [];

  const [activeProjects, activeGoals] = await Promise.all([
    prisma.project.findMany({
      where:  { status: "active", priority: { in: ["high", "urgent"] } },
      select: { name: true, description: true },
      take:   2,
    }),
    prisma.goal.findMany({
      where:  { status: "active", goalType: "business" },
      select: { title: true, description: true },
      orderBy: { progress: "asc" },
      take:   2,
    }),
  ]);

  for (const project of activeProjects) {
    queries.push({
      query:   `${project.name} market trends 2025 competitors`,
      context: `Intelligence for project: ${project.name}`,
    });
  }

  for (const goal of activeGoals) {
    if (goal.title.toLowerCase().includes("revenue") || goal.title.toLowerCase().includes("mrr")) {
      queries.push({
        query:   "B2B SaaS revenue growth strategies 2025",
        context: `Intelligence for goal: ${goal.title}`,
      });
    } else {
      queries.push({
        query:   `${goal.title} strategy best practices`,
        context: `Intelligence for goal: ${goal.title}`,
      });
    }
  }

  return queries;
}
