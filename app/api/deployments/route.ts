import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const deployments = await prisma.deployment.findMany({
      include: { lead: true, product: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(deployments);
  } catch {
    return NextResponse.json({ error: "Failed to fetch deployments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {
      leadId: body.leadId ?? null,
      productId: body.productId ?? null,
      status: body.status ?? "planned",
      environment: body.environment ?? "demo",
      monthlyPrice: body.monthlyPrice ? parseFloat(body.monthlyPrice) : null,
      setupStatus: body.setupStatus ?? null,
      notes: body.notes ?? null,
    };
    if (body.nextCheckIn) data.nextCheckIn = new Date(body.nextCheckIn);
    const deployment = await prisma.deployment.create({
      data,
      include: { lead: true, product: true },
    });
    return NextResponse.json(deployment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create deployment" }, { status: 500 });
  }
}
