import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (!["approved", "rejected"].includes(body.status)) {
      return NextResponse.json({ error: "status must be 'approved' or 'rejected'" }, { status: 400 });
    }
    const approval = await prisma.approvalQueue.update({
      where: { id },
      data: {
        status: body.status,
        approvedBy: body.approvedBy ?? "Michiel",
        approvedAt: new Date(),
      },
      include: {
        agentRun: {
          include: { agent: { select: { id: true, name: true } } },
        },
      },
    });
    return NextResponse.json(approval);
  } catch {
    return NextResponse.json({ error: "Failed to update approval" }, { status: 500 });
  }
}
