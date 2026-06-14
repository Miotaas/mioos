import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const VALID_SENDER_TYPES = ["operator", "team", "system"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const messages = await prisma.assignmentMessage.findMany({
      where: { assignmentId: id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(messages);
  } catch (error) {
    console.error("[assignments/:id/messages GET]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();

    if (!body.content || typeof body.content !== "string" || !body.content.trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

    const senderType = VALID_SENDER_TYPES.includes(body.senderType) ? body.senderType : "operator";

    const message = await prisma.assignmentMessage.create({
      data: {
        assignmentId: id,
        senderType,
        content: body.content.trim(),
      },
    });

    // When a team sends a message, auto-move assignment to "active" if still pending
    if (senderType === "team" && assignment.status === "pending") {
      await prisma.assignment.update({
        where: { id },
        data: { status: "active", startedAt: new Date() },
      });
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("[assignments/:id/messages POST]", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
