import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!["unread", "read", "archived"].includes(body.status)) {
      return NextResponse.json({ error: "status must be 'unread', 'read', or 'archived'" }, { status: 400 });
    }

    const message = await prisma.agentMessage.update({
      where: { id },
      data: {
        status: body.status,
        readAt: body.status === "read" ? new Date() : undefined,
      },
    });

    return NextResponse.json(message);
  } catch {
    return NextResponse.json({ error: "Failed to update message" }, { status: 500 });
  }
}
