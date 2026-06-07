import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const take = Math.min(parseInt(searchParams.get("take") ?? "20"), 50);

    const briefings = await prisma.executiveBriefing.findMany({
      orderBy: { createdAt: "desc" },
      take,
    });

    return NextResponse.json(briefings);
  } catch {
    return NextResponse.json({ error: "Failed to fetch briefings" }, { status: 500 });
  }
}
