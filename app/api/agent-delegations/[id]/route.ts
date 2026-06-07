import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const VALID_STATUSES = ["pending", "accepted", "running", "completed", "failed", "cancelled"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
    }

    const now = new Date();
    const data: Record<string, unknown> = {};
    if (body.status) data.status = body.status;
    if (body.result !== undefined) data.result = body.result;
    if (body.error !== undefined) data.error = body.error;
    if (body.status === "running" || body.status === "accepted") data.startedAt = now;
    if (body.status === "completed" || body.status === "failed" || body.status === "cancelled") data.completedAt = now;

    const delegation = await prisma.agentDelegation.update({ where: { id }, data });
    return NextResponse.json(delegation);
  } catch {
    return NextResponse.json({ error: "Failed to update delegation" }, { status: 500 });
  }
}
