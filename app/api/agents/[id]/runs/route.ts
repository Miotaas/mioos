import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const runs = await prisma.agentRun.findMany({
      where: { agentId: id },
      include: {
        approvals: true,
        agent: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(runs);
  } catch {
    return NextResponse.json({ error: "Failed to fetch runs" }, { status: 500 });
  }
}
