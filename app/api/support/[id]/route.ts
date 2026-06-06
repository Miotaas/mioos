import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const issue = await prisma.supportIssue.update({
      where: { id },
      data: body,
      include: { lead: true, product: true },
    });
    return NextResponse.json(issue);
  } catch {
    return NextResponse.json({ error: "Failed to update issue" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.supportIssue.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete issue" }, { status: 500 });
  }
}
