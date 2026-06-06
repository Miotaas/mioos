import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const workflows = await prisma.agentWorkflow.findMany({
      include: {
        sourceAgent: { select: { id: true, name: true, slug: true } },
        targetAgent: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(workflows);
  } catch {
    return NextResponse.json({ error: "Failed to fetch workflows" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!body.sourceAgentId) return NextResponse.json({ error: "sourceAgentId is required" }, { status: 400 });
    if (!body.targetAgentId) return NextResponse.json({ error: "targetAgentId is required" }, { status: 400 });
    if (body.sourceAgentId === body.targetAgentId) {
      return NextResponse.json({ error: "Source and target agents must differ" }, { status: 400 });
    }

    const workflow = await prisma.agentWorkflow.create({
      data: {
        name: body.name.trim(),
        sourceAgentId: body.sourceAgentId,
        targetAgentId: body.targetAgentId,
        triggerType: body.triggerType ?? "manual",
        enabled: body.enabled ?? false,
      },
      include: {
        sourceAgent: { select: { id: true, name: true, slug: true } },
        targetAgent: { select: { id: true, name: true, slug: true } },
      },
    });
    return NextResponse.json(workflow, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 });
  }
}
