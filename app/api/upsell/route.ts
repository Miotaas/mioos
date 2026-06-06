import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const opportunities = await prisma.upsellOpportunity.findMany({
      include: { lead: true, currentProduct: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(opportunities);
  } catch {
    return NextResponse.json({ error: "Failed to fetch upsell opportunities" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {
      leadId: body.leadId ?? null,
      currentProductId: body.currentProductId ?? null,
      suggestedProductId: body.suggestedProductId ?? null,
      reason: body.reason ?? null,
      status: body.status ?? "identified",
      estimatedValue: body.estimatedValue ? parseFloat(body.estimatedValue) : null,
    };
    if (body.nextActionDate) data.nextActionDate = new Date(body.nextActionDate);
    const opportunity = await prisma.upsellOpportunity.create({
      data,
      include: { lead: true, currentProduct: true },
    });
    return NextResponse.json(opportunity, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create upsell opportunity" }, { status: 500 });
  }
}
