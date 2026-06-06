import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        schedule: true,
        runs: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(agent);
  } catch {
    return NextResponse.json({ error: "Failed to fetch agent" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const agent = await prisma.agent.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-") }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.agentType !== undefined && { agentType: body.agentType }),
        ...(body.prompt !== undefined && { prompt: body.prompt }),
        ...(body.systemPrompt !== undefined && { systemPrompt: body.systemPrompt }),
        ...(body.scheduleEnabled !== undefined && { scheduleEnabled: body.scheduleEnabled }),
        ...(body.scheduleExpression !== undefined && { scheduleExpression: body.scheduleExpression }),
        ...(body.requiresApproval !== undefined && { requiresApproval: body.requiresApproval }),
      },
      include: { schedule: true },
    });
    return NextResponse.json(agent);
  } catch {
    return NextResponse.json({ error: "Failed to update agent" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.agent.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 });
  }
}
