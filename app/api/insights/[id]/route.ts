import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!["active", "dismissed"].includes(body.status)) {
      return NextResponse.json({ error: "status must be 'active' or 'dismissed'" }, { status: 400 });
    }

    const insight = await prisma.insight.update({
      where: { id },
      data: { status: body.status },
    });

    return NextResponse.json(insight);
  } catch {
    return NextResponse.json({ error: "Failed to update insight" }, { status: 500 });
  }
}
