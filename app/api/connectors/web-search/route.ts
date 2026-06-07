import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeWebSearch, getWebSearchConnectorStatus } from "@/lib/connectors/webSearch";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const connectorStatus = getWebSearchConnectorStatus();
    const [recentSearches, totalSearches] = await Promise.all([
      prisma.searchResearch.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.searchResearch.count(),
    ]);
    return NextResponse.json({ ...connectorStatus, recentSearches, totalSearches });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, requestedByAgentId, workspaceId } = body;

    if (!query?.trim()) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const id = await executeWebSearch(query.trim(), requestedByAgentId, workspaceId);
    const record = await prisma.searchResearch.findUnique({ where: { id } });
    return NextResponse.json(record, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
