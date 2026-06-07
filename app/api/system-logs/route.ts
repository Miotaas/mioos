import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const take = Math.min(200, Number(url.searchParams.get("take") ?? 100));
    const sourceType = url.searchParams.get("sourceType") ?? undefined;
    const sourceId = url.searchParams.get("sourceId") ?? undefined;

    const logs = await prisma.systemExecutionLog.findMany({
      where: {
        ...(sourceType ? { sourceType } : {}),
        ...(sourceId ? { sourceId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
    });
    return NextResponse.json(logs);
  } catch {
    return NextResponse.json({ error: "Failed to fetch system logs" }, { status: 500 });
  }
}
