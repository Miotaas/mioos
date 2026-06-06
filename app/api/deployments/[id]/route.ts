import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const data: Record<string, unknown> = { ...body };
    if (body.nextCheckIn) data.nextCheckIn = new Date(body.nextCheckIn);
    if (body.nextCheckIn === "") data.nextCheckIn = null;
    if (body.lastCheckIn) data.lastCheckIn = new Date(body.lastCheckIn);
    if (body.monthlyPrice !== undefined) data.monthlyPrice = body.monthlyPrice ? parseFloat(body.monthlyPrice) : null;
    const deployment = await prisma.deployment.update({
      where: { id },
      data,
      include: { lead: true, product: true },
    });
    return NextResponse.json(deployment);
  } catch {
    return NextResponse.json({ error: "Failed to update deployment" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.deployment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete deployment" }, { status: 500 });
  }
}
