import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const assignedByAgentId = url.searchParams.get("assignedByAgentId") ?? undefined;
    const assignedToAgentId = url.searchParams.get("assignedToAgentId") ?? undefined;
    const take = Math.min(100, Number(url.searchParams.get("take") ?? 50));

    const delegations = await prisma.agentDelegation.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(assignedByAgentId ? { assignedByAgentId } : {}),
        ...(assignedToAgentId ? { assignedToAgentId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
    });

    return NextResponse.json(delegations);
  } catch {
    return NextResponse.json({ error: "Failed to fetch delegations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.assignedByAgentId) return NextResponse.json({ error: "assignedByAgentId required" }, { status: 400 });
    if (!body.assignedToAgentId) return NextResponse.json({ error: "assignedToAgentId required" }, { status: 400 });
    if (!body.objective?.trim()) return NextResponse.json({ error: "objective required" }, { status: 400 });

    const delegation = await prisma.agentDelegation.create({
      data: {
        assignedByAgentId: body.assignedByAgentId,
        assignedToAgentId: body.assignedToAgentId,
        objective: body.objective.trim(),
        inputContext: body.inputContext ? JSON.stringify(body.inputContext) : null,
        expectedOutput: body.expectedOutput ?? null,
        status: "pending",
      },
    });

    return NextResponse.json(delegation, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create delegation" }, { status: 500 });
  }
}
