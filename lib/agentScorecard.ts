/**
 * Agent Scorecard Calculator
 *
 * Deterministic 0–10 scoring. No AI required.
 *
 * Reliability  = successful runs / total runs  × 10
 * Execution    = delegations completed / delegations assigned  × 10
 * Quality      = approvals approved / approvals created  × 10  (5 if none)
 * Usefulness   = weighted activity points, capped at 10
 * Overall      = reliability × 0.25 + execution × 0.30 + quality × 0.25 + usefulness × 0.20
 */

import { prisma } from "@/lib/db";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function clamp(n: number, min = 0, max = 10): number {
  return Math.max(min, Math.min(max, n));
}

export interface ScorecardResult {
  agentId: string;
  periodStart: Date;
  periodEnd: Date;
  runsCompleted: number;
  runsFailed: number;
  delegationsAssigned: number;
  delegationsCompleted: number;
  delegationsFailed: number;
  messagesSent: number;
  reviewsCompleted: number;
  approvalsCreated: number;
  approvalsApproved: number;
  approvalsRejected: number;
  memoriesCreated: number;
  insightsGenerated: number;
  reliabilityScore: number;
  executionScore: number;
  qualityScore: number;
  usefulnessScore: number;
  overallScore: number;
  summary: string;
}

export async function generateAgentScorecard(
  agentId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<ScorecardResult> {
  const [
    runs,
    delegationsAssigned,
    delegationsCompleted,
    delegationsFailed,
    messagesSent,
    reviewsCompleted,
    approvalsCreated,
    approvalsApproved,
    approvalsRejected,
    memoriesCreated,
    insightsGenerated,
  ] = await Promise.all([
    prisma.agentRun.findMany({
      where: { agentId, createdAt: { gte: periodStart, lte: periodEnd } },
      select: { status: true },
    }),
    prisma.agentDelegation.count({
      where: { assignedToAgentId: agentId, createdAt: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.agentDelegation.count({
      where: { assignedToAgentId: agentId, status: "completed", createdAt: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.agentDelegation.count({
      where: { assignedToAgentId: agentId, status: "failed", createdAt: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.agentMessage.count({
      where: { fromAgentId: agentId, createdAt: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.agentReviewRequest.count({
      where: {
        reviewerAgentId: agentId,
        status: { in: ["approved", "rejected", "needs_changes"] },
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.approvalQueue.count({
      where: { agentRun: { agentId }, createdAt: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.approvalQueue.count({
      where: { agentRun: { agentId }, status: "approved", createdAt: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.approvalQueue.count({
      where: { agentRun: { agentId }, status: "rejected", createdAt: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.agentMemory.count({
      where: { agentId, createdAt: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.insight.count({
      where: { agentId, createdAt: { gte: periodStart, lte: periodEnd } },
    }),
  ]);

  const runsCompleted = runs.filter(r => r.status === "completed").length;
  const runsFailed = runs.filter(r => r.status === "failed").length;
  const totalRuns = runsCompleted + runsFailed;

  // ── Score calculations ────────────────────────────────────────

  const reliabilityScore = round1(
    clamp(totalRuns > 0 ? (runsCompleted / totalRuns) * 10 : 5)
  );

  const executionScore = round1(
    clamp(delegationsAssigned > 0 ? (delegationsCompleted / delegationsAssigned) * 10 : 5)
  );

  const qualityScore = round1(
    clamp(approvalsCreated > 0 ? (approvalsApproved / approvalsCreated) * 10 : 5)
  );

  const usefulnessRaw =
    memoriesCreated * 1.5 +
    insightsGenerated * 2.0 +
    reviewsCompleted * 0.8 +
    messagesSent * 0.2 +
    delegationsCompleted * 0.5;
  const usefulnessScore = round1(clamp(usefulnessRaw));

  const overallScore = round1(
    reliabilityScore * 0.25 +
    executionScore  * 0.30 +
    qualityScore    * 0.25 +
    usefulnessScore * 0.20
  );

  const summary = buildSummary({
    runsCompleted, runsFailed, delegationsAssigned, delegationsCompleted,
    memoriesCreated, insightsGenerated, overallScore,
  });

  // ── Persist scorecard ─────────────────────────────────────────
  await prisma.agentScorecard.create({
    data: {
      agentId, periodStart, periodEnd,
      runsCompleted, runsFailed,
      delegationsAssigned, delegationsCompleted, delegationsFailed,
      messagesSent, reviewsCompleted,
      approvalsCreated, approvalsApproved, approvalsRejected,
      memoriesCreated, insightsGenerated,
      reliabilityScore, executionScore, qualityScore,
      usefulnessScore, overallScore, summary,
    },
  });

  return {
    agentId, periodStart, periodEnd,
    runsCompleted, runsFailed,
    delegationsAssigned, delegationsCompleted, delegationsFailed,
    messagesSent, reviewsCompleted,
    approvalsCreated, approvalsApproved, approvalsRejected,
    memoriesCreated, insightsGenerated,
    reliabilityScore, executionScore, qualityScore,
    usefulnessScore, overallScore, summary,
  };
}

function buildSummary(d: {
  runsCompleted: number; runsFailed: number; delegationsAssigned: number;
  delegationsCompleted: number; memoriesCreated: number; insightsGenerated: number;
  overallScore: number;
}): string {
  const parts: string[] = [];
  if (d.runsCompleted > 0)
    parts.push(`${d.runsCompleted} run${d.runsCompleted > 1 ? "s" : ""} completed`);
  if (d.runsFailed > 0)
    parts.push(`${d.runsFailed} failed`);
  if (d.delegationsCompleted > 0)
    parts.push(`${d.delegationsCompleted}/${d.delegationsAssigned} delegations done`);
  if (d.memoriesCreated > 0)
    parts.push(`${d.memoriesCreated} memor${d.memoriesCreated > 1 ? "ies" : "y"} created`);
  if (d.insightsGenerated > 0)
    parts.push(`${d.insightsGenerated} insight${d.insightsGenerated > 1 ? "s" : ""} generated`);
  if (parts.length === 0) return "No activity in this period.";
  return `Overall ${d.overallScore}/10. ${parts.join(", ")}.`;
}

// Generate scorecards for all active agents over the last 7 days
export async function generateAllScorecards(): Promise<{ agentId: string; score: number }[]> {
  const agents = await prisma.agent.findMany({
    where: { status: "active" },
    select: { id: true },
  });

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const results: { agentId: string; score: number }[] = [];

  for (const agent of agents) {
    const card = await generateAgentScorecard(agent.id, weekAgo, now);
    results.push({ agentId: agent.id, score: card.overallScore });
  }

  return results;
}
