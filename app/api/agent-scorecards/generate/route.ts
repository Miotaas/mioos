import { NextRequest, NextResponse } from "next/server";
import { generateAgentScorecard, generateAllScorecards } from "@/lib/agentScorecard";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const periodStart = body.periodStart ? new Date(body.periodStart) : weekAgo;
    const periodEnd = body.periodEnd ? new Date(body.periodEnd) : now;

    // Single agent
    if (body.agentId) {
      const result = await generateAgentScorecard(body.agentId, periodStart, periodEnd);
      return NextResponse.json(result, { status: 201 });
    }

    // All agents
    const results = await generateAllScorecards();
    return NextResponse.json({ generated: results.length, results }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate scorecards";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
