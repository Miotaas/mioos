import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { recommendedProduct: true, onboardingItems: { orderBy: { order: "asc" } } },
    });
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(lead);
  } catch {
    return NextResponse.json({ error: "Failed to fetch lead" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const data: Record<string, unknown> = { ...body };
    if (body.nextActionDate) data.nextActionDate = new Date(body.nextActionDate);
    if (body.nextActionDate === "") data.nextActionDate = null;
    if (body.pilotStartDate) data.pilotStartDate = new Date(body.pilotStartDate);
    if (body.pilotStartDate === "") data.pilotStartDate = null;
    if (body.pilotEndDate) data.pilotEndDate = new Date(body.pilotEndDate);
    if (body.pilotEndDate === "") data.pilotEndDate = null;
    if (body.decisionDeadline) data.decisionDeadline = new Date(body.decisionDeadline);
    if (body.decisionDeadline === "") data.decisionDeadline = null;
    if (body.estimatedValue !== undefined) data.estimatedValue = body.estimatedValue ? parseFloat(body.estimatedValue) : null;
    if (body.proposalAmount !== undefined) data.proposalAmount = body.proposalAmount ? parseFloat(body.proposalAmount) : null;
    if (body.monthlyPrice !== undefined) data.monthlyPrice = body.monthlyPrice ? parseFloat(body.monthlyPrice) : null;
    if (body.setupFee !== undefined) data.setupFee = body.setupFee ? parseFloat(body.setupFee) : null;
    const lead = await prisma.lead.update({
      where: { id },
      data,
      include: { recommendedProduct: true },
    });
    return NextResponse.json(lead);
  } catch {
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.lead.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
