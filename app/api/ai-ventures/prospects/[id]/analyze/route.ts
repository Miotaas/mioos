import { NextRequest, NextResponse } from "next/server";
import { analyzeProspect } from "@/lib/ai-ventures/prospect-engine";

export const dynamic = "force-dynamic";

// POST /api/ai-ventures/prospects/:id/analyze — run the revenue engine:
// website analysis → pain points → offer match → mini-audit → outreach drafts
// → deal value → OUTREACH approval (appears in Decide). Sends nothing.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await analyzeProspect(id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/ai-ventures/prospects/:id/analyze]", err);
    const msg = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
