import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await prisma.fulfillmentFlow.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Failed to fetch fulfillment flow" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const item = await prisma.fulfillmentFlow.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.productName !== undefined && { productName: body.productName }),
        ...(body.paymentProvider !== undefined && { paymentProvider: body.paymentProvider }),
        ...(body.deliveryType !== undefined && { deliveryType: body.deliveryType }),
        ...(body.confirmationEmailTemplate !== undefined && { confirmationEmailTemplate: body.confirmationEmailTemplate }),
        ...(body.invoiceRequired !== undefined && { invoiceRequired: body.invoiceRequired }),
        ...(body.deliveryEmailTemplate !== undefined && { deliveryEmailTemplate: body.deliveryEmailTemplate }),
        ...(body.followUpEmailTemplate !== undefined && { followUpEmailTemplate: body.followUpEmailTemplate }),
        ...(body.supportInstructions !== undefined && { supportInstructions: body.supportInstructions }),
        ...(body.status !== undefined && { status: body.status }),
      },
    });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Failed to update fulfillment flow" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.fulfillmentFlow.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete fulfillment flow" }, { status: 500 });
  }
}
