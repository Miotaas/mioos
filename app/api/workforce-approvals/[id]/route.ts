import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
    const approval = await prisma.approval.update({
      where: { id },
      data: {
        status,
        approvedAt: status === "approved" ? new Date() : null,
      },
    });
    return NextResponse.json(approval);
  } catch (error) {
    console.error("[workforce-approvals PATCH]", error);
    return NextResponse.json({ error: "Failed to update approval" }, { status: 500 });
  }
}
