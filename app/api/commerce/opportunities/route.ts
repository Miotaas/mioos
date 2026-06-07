import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const items = await prisma.commerceOpportunity.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Failed to fetch opportunities" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const item = await prisma.commerceOpportunity.create({
      data: {
        title: body.title.trim(),
        opportunityType: body.opportunityType ?? "digital_product",
        targetCustomer: body.targetCustomer ?? null,
        painPoint: body.painPoint ?? null,
        offer: body.offer ?? null,
        estimatedRevenue: body.estimatedRevenue != null ? parseFloat(body.estimatedRevenue) : null,
        estimatedMargin: body.estimatedMargin != null ? parseFloat(body.estimatedMargin) : null,
        buildEffort: body.buildEffort ?? "medium",
        salesDifficulty: body.salesDifficulty ?? "medium",
        fulfillmentDifficulty: body.fulfillmentDifficulty ?? "medium",
        riskLevel: body.riskLevel ?? "medium",
        status: body.status ?? "discovered",
        source: body.source ?? null,
        notes: body.notes ?? null,
        createdByAgentId: body.createdByAgentId ?? null,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create opportunity" }, { status: 500 });
  }
}
