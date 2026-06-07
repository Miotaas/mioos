import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const items = await prisma.prospect.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Failed to fetch prospects" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.companyName?.trim()) {
      return NextResponse.json({ error: "companyName is required" }, { status: 400 });
    }
    const item = await prisma.prospect.create({
      data: {
        companyName: body.companyName.trim(),
        contactName: body.contactName ?? null,
        role: body.role ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        linkedinUrl: body.linkedinUrl ?? null,
        website: body.website ?? null,
        industry: body.industry ?? null,
        country: body.country ?? null,
        companySize: body.companySize ?? null,
        fitScore: body.fitScore != null ? parseInt(body.fitScore) : null,
        painPointHypothesis: body.painPointHypothesis ?? null,
        suggestedOffer: body.suggestedOffer ?? null,
        source: body.source ?? null,
        status: body.status ?? "discovered",
        createdByAgentId: body.createdByAgentId ?? null,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create prospect" }, { status: 500 });
  }
}
