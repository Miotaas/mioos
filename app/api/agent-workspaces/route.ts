import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const take = Math.min(50, Number(url.searchParams.get("take") ?? 20));

    const workspaces = await prisma.agentWorkspace.findMany({
      where: status ? { status } : undefined,
      include: {
        members: true,
        activities: { orderBy: { createdAt: "desc" }, take: 10 },
      },
      orderBy: { updatedAt: "desc" },
      take,
    });

    // Attach agent info to each member
    const agentIds = [...new Set(workspaces.flatMap(w => w.members.map(m => m.agentId)))];
    const agents = agentIds.length > 0
      ? await prisma.agent.findMany({
          where: { id: { in: agentIds } },
          select: { id: true, name: true, slug: true, role: true, authorityLevel: true },
        })
      : [];
    const agentMap = new Map(agents.map(a => [a.id, a]));

    const result = workspaces.map(w => ({
      ...w,
      members: w.members.map(m => ({ ...m, agent: agentMap.get(m.agentId) ?? null })),
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch workspaces" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

    const workspace = await prisma.agentWorkspace.create({
      data: {
        name: body.name.trim(),
        description: body.description ?? null,
        workspaceType: body.workspaceType ?? "strategy",
        status: "active",
      },
      include: { members: true, activities: true },
    });

    // Add initial members if provided
    if (Array.isArray(body.members) && body.members.length > 0) {
      for (const m of body.members as { agentId: string; role?: string }[]) {
        if (!m.agentId) continue;
        await prisma.agentWorkspaceMember.create({
          data: {
            workspaceId: workspace.id,
            agentId: m.agentId,
            role: m.role ?? "observer",
          },
        }).catch(() => {});
      }
    }

    const created = await prisma.agentWorkspace.findUnique({
      where: { id: workspace.id },
      include: { members: true, activities: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }
}
