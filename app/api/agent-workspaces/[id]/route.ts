import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const workspace = await prisma.agentWorkspace.findUnique({
      where: { id },
      include: {
        members: true,
        activities: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });
    if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const agentIds = workspace.members.map(m => m.agentId);
    const agents = agentIds.length > 0
      ? await prisma.agent.findMany({
          where: { id: { in: agentIds } },
          select: { id: true, name: true, slug: true, role: true, authorityLevel: true },
        })
      : [];
    const agentMap = new Map(agents.map(a => [a.id, a]));

    return NextResponse.json({
      ...workspace,
      members: workspace.members.map(m => ({ ...m, agent: agentMap.get(m.agentId) ?? null })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch workspace" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const workspace = await prisma.agentWorkspace.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(body.workspaceType ? { workspaceType: body.workspaceType } : {}),
        updatedAt: new Date(),
      },
      include: { members: true, activities: { orderBy: { createdAt: "desc" }, take: 10 } },
    });

    return NextResponse.json(workspace);
  } catch {
    return NextResponse.json({ error: "Failed to update workspace" }, { status: 500 });
  }
}
