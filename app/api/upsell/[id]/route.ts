import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const data: Record<string, unknown> = { ...body };
    if (body.nextActionDate) data.nextActionDate = new Date(body.nextActionDate);
    if (body.nextActionDate === "") data.nextActionDate = null;
    if (body.estimatedValue !== undefined) data.estimatedValue = body.estimatedValue ? parseFloat(body.estimatedValue) : null;
    const opportunity = await prisma.upsellOpportunity.update({
      where: { id },
      data,
      include: { lead: true, currentProduct: true },
    });
    return NextResponse.json(opportunity);
  } catch {
    return NextResponse.json({ error: "Failed to update upsell opportunity" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.upsellOpportunity.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete upsell opportunity" }, { status: 500 });
  }
}
