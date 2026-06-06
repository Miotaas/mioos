import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const nodeId = url.searchParams.get("nodeId");
    const goals = await prisma.goal.findMany({
      where: nodeId ? { nodeId } : undefined,
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(goals);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = {
      title: body.title as string,
      description: (body.description as string | null) ?? null,
      status: (body.status as string) || "active",
      progress: Number(body.progress ?? 0),
      targetDate: body.targetDate ? new Date(body.targetDate as string) : null,
      nodeId: (body.nodeId as string | null) || null,
    };
    const goal = await prisma.goal.create({ data });
    return NextResponse.json(goal, { status: 201 });
  } catch (e) {
    console.error("[POST /api/goals]", e);
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}
