import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!["pending", "approved", "rejected", "dismissed"].includes(body.status)) {
      return NextResponse.json(
        { error: "status must be 'pending', 'approved', 'rejected', or 'dismissed'" },
        { status: 400 },
      );
    }

    const pattern = await prisma.patternRecord.update({
      where: { id },
      data: { status: body.status, updatedAt: new Date() },
    });

    return NextResponse.json(pattern);
  } catch {
    return NextResponse.json({ error: "Failed to update pattern" }, { status: 500 });
  }
}
