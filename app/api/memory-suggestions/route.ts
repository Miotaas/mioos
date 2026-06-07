import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "pending";
    const agentId = url.searchParams.get("agentId") ?? undefined;

    const suggestions = await prisma.memorySuggestion.findMany({
      where: {
        ...(status !== "all" ? { status } : {}),
        ...(agentId ? { agentId } : {}),
      },
      orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
    return NextResponse.json(suggestions);
  } catch {
    return NextResponse.json({ error: "Failed to fetch memory suggestions" }, { status: 500 });
  }
}
