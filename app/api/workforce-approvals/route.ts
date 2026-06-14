import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const approvals = await prisma.approval.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        sourceTeam: { select: { id: true, name: true, slug: true, departmentType: true } },
      },
    });
    return NextResponse.json(approvals);
  } catch (error) {
    console.error("[workforce-approvals GET]", error);
    return NextResponse.json({ error: "Failed to fetch approvals" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const approval = await prisma.approval.create({
      data: body,
      include: {
        sourceTeam: { select: { id: true, name: true, slug: true, departmentType: true } },
      },
    });
    return NextResponse.json(approval, { status: 201 });
  } catch (error) {
    console.error("[workforce-approvals POST]", error);
    return NextResponse.json({ error: "Failed to create approval" }, { status: 500 });
  }
}
