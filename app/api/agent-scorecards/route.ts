import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get("agentId") ?? undefined;
    const take = Math.min(50, Number(url.searchParams.get("take") ?? 20));
    const latestOnly = url.searchParams.get("latestOnly") === "true";

    const scorecards = await prisma.agentScorecard.findMany({
      where: agentId ? { agentId } : undefined,
      include: { agent: { select: { id: true, name: true, slug: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take,
    });

    if (latestOnly) {
      const seen = new Set<string>();
      return NextResponse.json(
        scorecards.filter(s => {
          if (seen.has(s.agentId)) return false;
          seen.add(s.agentId);
          return true;
        })
      );
    }

    return NextResponse.json(scorecards);
  } catch {
    return NextResponse.json({ error: "Failed to fetch scorecards" }, { status: 500 });
  }
}
