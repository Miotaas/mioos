import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const data: Record<string, unknown> = { ...body };
    if ("targetDate" in data) {
      data.targetDate = data.targetDate ? new Date(data.targetDate as string) : null;
    }
    if ("nodeId" in data) {
      data.nodeId = (data.nodeId as string | null) || null;
    }
    if ("progress" in data) {
      data.progress = Number(data.progress ?? 0);
    }
    const goal = await prisma.goal.update({ where: { id }, data });
    return NextResponse.json(goal);
  } catch (e) {
    console.error("[PATCH /api/goals/:id]", e);
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.goal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
