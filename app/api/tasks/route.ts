import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const nodeId = url.searchParams.get("nodeId");
    const tasks = await prisma.task.findMany({
      where: nodeId ? { nodeId } : undefined,
      include: { checklist: { orderBy: { order: "asc" } } },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(tasks);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = parseTaskBody(body);
    const task = await prisma.task.create({ data });
    return NextResponse.json(task, { status: 201 });
  } catch (e) {
    console.error("[POST /api/tasks]", e);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}

function parseTaskBody(body: Record<string, unknown>) {
  return {
    title: body.title as string,
    description: (body.description as string | null) ?? null,
    status: (body.status as string) || "todo",
    priority: (body.priority as string) || "medium",
    dueDate: body.dueDate ? new Date(body.dueDate as string) : null,
    nodeId: (body.nodeId as string | null) || null,
  };
}
