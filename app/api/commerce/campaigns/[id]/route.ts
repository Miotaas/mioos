import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await prisma.campaignDraft.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Failed to fetch campaign draft" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const item = await prisma.campaignDraft.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.channel !== undefined && { channel: body.channel }),
        ...(body.goal !== undefined && { goal: body.goal }),
        ...(body.targetAudience !== undefined && { targetAudience: body.targetAudience }),
        ...(body.offer !== undefined && { offer: body.offer }),
        ...(body.hook !== undefined && { hook: body.hook }),
        ...(body.adCopy !== undefined && { adCopy: body.adCopy }),
        ...(body.outreachMessage !== undefined && { outreachMessage: body.outreachMessage }),
        ...(body.landingPageAngle !== undefined && { landingPageAngle: body.landingPageAngle }),
        ...(body.cta !== undefined && { cta: body.cta }),
        ...(body.suggestedBudget !== undefined && { suggestedBudget: body.suggestedBudget != null ? parseFloat(body.suggestedBudget) : null }),
        ...(body.expectedObjection !== undefined && { expectedObjection: body.expectedObjection }),
        ...(body.successMetric !== undefined && { successMetric: body.successMetric }),
        ...(body.status !== undefined && { status: body.status }),
      },
    });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Failed to update campaign draft" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.campaignDraft.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete campaign draft" }, { status: 500 });
  }
}
