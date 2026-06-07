import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const items = await prisma.fulfillmentFlow.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Failed to fetch fulfillment flows" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!body.productName?.trim()) {
      return NextResponse.json({ error: "productName is required" }, { status: 400 });
    }
    const item = await prisma.fulfillmentFlow.create({
      data: {
        name: body.name.trim(),
        productName: body.productName.trim(),
        paymentProvider: body.paymentProvider ?? "manual",
        deliveryType: body.deliveryType ?? "email_delivery",
        confirmationEmailTemplate: body.confirmationEmailTemplate ?? null,
        invoiceRequired: body.invoiceRequired ?? false,
        deliveryEmailTemplate: body.deliveryEmailTemplate ?? null,
        followUpEmailTemplate: body.followUpEmailTemplate ?? null,
        supportInstructions: body.supportInstructions ?? null,
        status: body.status ?? "draft",
        createdByAgentId: body.createdByAgentId ?? null,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create fulfillment flow" }, { status: 500 });
  }
}
