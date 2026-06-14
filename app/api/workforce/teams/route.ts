import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const teams = await prisma.workforceTeam.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        outputs: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    return NextResponse.json(teams);
  } catch (error) {
    console.error("[workforce/teams GET]", error);
    return NextResponse.json({ error: "Failed to fetch workforce teams" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const team = await prisma.workforceTeam.create({ data: body });
    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error("[workforce/teams POST]", error);
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 });
  }
}
