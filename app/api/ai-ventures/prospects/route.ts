import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeProspect } from "@/lib/ai-ventures/prospect-engine";

export const dynamic = "force-dynamic";

// GET /api/ai-ventures/prospects — pipeline list (highest priority first).
export async function GET() {
  try {
    const prospects = await prisma.prospect.findMany({
      orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ prospects });
  } catch (err) {
    console.error("[api/ai-ventures/prospects] GET", err);
    return NextResponse.json({ error: "Failed to load prospects" }, { status: 500 });
  }
}

// POST /api/ai-ventures/prospects — create a prospect; optionally analyze immediately.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.companyName?.trim()) {
      return NextResponse.json({ error: "companyName is required" }, { status: 400 });
    }
    const prospect = await prisma.prospect.create({
      data: {
        companyName: body.companyName.trim(),
        website: body.website ?? null,
        location: body.location ?? null,
        industry: body.industry ?? null,
        email: body.email ?? null,
        contactName: body.contactName ?? null,
        painPointHypothesis: body.painPointHypothesis ?? null,
        source: body.source ?? "ai-ventures",
        status: "discovered",
      },
    });

    if (body.analyze) {
      const result = await analyzeProspect(prospect.id);
      return NextResponse.json({ prospect, analysis: result }, { status: 201 });
    }
    return NextResponse.json({ prospect }, { status: 201 });
  } catch (err) {
    console.error("[api/ai-ventures/prospects] POST", err);
    return NextResponse.json({ error: "Failed to create prospect" }, { status: 500 });
  }
}
