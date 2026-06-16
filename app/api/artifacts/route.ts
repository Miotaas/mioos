import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type          = searchParams.get("type");
    const opportunityId = searchParams.get("opportunityId");
    const status        = searchParams.get("status");
    const limit         = Math.min(Number(searchParams.get("limit") ?? "50"), 100);

    const where: Record<string, unknown> = { status: { not: "archived" } };
    if (type)          where.artifactType  = type;
    if (opportunityId) where.opportunityId = opportunityId;
    if (status)        where.status        = status;

    const artifacts = await prisma.artifact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take:    limit,
    });

    return NextResponse.json(artifacts);
  } catch (err) {
    console.error("[artifacts GET]", err);
    return NextResponse.json({ error: "Failed to fetch artifacts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const artifact = await prisma.artifact.create({
      data: {
        title:         body.title,
        content:       body.content,
        artifactType:  body.artifactType ?? "market_analysis",
        status:        body.status ?? "draft",
        sourceTeamId:  body.sourceTeamId ?? null,
        assignmentId:  body.assignmentId ?? null,
        outputId:      body.outputId ?? null,
        opportunityId: body.opportunityId ?? null,
        projectId:     body.projectId ?? null,
        goalId:        body.goalId ?? null,
        metadata:      body.metadata ? JSON.stringify(body.metadata) : null,
      },
    });

    return NextResponse.json(artifact, { status: 201 });
  } catch (err) {
    console.error("[artifacts POST]", err);
    return NextResponse.json({ error: "Failed to create artifact" }, { status: 500 });
  }
}
