import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const revenueType = searchParams.get("revenueType");
    const status = searchParams.get("status");

    const entries = await prisma.revenueEntry.findMany({
      where: {
        ...(revenueType ? { revenueType } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(entries);
  } catch (error) {
    console.error("[revenue-entries GET]", error);
    return NextResponse.json({ error: "Failed to fetch revenue entries" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const entry = await prisma.revenueEntry.create({ data: body });
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("[revenue-entries POST]", error);
    return NextResponse.json({ error: "Failed to create revenue entry" }, { status: 500 });
  }
}
