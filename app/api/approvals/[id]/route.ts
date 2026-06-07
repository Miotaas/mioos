import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeApprovedAction } from "@/lib/approvalExecutor";

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

    // Phase 1.9A: fire the executor when approved (fire-and-forget — response returns immediately)
    if (body.status === "approved") {
      executeApprovedAction(id).catch(() => {});
    }

    if (body.status === "rejected") {
      try {
        const parsed = JSON.parse(approval.proposedAction) as { payload?: Record<string, unknown> };
        const p = parsed.payload ?? {};

        // Mark linked MemorySuggestion rejected
        if (approval.actionType === "create_memory" && p.memorySuggestionId) {
          await prisma.memorySuggestion.updateMany({
            where: { id: String(p.memorySuggestionId) },
            data: { status: "rejected" },
          });
        }

        // Mark linked PatternRecord rejected
        if (approval.actionType === "store_pattern" && p.patternId) {
          await prisma.patternRecord.update({
            where: { id: String(p.patternId) },
            data: { status: "rejected", updatedAt: new Date() },
          });
        }
      } catch { /* non-critical */ }
    }

    return NextResponse.json(approval);
  } catch {
    return NextResponse.json({ error: "Failed to update approval" }, { status: 500 });
  }
}
