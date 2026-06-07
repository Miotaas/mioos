import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!["approved", "rejected"].includes(body.status)) {
      return NextResponse.json({ error: "status must be 'approved' or 'rejected'" }, { status: 400 });
    }

    const suggestion = await prisma.memorySuggestion.update({
      where: { id },
      data: { status: body.status },
    });

    // If approving directly (not via ApprovalQueue), create the memory now
    if (body.status === "approved" && body.direct === true) {
      await prisma.agentMemory.create({
        data: {
          agentId: suggestion.agentId,
          memoryType: suggestion.memoryType,
          title: suggestion.title,
          content: suggestion.content,
          importance: suggestion.importance,
        },
      });
    }

    return NextResponse.json(suggestion);
  } catch {
    return NextResponse.json({ error: "Failed to update memory suggestion" }, { status: 500 });
  }
}
