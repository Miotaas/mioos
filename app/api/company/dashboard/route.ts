import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAllocationPlan } from "@/lib/company/capital-allocator";

/**
 * Company Command Center — the founder's 5-question dashboard:
 * 1. What is making money?
 * 2. What opportunities were discovered?
 * 3. What projects are progressing?
 * 4. What is blocked?
 * 5. What needs approval?
 * + What is the highest ROI action?
 */
export async function GET() {
  const now = new Date();
  const sevenDaysAgo  = new Date(now.getTime() - 7 * 86_400_000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

  const [
    // 1. Revenue — what is making money
    revenueEntries,
    revenueTotals,

    // 2. Opportunities — what was discovered
    recentOpportunities,
    oppFunnel,

    // 3. Projects — what is progressing
    activeProjects,

    // 4. Blocked — what needs attention
    blockedProjects,
    stalledOpportunities,

    // 5. Approvals — what needs a decision
    pendingApprovals,

    // Artifacts this week
    artifactsThisWeek,

    // Runtime health
    runtimeHeartbeat,
    lastLoopCount,

    // Goals
    activeGoals,
  ] = await Promise.all([
    // Revenue entries active
    prisma.revenueEntry.findMany({
      where:   { status: "active" },
      orderBy: { amount: "desc" },
      take:    10,
      select:  { title: true, amount: true, revenueType: true, currency: true, probability: true },
    }),
    // Revenue totals
    prisma.revenueEntry.groupBy({
      by: ["revenueType"],
      _sum: { amount: true },
      where: { status: "active" },
    }),

    // Recent opportunities (last 7 days)
    prisma.opportunity.findMany({
      where:   { createdAt: { gte: sevenDaysAgo }, status: { notIn: ["rejected", "archived"] } },
      orderBy: { score: "desc" },
      take:    8,
      select:  { id: true, title: true, opportunityType: true, score: true, confidence: true,
                 estimatedRevenue: true, status: true, currentStage: true, createdAt: true },
    }),
    // Opportunity funnel counts
    prisma.opportunity.groupBy({
      by:    ["status"],
      _count: { id: true },
      where: { status: { notIn: ["rejected", "archived"] } },
    }),

    // Active projects
    prisma.project.findMany({
      where:   { status: "active" },
      orderBy: { updatedAt: "desc" },
      take:    8,
      select:  { id: true, name: true, status: true, priority: true,
                 revenueImpact: true, nextAction: true, updatedAt: true, autoCreated: true },
    }),

    // Blocked projects
    prisma.project.findMany({
      where:   { status: "blocked" },
      select:  { id: true, name: true, blocker: true, priority: true },
    }),
    // Stalled opportunities (not updated in 3 days)
    prisma.opportunity.findMany({
      where:  {
        status:    { in: ["researching", "validating"] },
        updatedAt: { lt: new Date(now.getTime() - 3 * 86_400_000) },
      },
      select: { id: true, title: true, status: true, currentStage: true, updatedAt: true },
      take:   5,
    }),

    // Pending approvals
    prisma.approval.findMany({
      where:   { status: "pending" },
      orderBy: { priority: "desc" },
      take:    10,
      select:  { id: true, title: true, priority: true, decisionType: true, createdAt: true,
                 description: true, sourceTeam: { select: { name: true } } },
    }),

    // Artifacts produced this week
    prisma.artifact.count({ where: { createdAt: { gte: sevenDaysAgo }, status: { not: "archived" } } }),

    // Runtime health
    prisma.runtimeState.findUnique({ where: { key: "runtime:heartbeat" } }),
    prisma.runtimeState.findUnique({ where: { key: "runtime:loopCount" } }),

    // Active goals
    prisma.goal.findMany({
      where:   { status: "active" },
      select:  { id: true, title: true, progress: true, target: true, goalType: true },
      take:    5,
    }),
  ]);

  // Revenue aggregation
  const mrr     = revenueTotals.find(r => r.revenueType === "mrr")?._sum.amount ?? 0;
  const arr     = revenueTotals.find(r => r.revenueType === "arr")?._sum.amount ?? 0;
  const oneTime = revenueTotals.find(r => r.revenueType === "one_time")?._sum.amount ?? 0;
  const potential = revenueTotals.find(r => r.revenueType === "potential")?._sum.amount ?? 0;

  // Opportunity funnel
  const funnelMap = Object.fromEntries(oppFunnel.map(f => [f.status, f._count.id]));
  const totalActive = Object.values(funnelMap).reduce((s, n) => s + n, 0);

  // Capital allocation plan
  const allocationPlan = await getAllocationPlan();

  // Top ROI action — from allocation plan or top opportunity
  const topAction = allocationPlan?.[0]
    ? {
        opportunityId:   allocationPlan[0].opportunityId,
        title:           allocationPlan[0].title,
        type:            allocationPlan[0].opportunityType,
        roi:             allocationPlan[0].roi,
        recommendation:  allocationPlan[0].recommendation,
        allocationPct:   allocationPlan[0].allocationPct,
      }
    : null;

  // Runtime status
  const workerAlive = runtimeHeartbeat
    ? (now.getTime() - new Date(runtimeHeartbeat.value as string).getTime()) < 5 * 60_000
    : false;

  return NextResponse.json({
    generatedAt: now.toISOString(),

    // 1. Revenue
    revenue: {
      mrr,
      arr,
      oneTime,
      potential,
      total: mrr + arr + oneTime,
      entries: revenueEntries,
    },

    // 2. Opportunities discovered
    opportunities: {
      recentCount:  recentOpportunities.length,
      recent:       recentOpportunities,
      totalActive,
      funnel:       funnelMap,
    },

    // 3. Projects progressing
    projects: {
      active: activeProjects,
      count:  activeProjects.length,
    },

    // 4. Blocked / stalled
    blocked: {
      blockedProjects,
      stalledOpportunities,
      totalIssues: blockedProjects.length + stalledOpportunities.length,
    },

    // 5. Approvals needed
    approvals: {
      pending:       pendingApprovals,
      pendingCount:  pendingApprovals.length,
    },

    // Strategic context
    goals:           activeGoals as Array<{ id: string; title: string; progress: number; target: number | null; goalType: string }>,
    artifactsThisWeek,
    topROIAction:    topAction,
    allocationPlan:  allocationPlan?.slice(0, 5) ?? [],

    // System health
    runtime: {
      alive:    workerAlive,
      lastBeat: runtimeHeartbeat?.value ?? null,
      loopCount: lastLoopCount ? Number(lastLoopCount.value) : 0,
    },
  });
}
