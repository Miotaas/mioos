import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const opportunity = await prisma.opportunity.findUnique({ where: { id } });
    if (!opportunity) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const assignments = await prisma.assignment.findMany({
      where: { opportunityId: id },
      orderBy: { createdAt: "desc" },
      include: { team: { select: { id: true, name: true, departmentType: true } } },
    });

    return NextResponse.json({ ...opportunity, assignments });
  } catch (err) {
    console.error("[opportunities/[id] GET]", err);
    return NextResponse.json({ error: "Failed to fetch opportunity" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    const allowed = [
      "title", "description", "status", "currentStage", "score", "confidence",
      "estimatedRevenue", "estimatedEffort", "market", "targetCustomer",
      "validationPlan", "executionStrategy", "nextRecommendedStep",
      "projectId", "goalId", "revenueEntryId",
    ];
    for (const key of allowed) {
      if (key in body) updateData[key] = body[key];
    }
    if ("evidence" in body)    updateData.evidence    = JSON.stringify(body.evidence);
    if ("risks" in body)       updateData.risks        = JSON.stringify(body.risks);
    if ("assumptions" in body) updateData.assumptions  = JSON.stringify(body.assumptions);

    const updated = await prisma.opportunity.update({ where: { id }, data: updateData });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[opportunities/[id] PATCH]", err);
    return NextResponse.json({ error: "Failed to update opportunity" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await prisma.opportunity.update({
      where: { id },
      data: { status: "archived" },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[opportunities/[id] DELETE]", err);
    return NextResponse.json({ error: "Failed to archive opportunity" }, { status: 500 });
  }
}
