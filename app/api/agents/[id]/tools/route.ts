import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const agentTools = await prisma.agentTool.findMany({
      where: { agentId: id },
      include: { tool: true },
      orderBy: { tool: { name: "asc" } },
    });
    return NextResponse.json(agentTools);
  } catch {
    return NextResponse.json({ error: "Failed to fetch agent tools" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { toolId } = await req.json();
    if (!toolId) return NextResponse.json({ error: "toolId is required" }, { status: 400 });

    const agentTool = await prisma.agentTool.create({
      data: { agentId: id, toolId },
      include: { tool: true },
    });
    return NextResponse.json(agentTool, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Tool already assigned" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to assign tool" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { toolId } = await req.json();
    if (!toolId) return NextResponse.json({ error: "toolId is required" }, { status: 400 });

    await prisma.agentTool.deleteMany({ where: { agentId: id, toolId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to remove tool" }, { status: 500 });
  }
}
