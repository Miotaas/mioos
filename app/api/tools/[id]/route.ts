import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const tool = await prisma.tool.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.enabled !== undefined && { enabled: body.enabled }),
        ...(body.requiresApproval !== undefined && { requiresApproval: body.requiresApproval }),
      },
    });
    return NextResponse.json(tool);
  } catch {
    return NextResponse.json({ error: "Failed to update tool" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.tool.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete tool" }, { status: 500 });
  }
}
