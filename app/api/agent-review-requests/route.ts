import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const reviewerAgentId = url.searchParams.get("reviewerAgentId") ?? undefined;
    const requestedByAgentId = url.searchParams.get("requestedByAgentId") ?? undefined;
    const take = Math.min(50, Number(url.searchParams.get("take") ?? 20));

    const requests = await prisma.agentReviewRequest.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(reviewerAgentId ? { reviewerAgentId } : {}),
        ...(requestedByAgentId ? { requestedByAgentId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
    });

    // Attach agent names
    const agentIds = [...new Set([
      ...requests.map(r => r.requestedByAgentId),
      ...requests.map(r => r.reviewerAgentId),
    ])];
    const agents = agentIds.length > 0
      ? await prisma.agent.findMany({
          where: { id: { in: agentIds } },
          select: { id: true, name: true },
        })
      : [];
    const agentMap = new Map(agents.map(a => [a.id, a]));

    const result = requests.map(r => ({
      ...r,
      requestedByAgent: agentMap.get(r.requestedByAgentId) ?? null,
      reviewerAgent: agentMap.get(r.reviewerAgentId) ?? null,
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch review requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.requestedByAgentId) return NextResponse.json({ error: "requestedByAgentId required" }, { status: 400 });
    if (!body.reviewerAgentId) return NextResponse.json({ error: "reviewerAgentId required" }, { status: 400 });
    if (!body.subject?.trim()) return NextResponse.json({ error: "subject required" }, { status: 400 });
    if (!body.content?.trim()) return NextResponse.json({ error: "content required" }, { status: 400 });

    const request = await prisma.agentReviewRequest.create({
      data: {
        requestedByAgentId: body.requestedByAgentId,
        reviewerAgentId: body.reviewerAgentId,
        workspaceId: body.workspaceId ?? null,
        delegationId: body.delegationId ?? null,
        subject: body.subject.trim(),
        content: body.content.trim(),
        context: body.context ? JSON.stringify(body.context) : null,
        status: "pending",
      },
    });

    return NextResponse.json(request, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create review request" }, { status: 500 });
  }
}
