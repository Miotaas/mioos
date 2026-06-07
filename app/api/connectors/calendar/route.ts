import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchCalendarInsight, getCalendarConnectorStatus } from "@/lib/connectors/calendar";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const connectorStatus = getCalendarConnectorStatus();
    const [latestInsight, totalInsights] = await Promise.all([
      prisma.calendarInsight.findFirst({ orderBy: { createdAt: "desc" } }),
      prisma.calendarInsight.count(),
    ]);
    return NextResponse.json({ ...connectorStatus, latestInsight, totalInsights });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { agentId?: string };
    const id = await fetchCalendarInsight(body.agentId);
    const record = await prisma.calendarInsight.findUnique({ where: { id } });
    return NextResponse.json(record, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Calendar insight failed" }, { status: 500 });
  }
}
