import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const node = await prisma.node.findUnique({
      where: { id },
      include: {
        tasks: true,
        goals: true,
        notes: true,
        checklists: { orderBy: { order: "asc" } },
        conversations: { include: { messages: true } },
      },
    });
    if (!node) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(node);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const node = await prisma.node.update({ where: { id }, data: body });
    return NextResponse.json(node);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.node.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
