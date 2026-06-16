/**
 * Executive Orchestrator — the internal CEO of MioOS.
 *
 * Runs once per day (configurable via ORCHESTRATOR_INTERVAL_H).
 * Responsibilities:
 *   - Auto-reject low-potential opportunities (score ≤ 2, confidence ≤ 3)
 *   - Promote high-confidence opportunities to "validating"
 *   - Flag stalled opportunities for executive review
 *   - Monitor revenue pipeline vs. goal targets
 *   - Create a daily strategic briefing assignment for the Executive team
 *   - Detect teams producing no output (throughput alert)
 */

import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/auditLog";
import { getThrottleStatus } from "@/lib/autonomy-throttle";

export const KEY_LAST_ORCHESTRATION   = "runtime:lastOrchestration";
export const ORCHESTRATION_INTERVAL_H = Number(process.env.ORCHESTRATOR_INTERVAL_H ?? "24");

// ── Portfolio Actions ──────────────────────────────────────────────────

async function autoRejectWeakOpportunities(): Promise<number> {
  const weak = await prisma.opportunity.findMany({
    where: {
      score:      { lte: 2 },
      confidence: { lte: 3 },
      status:     { in: ["discovered", "researching"] },
    },
    select: { id: true, title: true },
  });

  let rejected = 0;
  for (const opp of weak) {
    await prisma.opportunity.update({
      where: { id: opp.id },
      data: {
        status:              "rejected",
        nextRecommendedStep: "Auto-rejected by Executive Orchestrator — insufficient potential (score ≤ 2, confidence ≤ 3)",
      },
    });
    await auditLog("opportunity", opp.id, "auto_rejected", { reason: "low_score_confidence" });
    rejected++;
  }
  return rejected;
}

async function promoteHighConfidenceOpportunities(): Promise<number> {
  const strong = await prisma.opportunity.findMany({
    where: {
      score:      { gte: 8 },
      confidence: { gte: 7 },
      status:     "researching",
    },
    select: { id: true, title: true },
  });

  let promoted = 0;
  for (const opp of strong) {
    await prisma.opportunity.update({
      where: { id: opp.id },
      data: { status: "validating", currentStage: "executive_validation" },
    });
    await auditLog("opportunity", opp.id, "promoted_to_validating", { reason: "high_score_confidence" });
    promoted++;
  }
  return promoted;
}

// ── Revenue Gap Detection ──────────────────────────────────────────────

async function detectRevenueGap(): Promise<{ hasGap: boolean; targetAmount: number; pipelineAmount: number; gap: number }> {
  const [goals, pipeline] = await Promise.all([
    prisma.goal.findMany({
      where: { status: "active", goalType: "business", target: { gt: 0 } },
      select: { target: true },
    }),
    prisma.revenueEntry.aggregate({
      _sum: { amount: true },
      where: { status: "active" },
    }),
  ]);

  const targetAmount   = goals.reduce((sum, g) => sum + (g.target ?? 0), 0);
  const pipelineAmount = pipeline._sum.amount ?? 0;
  const gap            = Math.max(0, targetAmount - pipelineAmount);

  return { hasGap: gap > 0, targetAmount, pipelineAmount, gap };
}

// ── Throughput Check ──────────────────────────────────────────────────

async function detectLowThroughputTeams(): Promise<string[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);

  const teams = await prisma.workforceTeam.findMany({
    where:   { status: "active" },
    include: {
      outputs: {
        where:  { createdAt: { gte: sevenDaysAgo } },
        select: { id: true },
      },
    },
  });

  return teams
    .filter(t => t.outputs.length === 0)
    .map(t => t.name);
}

// ── Executive Daily Review Assignment ────────────────────────────────

