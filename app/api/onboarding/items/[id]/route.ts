import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const data: Record<string, unknown> = { ...body };
    if (body.completed === true) data.completedAt = new Date();
    if (body.completed === false) data.completedAt = null;
    const item = await prisma.onboardingItem.update({ where: { id }, data });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.onboardingItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
