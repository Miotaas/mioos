import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchEmailInsight, getEmailConnectorStatus } from "@/lib/connectors/email";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const connectorStatus = getEmailConnectorStatus();
    const [latestInsight, totalInsights] = await Promise.all([
      prisma.emailInsight.findFirst({ orderBy: { createdAt: "desc" } }),
      prisma.emailInsight.count(),
    ]);
    return NextResponse.json({ ...connectorStatus, latestInsight, totalInsights });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { agentId?: string };
    const id = await fetchEmailInsight(body.agentId);
    const record = await prisma.emailInsight.findUnique({ where: { id } });
    return NextResponse.json(record, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Email insight failed" }, { status: 500 });
  }
}
