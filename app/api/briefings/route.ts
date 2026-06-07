import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const take = Math.min(20, Number(url.searchParams.get("take") ?? 10));

    const briefings = await prisma.executiveBriefing.findMany({
      orderBy: { createdAt: "desc" },
      take,
    });

    return NextResponse.json(briefings);
  } catch {
    return NextResponse.json({ error: "Failed to fetch briefings" }, { status: 500 });
  }
}
