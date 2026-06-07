import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      activeGoals,
      latestRun,
      recentRuns,
      openDelegations,
      pendingReviews,
      latestScorecards,
    ] = await Promise.all([
      prisma.agentGoal.findMany({
        where: { status: "active" },
        include: { agent: { select: { id: true, name: true, slug: true } } },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      prisma.executiveLoopRun.findFirst({ orderBy: { startedAt: "desc" } }),
      prisma.executiveLoopRun.findMany({ orderBy: { startedAt: "desc" }, take: 10 }),
      prisma.agentDelegation.count({
        where: { status: { in: ["pending", "accepted", "running"] } },
      }),
      prisma.agentReviewRequest.count({ where: { status: { in: ["pending", "in_review"] } } }),
      prisma.agentScorecard.findMany({
        include: { agent: { select: { id: true, name: true, slug: true, role: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    // Get latest scorecard per agent
    const seenAgents = new Set<string>();
    const uniqueScorecards = latestScorecards.filter(s => {
      if (seenAgents.has(s.agentId)) return false;
      seenAgents.add(s.agentId);
      return true;
    });

    const sorted = [...uniqueScorecards].sort((a, b) => b.overallScore - a.overallScore);
    const topAgent = sorted.at(0) ?? null;
    const weakestAgent = sorted.at(-1) !== topAgent ? sorted.at(-1) ?? null : null;

    return NextResponse.json({
      activeGoals,
      latestRun,
      recentRuns,
      openDelegations,
      pendingReviews,
      topAgent,
      weakestAgent,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch executive loop overview" }, { status: 500 });
  }
}
