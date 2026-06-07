import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const take = Math.min(50, Number(url.searchParams.get("take") ?? 20));
    const status = url.searchParams.get("status") ?? undefined;

    const runs = await prisma.executiveLoopRun.findMany({
      where: status ? { status } : undefined,
      orderBy: { startedAt: "desc" },
      take,
    });

    return NextResponse.json(runs);
  } catch {
    return NextResponse.json({ error: "Failed to fetch loop runs" }, { status: 500 });
  }
}
