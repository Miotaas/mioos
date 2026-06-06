import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const approvals = await prisma.approvalQueue.findMany({
      include: {
        agentRun: {
          include: { agent: { select: { id: true, name: true, slug: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(approvals);
  } catch {
    return NextResponse.json({ error: "Failed to fetch approvals" }, { status: 500 });
  }
}
