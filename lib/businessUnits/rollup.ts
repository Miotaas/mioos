/**
 * Phase 1 — per-Business-Unit P&L rollup (read-only).
 *
 * Aggregates the transactional tables by businessUnitId so each unit can show
 * its own revenue, pipeline, opportunities, outputs, approvals and activity.
 * Pure data — no side effects, no UI. Safe to call from API routes.
 */
import { prisma } from "@/lib/db";

export interface BusinessUnitSummary {
  id: string;
  slug: string;
  name: string;
  kind: string;
  status: string;
  objective: string | null;
  revenue: {
    closed: number;     // realized (closed_won / live)
    pipeline: number;   // open pipeline
    weightedPipeline: number;
    currency: string;
  };
  counts: {
    opportunities: number;
    opportunitiesByStatus: Record<string, number>;
    outputs: number;
    pendingApprovals: number;
    activeAssignments: number;
  };
}

const CLOSED = (e: { revenueType: string; status: string }) =>
  e.revenueType === "live" || e.status === "closed_won";

export async function rollupBusinessUnit(unit: {
  id: string; slug: string; name: string; kind: string; status: string; objective: string | null;
}): Promise<BusinessUnitSummary> {
  const where = { businessUnitId: unit.id };

  const [revenueEntries, opportunities, outputs, pendingApprovals, activeAssignments] =
    await Promise.all([
      prisma.revenueEntry.findMany({ where }),
      prisma.opportunity.findMany({ where, select: { status: true } }),
      prisma.workforceOutput.count({ where }),
      prisma.approval.count({ where: { ...where, status: "pending" } }),
      prisma.assignment.count({ where: { ...where, status: { in: ["pending", "active", "review"] } } }),
    ]);

  const closed = revenueEntries.filter(CLOSED).reduce((s, e) => s + e.amount, 0);
  const pipelineEntries = revenueEntries.filter((e) => e.revenueType === "pipeline");
  const pipeline = pipelineEntries.reduce((s, e) => s + e.amount, 0);
  const weightedPipeline = pipelineEntries.reduce((s, e) => s + e.amount * (e.probability ?? 0.5), 0);

  const opportunitiesByStatus: Record<string, number> = {};
  for (const o of opportunities) {
    opportunitiesByStatus[o.status] = (opportunitiesByStatus[o.status] ?? 0) + 1;
  }

  return {
    id: unit.id,
    slug: unit.slug,
    name: unit.name,
    kind: unit.kind,
    status: unit.status,
    objective: unit.objective,
    revenue: {
      closed,
      pipeline,
      weightedPipeline,
      currency: revenueEntries[0]?.currency ?? "EUR",
    },
    counts: {
      opportunities: opportunities.length,
      opportunitiesByStatus,
      outputs,
      pendingApprovals,
      activeAssignments,
    },
  };
}
