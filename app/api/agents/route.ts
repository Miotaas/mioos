import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      include: {
        schedule: true,
        runs: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(agents);
  } catch {
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!body.slug?.trim()) return NextResponse.json({ error: "Slug is required" }, { status: 400 });

    const agent = await prisma.agent.create({
      data: {
        name: body.name.trim(),
        slug: body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        description: body.description ?? null,
        status: body.status ?? "active",
        agentType: body.agentType ?? "custom",
        prompt: body.prompt ?? null,
        systemPrompt: body.systemPrompt ?? null,
        scheduleEnabled: body.scheduleEnabled ?? false,
        scheduleExpression: body.scheduleExpression ?? null,
        requiresApproval: body.requiresApproval ?? true,
      },
      include: { schedule: true },
    });
    return NextResponse.json(agent, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
}
