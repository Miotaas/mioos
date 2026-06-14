import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");

    const outputs = await prisma.workforceOutput.findMany({
      where: teamId ? { teamId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        team: { select: { id: true, name: true, slug: true, departmentType: true } },
      },
    });
    return NextResponse.json(outputs);
  } catch (error) {
    console.error("[workforce/outputs GET]", error);
    return NextResponse.json({ error: "Failed to fetch outputs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const output = await prisma.workforceOutput.create({
      data: body,
      include: {
        team: { select: { id: true, name: true, slug: true, departmentType: true } },
      },
    });
    return NextResponse.json(output, { status: 201 });
  } catch (error) {
    console.error("[workforce/outputs POST]", error);
    return NextResponse.json({ error: "Failed to create output" }, { status: 500 });
  }
}
