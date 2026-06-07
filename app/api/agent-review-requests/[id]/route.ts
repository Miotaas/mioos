import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const terminal = ["approved", "rejected", "needs_changes"];
    const completedAt = body.status && terminal.includes(body.status) ? new Date() : undefined;

    const request = await prisma.agentReviewRequest.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.reviewResult !== undefined ? { reviewResult: body.reviewResult } : {}),
        ...(body.reviewNotes !== undefined ? { reviewNotes: body.reviewNotes } : {}),
        ...(completedAt ? { completedAt } : {}),
      },
    });

    return NextResponse.json(request);
  } catch {
    return NextResponse.json({ error: "Failed to update review request" }, { status: 500 });
  }
}
