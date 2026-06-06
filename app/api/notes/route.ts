import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const nodeId = url.searchParams.get("nodeId");
    const notes = await prisma.note.findMany({
      where: nodeId ? { nodeId } : undefined,
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(notes);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const note = await prisma.note.create({ data: body });
    return NextResponse.json(note, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
