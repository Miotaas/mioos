import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const goal = await prisma.agentGoal.findUnique({
      where: { id },
      include: { agent: { select: { id: true, name: true, slug: true } } },
    });
    if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(goal);
  } catch {
    return NextResponse.json({ error: "Failed to fetch goal" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const goal = await prisma.agentGoal.update({
      where: { id },
      data: {
        ...(body.title ? { title: body.title.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.goalType ? { goalType: body.goalType } : {}),
        ...(body.targetMetric !== undefined ? { targetMetric: body.targetMetric } : {}),
        ...(body.targetValue !== undefined ? { targetValue: body.targetValue != null ? Number(body.targetValue) : null } : {}),
        ...(body.currentValue !== undefined ? { currentValue: Number(body.currentValue) } : {}),
        ...(body.period ? { period: body.period } : {}),
        ...(body.status ? {
          status: body.status,
          ...(body.status === "completed" ? { completedAt: new Date() } : {}),
        } : {}),
        updatedAt: new Date(),
      },
      include: { agent: { select: { id: true, name: true, slug: true } } },
    });

    return NextResponse.json(goal);
  } catch {
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.agentGoal.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
  }
}
