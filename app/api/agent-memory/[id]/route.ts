import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const importance = body.importance !== undefined
      ? Math.min(10, Math.max(1, parseInt(body.importance) || 5))
      : undefined;

    const memory = await prisma.agentMemory.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.memoryType !== undefined && { memoryType: body.memoryType }),
        ...(importance !== undefined && { importance }),
      },
      include: { agent: { select: { id: true, name: true, slug: true } } },
    });
    return NextResponse.json(memory);
  } catch {
    return NextResponse.json({ error: "Failed to update memory" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.agentMemory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete memory" }, { status: 500 });
  }
}
