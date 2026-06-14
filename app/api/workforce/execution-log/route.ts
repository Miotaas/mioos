import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sourceId = searchParams.get("sourceId") ?? undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

    const logs = await prisma.systemExecutionLog.findMany({
      where: {
        sourceType: { in: ["assignment", "workforce_output"] },
        ...(sourceId ? { sourceId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(logs);
  } catch (e) {
    console.error("[GET /api/workforce/execution-log]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
