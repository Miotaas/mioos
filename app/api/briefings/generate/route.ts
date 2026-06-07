import { NextRequest, NextResponse } from "next/server";
import { generateAndStoreInsights } from "@/lib/insightEngine";
import { analyzeAndQueuePatterns } from "@/lib/patternAnalyzer";
import { generateExecutiveBriefing } from "@/lib/briefingGenerator";
import { prisma } from "@/lib/db";

// Manual briefing generation — creates a synthetic run context and fires all intelligence hooks.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { agentId?: string };

    // Find the most recently active agent to attach the briefing to, or use a sentinel value
    let agentId = body.agentId ?? "";
    if (!agentId) {
      const latest = await prisma.agentRun.findFirst({
        where: { status: "completed" },
        orderBy: { completedAt: "desc" },
        select: { agentId: true, id: true },
      });
      agentId = latest?.agentId ?? "manual";
    }

    // Create a synthetic run record for attribution
    const run = await prisma.agentRun.create({
      data: {
        agentId: agentId === "manual" ? (await getOrCreateManualAgent()) : agentId,
        status: "completed",
        startedAt: new Date(),
        completedAt: new Date(),
        output: JSON.stringify({ summary: "Manual intelligence briefing", recommendations: [], insights: [], proposedActions: [] }),
      },
    });

    await generateAndStoreInsights(run.agentId, run.id);
    await analyzeAndQueuePatterns(run.agentId, run.id);
    await generateExecutiveBriefing(run.agentId, run.id);

    const briefing = await prisma.executiveBriefing.findFirst({
      where: { runId: run.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, briefing: briefing ?? null });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate briefing" },
      { status: 500 },
    );
  }
}

async function getOrCreateManualAgent(): Promise<string> {
  const existing = await prisma.agent.findFirst({ where: { slug: "manual-briefing" } });
  if (existing) return existing.id;
  const created = await prisma.agent.create({
    data: {
      name: "Manual Briefing",
      slug: "manual-briefing",
      description: "Synthetic agent for manually triggered intelligence briefings",
      agentType: "strategy",
      status: "active",
      requiresApproval: false,
    },
  });
  return created.id;
}
