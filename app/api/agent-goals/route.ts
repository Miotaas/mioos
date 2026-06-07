import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get("agentId") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const take = Math.min(50, Number(url.searchParams.get("take") ?? 30));

    const goals = await prisma.agentGoal.findMany({
      where: {
        ...(agentId ? { agentId } : {}),
        ...(status ? { status } : {}),
      },
      include: { agent: { select: { id: true, name: true, slug: true } } },
      orderBy: { updatedAt: "desc" },
      take,
    });

    return NextResponse.json(goals);
  } catch {
    return NextResponse.json({ error: "Failed to fetch agent goals" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });
    if (!body.title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });

    const goal = await prisma.agentGoal.create({
      data: {
        agentId: body.agentId,
        title: body.title.trim(),
        description: body.description ?? null,
        goalType: body.goalType ?? "custom",
        targetMetric: body.targetMetric ?? null,
        targetValue: body.targetValue != null ? Number(body.targetValue) : null,
        currentValue: 0,
        period: body.period ?? "weekly",
        status: "active",
      },
      include: { agent: { select: { id: true, name: true, slug: true } } },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create agent goal" }, { status: 500 });
  }
}
