import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rollupBusinessUnit } from "@/lib/businessUnits/rollup";
import { BUSINESS_UNITS } from "@/lib/businessUnits/config";

export const dynamic = "force-dynamic";

// GET /api/business-units — the 4 units with their P&L rollups.
// Falls back to static config (zeroed metrics) if the backfill hasn't run yet,
// so the founder UI never breaks before Phase 1 data exists.
export async function GET() {
  try {
    const units = await prisma.businessUnit.findMany({ orderBy: { sortOrder: "asc" } });

    if (units.length === 0) {
      const stub = BUSINESS_UNITS.map((b) => ({
        id: b.slug,
        slug: b.slug,
        name: b.name,
        kind: b.kind,
        status: "active",
        objective: b.objective,
        revenue: { closed: 0, pipeline: 0, weightedPipeline: 0, currency: "EUR" },
        counts: { opportunities: 0, opportunitiesByStatus: {}, outputs: 0, pendingApprovals: 0, activeAssignments: 0 },
      }));
      return NextResponse.json({ businessUnits: stub, seeded: false });
    }

    const businessUnits = await Promise.all(units.map((u) => rollupBusinessUnit(u)));
    return NextResponse.json({ businessUnits, seeded: true });
  } catch (err) {
    console.error("[api/business-units] error:", err);
    return NextResponse.json({ error: "Failed to load business units" }, { status: 500 });
  }
}
