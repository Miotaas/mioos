import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") ?? undefined;
    const status = url.searchParams.get("status") ?? "active";
    const take = Math.min(50, Number(url.searchParams.get("take") ?? 20));

    const insights = await prisma.insight.findMany({
      where: {
        ...(type ? { type } : {}),
        status,
      },
      orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
      take,
    });

    return NextResponse.json(insights);
  } catch {
    return NextResponse.json({ error: "Failed to fetch insights" }, { status: 500 });
  }
}
