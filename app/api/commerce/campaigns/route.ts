import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const items = await prisma.campaignDraft.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Failed to fetch campaign drafts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const item = await prisma.campaignDraft.create({
      data: {
        name: body.name.trim(),
        channel: body.channel ?? "email",
        goal: body.goal ?? null,
        targetAudience: body.targetAudience ?? null,
        offer: body.offer ?? null,
        hook: body.hook ?? null,
        adCopy: body.adCopy ?? null,
        outreachMessage: body.outreachMessage ?? null,
        landingPageAngle: body.landingPageAngle ?? null,
        cta: body.cta ?? null,
        suggestedBudget: body.suggestedBudget != null ? parseFloat(body.suggestedBudget) : null,
        expectedObjection: body.expectedObjection ?? null,
        successMetric: body.successMetric ?? null,
        status: body.status ?? "draft",
        createdByAgentId: body.createdByAgentId ?? null,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create campaign draft" }, { status: 500 });
  }
}
