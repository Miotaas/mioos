import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const data: Record<string, unknown> = { ...body };
    // Prisma 6 requires a Date object or full ISO string for DateTime fields
    if ("dueDate" in data) {
      data.dueDate = data.dueDate ? new Date(data.dueDate as string) : null;
    }
    if ("nodeId" in data) {
      data.nodeId = (data.nodeId as string | null) || null;
    }
    const task = await prisma.task.update({ where: { id }, data });
    return NextResponse.json(task);
  } catch (e) {
    console.error("[PATCH /api/tasks/:id]", e);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
