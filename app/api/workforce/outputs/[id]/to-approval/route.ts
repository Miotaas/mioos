import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const OUTPUT_TO_DECISION: Record<string, string> = {
  prospect:          "approve_outreach",
  outreach:          "approve_outreach",
  product_candidate: "approve_product",
  content:           "approve_content",
  campaign:          "approve_campaign",
  research:          "review_research",
  automation:        "approve_deployment",
};

const DECISION_RISK: Record<string, string> = {
  approve_outreach:   "high",
  approve_product:    "medium",
  approve_content:    "low",
  review_research:    "low",
  approve_campaign:   "medium",
  approve_deployment: "high",
  founder_decision:   "medium",
};

const DECISION_PRIORITY: Record<string, string> = {
  approve_outreach:   "urgent",
  approve_product:    "high",
  approve_content:    "high",
  review_research:    "medium",
  approve_campaign:   "high",
  approve_deployment: "high",
  founder_decision:   "medium",
};

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const output = await prisma.workforceOutput.findUnique({
      where: { id },
      include: { team: { select: { id: true, name: true } } },
    });
    if (!output) {
      return NextResponse.json({ error: "Output not found" }, { status: 404 });
    }

    // Check if a pending approval already exists for this output
    const existing = await prisma.approval.count({
      where: { relatedOutputId: id, status: "pending" },
    });
    if (existing > 0) {
      return NextResponse.json(
        { error: "A pending approval already exists for this output" },
        { status: 409 }
      );
    }

    const decisionType = OUTPUT_TO_DECISION[output.outputType] ?? "founder_decision";
    const riskLevel    = DECISION_RISK[decisionType]     ?? "medium";
    const priority     = DECISION_PRIORITY[decisionType] ?? "medium";

    const approval = await prisma.approval.create({
      data: {
        title:           `Review: ${output.title}`,
        description:     output.description ?? undefined,
        reason:          `Workforce output from ${output.team.name} requires founder review before action can proceed.`,
        status:          "pending",
        sourceTeamId:    output.teamId,
        relatedOutputId: output.id,
        decisionType,
        riskLevel,
        priority,
      },
      include: {
        sourceTeam: { select: { id: true, name: true, slug: true, departmentType: true } },
      },
    });

    // Mark output as in_review
    await prisma.workforceOutput.update({
      where: { id: output.id },
      data:  { status: "in_review", reviewedAt: new Date() },
    });

    return NextResponse.json(approval, { status: 201 });
  } catch (err) {
    console.error("[outputs/to-approval POST]", err);
    return NextResponse.json({ error: "Failed to create approval" }, { status: 500 });
  }
}
