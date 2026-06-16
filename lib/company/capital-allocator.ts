/**
 * Capital Allocator — Executive ROI Scoring & Effort Distribution
 *
 * Runs every 12 hours. Scores all active opportunities by ROI potential,
 * ranks them, and recommends where company effort should go.
 * Updates team.currentFocus for each department's top opportunity.
 *
 * The formula: ROI = (expectedRevenue × confidence%) / effortMultiplier
 * Teams are then pointed at the highest-ROI opportunity in their domain.
 */

import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/auditLog";

export const KEY_LAST_ALLOCATION   = "runtime:lastCapitalAllocation";
export const ALLOCATION_INTERVAL_H = Number(process.env.ALLOCATION_INTERVAL_H ?? "12");

export interface AllocationEntry {
  opportunityId:   string;
  title:           string;
  opportunityType: string;
  score:           number;
  confidence:      number;
  estimatedRevenue: number;
  effortMultiplier: number;
  roi:             number;
  allocationPct:   number;
  recommendation:  string;
  status:          string;
}

const EFFORT_MULTIPLIERS: Record<string, number> = {
  low:    1,
  medium: 2,
  high:   3,
};

function effortMultiplier(effort: string | null): number {
  return EFFORT_MULTIPLIERS[effort ?? "medium"] ?? 2;
}

function calcROI(opp: {
  score: number;
  confidence: number;
  estimatedRevenue: number | null;
  estimatedEffort: string | null;
}): number {
  const revenue    = opp.estimatedRevenue ?? opp.score * 300; // fallback: €300 per score point
  const confidence = opp.confidence / 10;
  const effort     = effortMultiplier(opp.estimatedEffort);
  return Math.round((revenue * confidence) / effort);
}

export async function runCapitalAllocation(): Promise<{ allocationPlan: AllocationEntry[] }> {
  const opportunities = await prisma.opportunity.findMany({
    where: {
      status: { notIn: ["rejected", "archived", "live", "revenue_generating"] },
    },
    select: {
      id: true, title: true, opportunityType: true, score: true, confidence: true,
      estimatedRevenue: true, estimatedEffort: true, status: true, currentStage: true,
    },
    orderBy: { score: "desc" },
    take: 20,
  });

  if (opportunities.length === 0) return { allocationPlan: [] };

  // Score each opportunity by ROI
  const scored = opportunities.map(opp => ({
    ...opp,
    roi: calcROI(opp),
  }));

  // Sort by ROI descending
  scored.sort((a, b) => b.roi - a.roi);

  // Distribute allocation % (top 3 get most, remainder share the rest)
  const totalROI = scored.reduce((sum, o) => sum + o.roi, 0) || 1;
  const plan: AllocationEntry[] = scored.map((opp, index) => {
    const rawPct = Math.round((opp.roi / totalROI) * 100);
    const cappedPct = Math.min(rawPct, index === 0 ? 60 : index === 1 ? 30 : 20);

    let recommendation = "";
    if (index === 0) recommendation = `PRIMARY — allocate max effort here`;
    else if (index === 1) recommendation = `SECONDARY — maintain progress`;
    else if (index <= 3) recommendation = `ACTIVE — keep momentum`;
    else if (opp.score <= 3) recommendation = `REVIEW — consider pausing`;
    else recommendation = `PIPELINE — minimal effort`;

    return {
      opportunityId:   opp.id,
      title:           opp.title,
      opportunityType: opp.opportunityType,
      score:           opp.score,
      confidence:      opp.confidence,
      estimatedRevenue: opp.estimatedRevenue ?? opp.score * 300,
      effortMultiplier: effortMultiplier(opp.estimatedEffort),
      roi:             opp.roi,
      allocationPct:   Math.max(1, cappedPct),
      recommendation,
      status:          opp.status,
    };
  });

  // Normalize to 100%
  const totalPct = plan.reduce((s, e) => s + e.allocationPct, 0);
  if (totalPct > 0) {
    plan.forEach(e => { e.allocationPct = Math.round((e.allocationPct / totalPct) * 100); });
  }

  // Update team currentFocus for each department to point at their best opportunity
  const deptTopOpp = new Map<string, string>(); // dept → opportunity title
  for (const entry of plan) {
    const stage = entry.status; // e.g., "researching" → research team should focus
    const deptHints: Record<string, string[]> = {
      research:   ["discovered", "researching"],
      sales:      ["researching", "validating"],
      marketing:  ["validating", "approved"],
      content:    ["approved", "building"],
      development:["approved", "building"],
      operations: ["building", "marketing"],
      commerce:   ["discovered", "researching"],
      executive:  ["validating", "approved"],
    };

    for (const [dept, stages] of Object.entries(deptHints)) {
      if (!deptTopOpp.has(dept) && stages.includes(stage)) {
        deptTopOpp.set(dept, entry.title);
      }
    }
  }

  // Apply team focus updates
  for (const [dept, title] of deptTopOpp.entries()) {
    await prisma.workforceTeam.updateMany({
      where: { departmentType: dept, status: "active" },
      data:  { currentFocus: `[PRIORITY] ${title.slice(0, 100)}` },
    }).catch(() => { /* non-fatal */ });
  }

  // Persist allocation plan in RuntimeState
  await prisma.runtimeState.upsert({
    where:  { key: "runtime:capitalAllocation" },
    create: { key: "runtime:capitalAllocation", value: JSON.stringify({ updatedAt: new Date().toISOString(), plan }) },
    update: { value: JSON.stringify({ updatedAt: new Date().toISOString(), plan }) },
  }).catch(() => {});

  await auditLog("system", "capital-allocator", "allocation_updated", {
    topOpportunity: plan[0]?.title ?? "none",
    totalScored:    plan.length,
  });

  console.log(`[allocator] Scored ${plan.length} opportunities — top: "${plan[0]?.title ?? "none"}" (ROI: €${plan[0]?.roi ?? 0})`);

  return { allocationPlan: plan };
}

export async function getAllocationPlan(): Promise<AllocationEntry[] | null> {
  const rec = await prisma.runtimeState.findUnique({ where: { key: "runtime:capitalAllocation" } }).catch(() => null);
  if (!rec) return null;
  try {
    const data = JSON.parse(rec.value) as { plan: AllocationEntry[] };
    return data.plan ?? null;
  } catch {
    return null;
  }
}
