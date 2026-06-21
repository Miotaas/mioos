/**
 * Phase A safety — runtime diagnostics.
 *
 * Read-only snapshot used by GET /api/runtime/diagnostics to confirm a fresh
 * deploy is actually producing work. No side effects, no new orchestration.
 */
import { prisma } from "@/lib/db";
import { isAIEnabled } from "@/lib/ai/provider";

export interface RuntimeDiagnostics {
  aiEnabled: boolean;
  aiWarning: string | null;
  teams: number;
  businessUnits: number;
  activeObjectives: number;
  dueObjectives: number;
  queuedAssignments: number;
  outputs24h: number;
  opportunities24h: number;
  approvals24h: number;
  generatedAt: string;
}

export async function getRuntimeDiagnostics(): Promise<RuntimeDiagnostics> {
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    teams,
    businessUnits,
    activeObjectives,
    dueObjectives,
    queuedAssignments,
    outputs24h,
    opportunities24h,
    approvals24h,
  ] = await Promise.all([
    prisma.workforceTeam.count(),
    prisma.businessUnit.count(),
    prisma.teamObjective.count({ where: { active: true } }),
    // "Due" mirrors evaluateObjectives(): fires when nextRunAt is null or in the past.
    prisma.teamObjective.count({
      where: { active: true, OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }] },
    }),
    prisma.runtimeQueue.count({ where: { status: "queued" } }),
    prisma.workforceOutput.count({ where: { createdAt: { gte: since24h } } }),
    prisma.opportunity.count({ where: { createdAt: { gte: since24h } } }),
    prisma.approval.count({ where: { createdAt: { gte: since24h } } }),
  ]);

  const aiEnabled = isAIEnabled();

  return {
    aiEnabled,
    aiWarning: aiEnabled
      ? null
      : "AI provider disabled: opportunity extraction will not run. Set ANTHROPIC_API_KEY (or OPENAI_API_KEY / OPENROUTER_API_KEY, or AI_PROVIDER=ollama).",
    teams,
    businessUnits,
    activeObjectives,
    dueObjectives,
    queuedAssignments,
    outputs24h,
    opportunities24h,
    approvals24h,
    generatedAt: now.toISOString(),
  };
}
