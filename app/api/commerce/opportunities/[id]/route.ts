import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await prisma.commerceOpportunity.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Failed to fetch opportunity" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const item = await prisma.commerceOpportunity.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.opportunityType !== undefined && { opportunityType: body.opportunityType }),
        ...(body.targetCustomer !== undefined && { targetCustomer: body.targetCustomer }),
        ...(body.painPoint !== undefined && { painPoint: body.painPoint }),
        ...(body.offer !== undefined && { offer: body.offer }),
        ...(body.estimatedRevenue !== undefined && { estimatedRevenue: body.estimatedRevenue != null ? parseFloat(body.estimatedRevenue) : null }),
        ...(body.estimatedMargin !== undefined && { estimatedMargin: body.estimatedMargin != null ? parseFloat(body.estimatedMargin) : null }),
        ...(body.buildEffort !== undefined && { buildEffort: body.buildEffort }),
        ...(body.salesDifficulty !== undefined && { salesDifficulty: body.salesDifficulty }),
        ...(body.fulfillmentDifficulty !== undefined && { fulfillmentDifficulty: body.fulfillmentDifficulty }),
        ...(body.riskLevel !== undefined && { riskLevel: body.riskLevel }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.source !== undefined && { source: body.source }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Failed to update opportunity" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.commerceOpportunity.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete opportunity" }, { status: 500 });
  }
}
