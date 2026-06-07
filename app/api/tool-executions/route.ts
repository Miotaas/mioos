import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const take = Math.min(100, Number(url.searchParams.get("take") ?? 50));

    const records = await prisma.toolExecution.findMany({
      orderBy: { createdAt: "desc" },
      take,
      include: { tool: { select: { name: true, slug: true } } },
    });
    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: "Failed to fetch tool executions" }, { status: 500 });
  }
}
