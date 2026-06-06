import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const workflow = await prisma.agentWorkflow.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.sourceAgentId !== undefined && { sourceAgentId: body.sourceAgentId }),
        ...(body.targetAgentId !== undefined && { targetAgentId: body.targetAgentId }),
        ...(body.triggerType !== undefined && { triggerType: body.triggerType }),
        ...(body.enabled !== undefined && { enabled: body.enabled }),
      },
      include: {
        sourceAgent: { select: { id: true, name: true, slug: true } },
        targetAgent: { select: { id: true, name: true, slug: true } },
      },
    });
    return NextResponse.json(workflow);
  } catch {
    return NextResponse.json({ error: "Failed to update workflow" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.agentWorkflow.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete workflow" }, { status: 500 });
  }
}