async function createDailyReviewAssignment(context: {
  rejected:             number;
  promoted:             number;
  stalledCount:         number;
  stalledTitles:        string[];
  revenueGap:           { hasGap: boolean; targetAmount: number; pipelineAmount: number; gap: number };
  pendingApprovals:     number;
  activeOpportunities:  number;
  artifactsThisWeek:    number;
  lowThroughputTeams:   string[];
  topOpportunity:       { title: string; score: number; opportunityType: string } | null;
  throttleBreaches:     string[];
  throttleMode:         string;
  throttlePauseReason:  string | null;
}): Promise<void> {
  const execTeam = await prisma.workforceTeam.findFirst({
    where:   { departmentType: "executive", status: "active" },
    include: { autonomyConfig: true },
  });
  if (!execTeam?.autonomyConfig?.canSelfInitiate) return;

  const { rejected, promoted, stalledCount, stalledTitles, revenueGap, pendingApprovals,
          activeOpportunities, artifactsThisWeek, lowThroughputTeams, topOpportunity,
          throttleBreaches, throttleMode, throttlePauseReason } = context;

  const revenueStatus = revenueGap.hasGap
    ? `⚠️ Revenue gap: €${revenueGap.gap.toLocaleString()} below target (pipeline: €${revenueGap.pipelineAmount.toLocaleString()}, target: €${revenueGap.targetAmount.toLocaleString()})`
    : `✅ Pipeline on track: €${revenueGap.pipelineAmount.toLocaleString()}`;

  const title = `Daily Strategic Review — Portfolio, Revenue & Team Throughput`;

  const description = [
    `## Executive Orchestrator — Daily Strategic Review`,
    `Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
    ``,
    `### Portfolio Status`,
    `- Active opportunities: ${activeOpportunities}`,
    `- Auto-rejected this cycle: ${rejected} (low score/confidence)`,
    `- Promoted to validation: ${promoted} (high score/confidence)`,
    `- Stalled opportunities (3+ days): ${stalledCount}`,
    stalledCount > 0 ? `  - Stalled: ${stalledTitles.slice(0, 3).join(", ")}` : "",
    ``,
    `### Revenue Intelligence`,
    revenueStatus,
    `- Pending founder approvals: ${pendingApprovals}`,
    `- Artifacts produced this week: ${artifactsThisWeek}`,
    ``,
    topOpportunity ? `### Top Opportunity\n"${topOpportunity.title}" — type: ${topOpportunity.opportunityType}, score: ${topOpportunity.score}/10` : "",
    ``,
    lowThroughputTeams.length > 0
      ? `### ⚠️ Low Throughput Alert\nTeams with no output in 7 days: ${lowThroughputTeams.join(", ")}`
      : "",
    ``,
    throttleBreaches.length > 0
      ? [
          `### ⚠️ Autonomy Throttle — Action Required`,
          `Focus mode: **${throttleMode}**`,
          throttlePauseReason ? `Last pause reason: "${throttlePauseReason}"` : "",
          `Limits breached:`,
          ...throttleBreaches.map(b => `- ${b}`),
          ``,
          `New external-facing work (sales/marketing/development assignments) is paused until limits clear.`,
          `To restore capacity: approve or reject pending approvals, or switch to a higher focus mode in Settings.`,
        ].filter(Boolean).join("\n")
      : `### Autonomy Throttle\nFocus mode: **${throttleMode}** — all limits within range.`,
    ``,
    `### Your Tasks`,
    `1. Review the opportunity portfolio — which opportunities are closest to revenue?`,
    `2. For stalled opportunities, determine: continue, pivot, or reject?`,
    `3. Assess team throughput — are teams working on the right things?`,
    `4. Evaluate revenue gap — what actions would close it fastest?`,
    `5. Prioritize: which ONE opportunity should the entire system focus on this week?`,
    `6. Identify any blockers requiring founder attention`,
    `7. Generate a concrete "Top 3 Actions for This Week" list`,
    ``,
    `### Output Required`,
    `Your output should be an executive review with:`,
    `- Portfolio assessment (1-2 paragraphs)`,
    `- Priority recommendation (1 opportunity to focus on)`,
    `- Revenue pathway (how to reach the revenue target)`,
    `- Team reallocation recommendations (if needed)`,
    `- 3 concrete actions for this week`,
    `- Risks requiring founder attention`,
  ].filter(s => s !== "").join("\n");

  const assignment = await prisma.assignment.create({
    data: { title, description, teamId: execTeam.id, priority: "high", status: "pending" },
  });

  await prisma.runtimeQueue.create({
    data: {
      teamId:       execTeam.id,
      assignmentId: assignment.id,
      title,
      description:  description.slice(0, 500),
      priority:     "high",
      source:       "executive",
      status:       "queued",
    },
  });
}

// ── Main Orchestrator ─────────────────────────────────────────────────

export interface OrchestratorResult {
  acted:   boolean;
  summary: string;
}

export async function runExecutiveOrchestrator(): Promise<OrchestratorResult> {
  const now          = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 86_400_000);
  const weekAgo      = new Date(now.getTime() - 7 * 86_400_000);

  // 1. Auto-reject weak opportunities
  const rejected = await autoRejectWeakOpportunities();

  // 2. Promote high-confidence opportunities
  const promoted = await promoteHighConfidenceOpportunities();

  // 3. Find stalled opportunities
  const stalledOpps = await prisma.opportunity.findMany({
    where: {
      status:           "researching",
      workflowRoutedAt: { lt: threeDaysAgo, not: null },
    },
    select: { id: true, title: true },
    take:   5,
  });

  // 4. Revenue gap analysis
  const revenueGap = await detectRevenueGap();

  // 5. Throughput check
  const lowThroughputTeams = await detectLowThroughputTeams();

  // 6. Context summary
  const [activeOpportunities, pendingApprovals, artifactsThisWeek, topOpportunity, throttle] = await Promise.all([
    prisma.opportunity.count({ where: { status: { notIn: ["rejected", "archived"] } } }),
    prisma.approval.count({ where: { status: "pending" } }),
    prisma.artifact.count({ where: { createdAt: { gte: weekAgo }, status: { not: "archived" } } }),
    prisma.opportunity.findFirst({
      where:   { status: { notIn: ["rejected", "archived"] } },
      orderBy: [{ score: "desc" }, { confidence: "desc" }],
      select:  { title: true, score: true, opportunityType: true },
    }),
    getThrottleStatus(),
  ]);

  // 7. Create daily strategic review assignment
  await createDailyReviewAssignment({
    rejected,
    promoted,
    stalledCount:        stalledOpps.length,
    stalledTitles:       stalledOpps.map(o => o.title),
    revenueGap,
    pendingApprovals,
    activeOpportunities,
    artifactsThisWeek,
    lowThroughputTeams,
    topOpportunity,
    throttleBreaches:    throttle.breaches,
    throttleMode:        throttle.mode,
    throttlePauseReason: throttle.lastPauseReason,
  });

  const parts: string[] = [];
  if (rejected > 0)            parts.push(`rejected ${rejected} weak`);
  if (promoted > 0)            parts.push(`promoted ${promoted} to validation`);
  if (stalledOpps.length > 0)  parts.push(`flagged ${stalledOpps.length} stalled`);
  if (revenueGap.hasGap)       parts.push(`revenue gap €${revenueGap.gap.toLocaleString()}`);
  if (lowThroughputTeams.length > 0) parts.push(`${lowThroughputTeams.length} low-throughput team(s)`);

  return {
    acted:   rejected > 0 || promoted > 0 || stalledOpps.length > 0,
    summary: parts.length > 0 ? parts.join(", ") : "no critical actions",
  };
}
