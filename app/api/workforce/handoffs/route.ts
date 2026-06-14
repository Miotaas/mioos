import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const handoffs = await prisma.teamHandoff.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        fromTeam: { select: { id: true, name: true, slug: true } },
        toTeam:   { select: { id: true, name: true, slug: true } },
      },
    });
    return NextResponse.json(handoffs);
  } catch (error) {
    console.error("[workforce/handoffs GET]", error);
    return NextResponse.json({ error: "Failed to fetch handoffs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const handoff = await prisma.teamHandoff.create({
      data: body,
      include: {
        fromTeam: { select: { id: true, name: true, slug: true } },
        toTeam:   { select: { id: true, name: true, slug: true } },
      },
    });
    return NextResponse.json(handoff, { status: 201 });
  } catch (error) {
    console.error("[workforce/handoffs POST]", error);
    return NextResponse.json({ error: "Failed to create handoff" }, { status: 500 });
  }
}
