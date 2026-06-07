import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      latestBriefing,
      topRisks,
      topOpportunities,
      recentPatterns,
      recentInsights,
      insightCount,
      pendingPatternCount,
      activeResearch,
      completedResearch,
      latestEmailInsight,
      latestCalendarInsight,
    ] = await Promise.all([
      prisma.executiveBriefing.findFirst({ orderBy: { createdAt: "desc" } }),
      prisma.insight.findMany({
        where: { type: "risk", status: "active" },
        orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
        take: 3,
      }),
      prisma.insight.findMany({
        where: { type: "opportunity", status: "active" },
        orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
        take: 3,
      }),
      prisma.patternRecord.findMany({
        where: { status: { in: ["pending", "approved"] } },
        orderBy: [{ occurrences: "desc" }, { createdAt: "desc" }],
        take: 3,
      }),
      prisma.insight.findMany({
        where: { status: "active" },
        orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
        take: 5,
      }),
      prisma.insight.count({ where: { status: "active" } }),
      prisma.patternRecord.count({ where: { status: "pending" } }),
      prisma.researchRequest.count({ where: { status: { in: ["pending", "running"] } } }),
      prisma.researchRequest.count({ where: { status: "completed" } }),
      prisma.emailInsight.findFirst({ orderBy: { createdAt: "desc" } }),
      prisma.calendarInsight.findFirst({ orderBy: { createdAt: "desc" } }),
    ]);

    return NextResponse.json({
      latestBriefing,
      topRisks,
      topOpportunities,
      recentPatterns,
      recentInsights,
      insightCount,
      pendingPatternCount,
      activeResearch,
      completedResearch,
      latestEmailInsight,
      latestCalendarInsight,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch intelligence overview" }, { status: 500 });
  }
}
