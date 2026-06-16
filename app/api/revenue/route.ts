import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const entries = await prisma.revenueEntry.findMany({
      orderBy: { createdAt: "desc" },
    });

    const actual = entries
      .filter((e) => e.revenueType === "live" || e.status === "closed_won")
      .reduce((sum, e) => sum + e.amount, 0);

    const pipelineEntries = entries.filter((e) => e.revenueType === "pipeline");
    const pipeline = pipelineEntries.reduce((sum, e) => sum + e.amount, 0);

    const weightedPipeline = pipelineEntries.reduce(
      (sum, e) => sum + e.amount * (e.probability ?? 0.5),
      0
    );

    // Projected = actual + weighted pipeline
    const projected = actual + weightedPipeline;

    // By team (keyed by sourceTeamId, null = unassigned)
    const byTeam: Record<string, { actual: number; pipeline: number }> = {};
    for (const e of entries) {
      const key = e.sourceTeamId ?? "__unassigned";
      if (!byTeam[key]) byTeam[key] = { actual: 0, pipeline: 0 };
      if (e.revenueType === "live" || e.status === "closed_won") {
        byTeam[key].actual += e.amount;
      } else if (e.revenueType === "pipeline") {
        byTeam[key].pipeline += e.amount;
      }
    }

    return NextResponse.json({
      actual,
      pipeline,
      projected,
      currency: "EUR",
      byTeam,
      entries: entries.slice(0, 20),
    });
  } catch (err) {
    console.error("[revenue GET]", err);
    return NextResponse.json({ error: "Failed to fetch revenue" }, { status: 500 });
  }
}
