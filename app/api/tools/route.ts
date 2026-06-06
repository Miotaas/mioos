import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const tools = await prisma.tool.findMany({
      include: { agentTools: { select: { agentId: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(tools);
  } catch {
    return NextResponse.json({ error: "Failed to fetch tools" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!body.slug?.trim()) return NextResponse.json({ error: "slug is required" }, { status: 400 });

    const tool = await prisma.tool.create({
      data: {
        name: body.name.trim(),
        slug: body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        description: body.description ?? null,
        enabled: body.enabled ?? true,
        requiresApproval: body.requiresApproval ?? true,
      },
    });
    return NextResponse.json(tool, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create tool" }, { status: 500 });
  }
}
