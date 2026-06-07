import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const take = Math.min(parseInt(searchParams.get("take") ?? "50"), 100);

    const requests = await prisma.researchRequest.findMany({
      where: status ? { status } : {},
      include: { results: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
      take,
    });

    const agentIds = [...new Set(requests.map(r => r.requestedByAgentId).filter(Boolean))] as string[];
    const agents = agentIds.length > 0
      ? await prisma.agent.findMany({ where: { id: { in: agentIds } }, select: { id: true, name: true } })
      : [];
    const agentMap = new Map(agents.map(a => [a.id, a]));

    const enriched = requests.map(r => ({
      ...r,
      requestedByAgent: r.requestedByAgentId ? (agentMap.get(r.requestedByAgentId) ?? null) : null,
    }));

    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json({ error: "Failed to fetch research requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, objective, priority, requestedByAgentId, workspaceId } = body;

    if (!title?.trim() || !objective?.trim()) {
      return NextResponse.json({ error: "title and objective are required" }, { status: 400 });
    }

    const request = await prisma.researchRequest.create({
      data: {
        title: title.trim(),
        objective: objective.trim(),
        priority: priority ?? "medium",
        requestedByAgentId: requestedByAgentId ?? null,
        workspaceId: workspaceId ?? null,
        status: "pending",
      },
    });

    return NextResponse.json(request, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create research request" }, { status: 500 });
  }
}
