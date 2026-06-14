import { NextResponse } from "next/server";
import { getRuntimeHealth } from "@/lib/runtime-status";
import { getAllProjectHealth } from "@/lib/executive/executive-health";
import { getRevenueIntelligence } from "@/lib/executive/executive-analysis";
import { generateRecommendations } from "@/lib/executive/executive-recommendations";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const since24h = new Date(Date.now() - 86_400_000);

    const [runtime, projectHealth, revenue, recommendations, wfStats] = await Promise.all([
      getRuntimeHealth(),
      getAllProjectHealth(),
      getRevenueIntelligence(),
      generateRecommendations(),
      Promise.all([
        prisma.assignment.count({ where: { status: "pending" } }),
        prisma.assignment.count({ where: { status: "active" } }),
        prisma.assignment.count({
          where: { status: "completed", completedAt: { gte: since24h } },
        }),
        prisma.workforceOutput.count({ where: { createdAt: { gte: since24h } } }),
      ]).then(([queued, running, completedToday, outputsToday]) => ({
        queued, running, completedToday, outputsToday,
      })),
    ]);

    // Compute today's top priority from recommendations
    const topRec = recommendations[0];
    const todayPriority = topRec
      ? topRec.title
      : "No blockers detected. A good day to push things forward.";

    // Top 3 project risks (critical first, then warning)
    const projectRisks = projectHealth
      .filter(p => p.health.status === "critical" || p.health.status === "warning")
      .sort((a, b) => a.health.score - b.health.score)
      .slice(0, 3)
      .map(p => ({
        name: p.name,
        status: p.status,
        health: p.health.status,
        score: p.health.score,
        blocker: p.blocker,
        nextAction: p.nextAction,
        reasons: p.health.reasons,
      }));

    return NextResponse.json({
      todayPriority,
      runtimeStatus: runtime,
      actionRequired: recommendations.slice(0, 5),
      workforceActivity: wfStats,
      projectRisks,
      revenueMovement: {
        live: revenue.live,
        pipeline: revenue.pipeline,
        potential: revenue.potential,
        atRisk: revenue.atRisk,
        fastestPath: revenue.fastestPath,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[dashboard/live]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
