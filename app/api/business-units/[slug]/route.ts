import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rollupBusinessUnit } from "@/lib/businessUnits/rollup";

export const dynamic = "force-dynamic";

// GET /api/business-units/:slug — one unit with its P&L rollup.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const unit = await prisma.businessUnit.findUnique({ where: { slug } });
    if (!unit) {
      return NextResponse.json({ error: "Business unit not found" }, { status: 404 });
    }
    const summary = await rollupBusinessUnit(unit);
    return NextResponse.json({ businessUnit: summary });
  } catch (err) {
    console.error("[api/business-units/:slug] error:", err);
    return NextResponse.json({ error: "Failed to load business unit" }, { status: 500 });
  }
}
