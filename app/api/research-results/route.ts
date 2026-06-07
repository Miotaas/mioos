import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("requestId");
    const take = Math.min(parseInt(searchParams.get("take") ?? "50"), 100);

    const results = await prisma.researchResult.findMany({
      where: requestId ? { requestId } : {},
      include: { request: { select: { id: true, title: true, status: true } } },
      orderBy: { createdAt: "desc" },
      take,
    });

    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { requestId, summary, findings, risks, opportunities, recommendations, confidenceScore } = body;

    if (!requestId || !summary?.trim() || !findings) {
      return NextResponse.json({ error: "requestId, summary, and findings are required" }, { status: 400 });
    }

    const result = await prisma.researchResult.create({
      data: {
        requestId,
        summary: summary.trim(),
        findings: Array.isArray(findings) ? JSON.stringify(findings) : findings,
        risks: risks ? (Array.isArray(risks) ? JSON.stringify(risks) : risks) : null,
        opportunities: opportunities ? (Array.isArray(opportunities) ? JSON.stringify(opportunities) : opportunities) : null,
        recommendations: recommendations ? (Array.isArray(recommendations) ? JSON.stringify(recommendations) : recommendations) : null,
        confidenceScore: confidenceScore ?? 5,
      },
    });

    // Mark parent request completed
    await prisma.researchRequest.update({
      where: { id: requestId },
      data: { status: "completed", resultSummary: summary.trim(), completedAt: new Date() },
    }).catch(() => {});

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create result" }, { status: 500 });
  }
}
