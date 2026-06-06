import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get("agentId");
    const type = url.searchParams.get("type");
    const minImportance = url.searchParams.get("minImportance");

    const memories = await prisma.agentMemory.findMany({
      where: {
        ...(agentId ? { agentId } : {}),
        ...(type ? { memoryType: type } : {}),
        ...(minImportance ? { importance: { gte: parseInt(minImportance) } } : {}),
      },
      include: { agent: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
    });
    return NextResponse.json(memories);
  } catch {
    return NextResponse.json({ error: "Failed to fetch memories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.agentId) return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    if (!body.title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });
    if (!body.content?.trim()) return NextResponse.json({ error: "content is required" }, { status: 400 });

    const importance = Math.min(10, Math.max(1, parseInt(body.importance ?? "5") || 5));

    const memory = await prisma.agentMemory.create({
      data: {
        agentId: body.agentId,
        memoryType: body.memoryType ?? "fact",
        title: body.title.trim(),
        content: body.content.trim(),
        importance,
      },
      include: { agent: { select: { id: true, name: true, slug: true } } },
    });
    return NextResponse.json(memory, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create memory" }, { status: 500 });
  }
}
