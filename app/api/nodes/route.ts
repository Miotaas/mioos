import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const nodes = await prisma.node.findMany({
      include: {
        tasks: true,
        goals: true,
        notes: true,
        checklists: { orderBy: { order: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(nodes);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch nodes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const node = await prisma.node.create({ data: body });
    return NextResponse.json(node, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create node" }, { status: 500 });
  }
}
