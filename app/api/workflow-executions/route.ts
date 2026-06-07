import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const take = Math.min(100, Number(url.searchParams.get("take") ?? 50));
    const status = url.searchParams.get("status") ?? undefined;

    const records = await prisma.workflowExecution.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take,
    });
    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: "Failed to fetch workflow executions" }, { status: 500 });
  }
}
