import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type   = searchParams.get("type");
    const limit  = Math.min(Number(searchParams.get("limit") ?? "50"), 100);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type)   where.opportunityType = type;

    const opportunities = await prisma.opportunity.findMany({
      where,
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return NextResponse.json(opportunities);
  } catch (err) {
    console.error("[opportunities GET]", err);
    return NextResponse.json({ error: "Failed to fetch opportunities" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const opportunity = await prisma.opportunity.create({
      data: {
        title:               body.title,
        description:         body.description ?? null,
        opportunityType:     body.opportunityType ?? "automation_service",
        source:              body.source ?? "manual",
        status:              body.status ?? "discovered",
        score:               body.score ?? 5,
        confidence:          body.confidence ?? 5,
        estimatedRevenue:    body.estimatedRevenue ?? null,
        estimatedEffort:     body.estimatedEffort ?? null,
        market:              body.market ?? null,
        targetCustomer:      body.targetCustomer ?? null,
        evidence:            body.evidence ? JSON.stringify(body.evidence) : null,
        risks:               body.risks ? JSON.stringify(body.risks) : null,
        assumptions:         body.assumptions ? JSON.stringify(body.assumptions) : null,
        validationPlan:      body.validationPlan ?? null,
        executionStrategy:   body.executionStrategy ?? null,
        nextRecommendedStep: body.nextRecommendedStep ?? null,
        assignedWorkflowTemplate: body.assignedWorkflowTemplate ?? body.opportunityType ?? null,
        projectId:           body.projectId ?? null,
        goalId:              body.goalId ?? null,
        revenueEntryId:      body.revenueEntryId ?? null,
      },
    });

    return NextResponse.json(opportunity, { status: 201 });
  } catch (err) {
    console.error("[opportunities POST]", err);
    return NextResponse.json({ error: "Failed to create opportunity" }, { status: 500 });
  }
}
