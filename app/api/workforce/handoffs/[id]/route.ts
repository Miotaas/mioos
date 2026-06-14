import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const VALID_STATUSES = ["pending", "accepted", "in_progress", "completed", "rejected"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const handoff = await prisma.teamHandoff.findUnique({
      where: { id },
      include: {
        fromTeam: { select: { id: true, name: true, slug: true } },
        toTeam:   { select: { id: true, name: true, slug: true } },
      },
    });
    if (!handoff) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(handoff);
  } catch (error) {
    console.error("[workforce/handoffs/:id GET]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if ("status" in body) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      data.status = body.status;
      if (body.status === "accepted")  data.acceptedAt  = new Date();
      if (body.status === "completed") data.completedAt = new Date();
    }
    if ("notes" in body) data.notes = body.notes || null;

    const handoff = await prisma.teamHandoff.update({
      where: { id },
      data,
      include: {
        fromTeam: { select: { id: true, name: true, slug: true } },
        toTeam:   { select: { id: true, name: true, slug: true } },
      },
    });

    // When a handoff is accepted, update the related output ownerTeamId
    if (body.status === "accepted" && handoff.relatedOutputId) {
      await prisma.workforceOutput.update({
        where: { id: handoff.relatedOutputId },
        data: {
          ownerTeamId: handoff.toTeamId,
          status: "in_progress",
        },
      });
    }

    // When a handoff is completed, mark related output completed too
    if (body.status === "completed" && handoff.relatedOutputId) {
      await prisma.workforceOutput.update({
        where: { id: handoff.relatedOutputId },
        data: { status: "completed", completedAt: new Date() },
      });
    }

    return NextResponse.json(handoff);
  } catch (error) {
    console.error("[workforce/handoffs/:id PATCH]", error);
    return NextResponse.json({ error: "Failed to update handoff" }, { status: 500 });
  }
}
