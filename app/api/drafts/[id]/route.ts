import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { DraftType } from "@/types";

const ALLOWED_STATUSES = ["draft", "review_needed", "approved", "rejected", "archived"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: { draftType: DraftType; status?: string; content?: string } = await req.json();
    const { draftType, status, content } = body;

    if (!draftType) {
      return NextResponse.json({ error: "draftType is required" }, { status: 400 });
    }
    if (status && !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;

    switch (draftType) {
      case "email": {
        if (content !== undefined) updateData.body = content;
        const result = await prisma.emailDraft.update({ where: { id }, data: updateData });
        return NextResponse.json(result);
      }
      case "campaign": {
        if (content !== undefined) updateData.adCopy = content;
        const result = await prisma.campaignDraft.update({ where: { id }, data: updateData });
        return NextResponse.json(result);
      }
      case "content": {
        if (content !== undefined) updateData.body = content;
        const result = await prisma.contentDraft.update({ where: { id }, data: updateData });
        return NextResponse.json(result);
      }
      case "product": {
        if (content !== undefined) updateData.description = content;
        const result = await prisma.productDraft.update({ where: { id }, data: updateData });
        return NextResponse.json(result);
      }
      case "proposal": {
        if (content !== undefined) updateData.solution = content;
        const result = await prisma.proposalDraft.update({ where: { id }, data: updateData });
        return NextResponse.json(result);
      }
      case "development": {
        if (content !== undefined) updateData.readmeContent = content;
        const result = await prisma.developmentDraft.update({ where: { id }, data: updateData });
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: "Unknown draft type" }, { status: 400 });
    }
  } catch (error) {
    console.error("[drafts PATCH]", error);
    return NextResponse.json({ error: "Failed to update draft" }, { status: 500 });
  }
}
