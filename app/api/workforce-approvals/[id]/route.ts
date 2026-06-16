import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dispatchApprovalAction } from "@/lib/actions/approval-dispatcher";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await req.json();
    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existing = await prisma.approval.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Approval not found" }, { status: 404 });
    }

    const approval = await prisma.approval.update({
      where: { id },
      data: {
        status,
        approvedAt: status === "approved" ? new Date() : null,
      },
    });

    if (status !== "approved") {
      return NextResponse.json({ approval, actionResult: null });
    }

    // dispatchApprovalAction never throws — it always returns an ActionResult
    const actionResult = await dispatchApprovalAction(id);

    return NextResponse.json({ approval, actionResult });
  } catch (error) {
    console.error("[workforce-approvals PATCH]", error);
    return NextResponse.json({ error: "Failed to update approval" }, { status: 500 });
  }
}
