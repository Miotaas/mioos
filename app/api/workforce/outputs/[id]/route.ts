import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const VALID_STATUSES = ["draft", "in_review", "approved", "handed_off", "in_progress", "completed", "archived"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const output = await prisma.workforceOutput.findUnique({
      where: { id },
      include: { team: { select: { id: true, name: true, slug: true, departmentType: true } } },
    });
    if (!output) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(output);
  } catch (error) {
    console.error("[workforce/outputs/:id GET]", error);
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
      // Set lifecycle timestamps automatically
      if (body.status === "in_review")  data.reviewedAt  = new Date();
      if (body.status === "approved")   data.approvedAt  = new Date();
      if (body.status === "completed")  data.completedAt = new Date();
    }
    if ("ownerTeamId" in body) data.ownerTeamId    = body.ownerTeamId || null;
    if ("description"  in body) data.description   = body.description || null;
    if ("projectId"    in body) data.projectId     = body.projectId   || null;
    if ("goalId"       in body) data.goalId        = body.goalId      || null;
    if ("title"        in body) data.title         = body.title;

    const output = await prisma.workforceOutput.update({
      where: { id },
      data,
      include: { team: { select: { id: true, name: true, slug: true, departmentType: true } } },
    });
    return NextResponse.json(output);
  } catch (error) {
    console.error("[workforce/outputs/:id PATCH]", error);
    return NextResponse.json({ error: "Failed to update output" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.workforceOutput.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[workforce/outputs/:id DELETE]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
