import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const take = Math.min(50, Number(url.searchParams.get("take") ?? 20));

    const patterns = await prisma.patternRecord.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ occurrences: "desc" }, { createdAt: "desc" }],
      take,
    });

    return NextResponse.json(patterns);
  } catch {
    return NextResponse.json({ error: "Failed to fetch patterns" }, { status: 500 });
  }
}
