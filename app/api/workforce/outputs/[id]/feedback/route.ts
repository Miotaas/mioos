import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const VALID_DECISIONS = ["approved", "rejected", "revised", "acknowledged"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();

    const output = await prisma.workforceOutput.findUnique({ where: { id } });
    if (!output) return NextResponse.json({ error: "Output not found" }, { status: 404 });

    if (!body.decision || !VALID_DECISIONS.includes(body.decision)) {
      return NextResponse.json({ error: "Valid decision required: approved | rejected | revised | acknowledged" }, { status: 400 });
    }

    const feedback = await prisma.outputFeedback.create({
      data: {
        outputId:       id,
        assignmentId:   body.assignmentId  || null,
        teamId:         body.teamId        || null,
        departmentType: body.departmentType || null,
        decision:       body.decision,
        comment:        body.comment       || null,
        helpful:        body.helpful !== false,
      },
    });

    return NextResponse.json(feedback, { status: 201 });
  } catch (error) {
    console.error("[workforce/outputs/:id/feedback POST]", error);
    return NextResponse.json({ error: "Failed to record feedback" }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const feedback = await prisma.outputFeedback.findMany({
      where: { outputId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(feedback);
  } catch (error) {
    console.error("[workforce/outputs/:id/feedback GET]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
