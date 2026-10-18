/**
 * Capital Allocator — Executive ROI Scoring & Effort Focus (Mio Solutions)
 *
 * Runs every 12 hours. Scores active opportunities by ROI potential and points
 * teams (team.currentFocus) at the best opportunity in their domain.
 *
 * Constitution v1.1 §2.1.1 — the priority portfolio (AION, Mail Co-Pilot, AI
 * Website Agency) is changed only by the founder:
 *   - Team focus is written ONLY from priority-portfolio opportunities.
 *   - New ventures are still scored and ranked, but never written into team focus
 *     and never given an effort allocation.
 *   - If a new venture outranks a priority-portfolio candidate, the allocator
 *     creates ONE founder decision (decisionType "portfolio_review") recommending
 *     a portfolio review. It is deduplicated per opportunity and only one can be
 *     pending at a time.
 *   - Approving that decision only records it (generic founder-decision handling).
 *     There is no mechanism yet that changes the portfolio; that is a later,
 *     dedicated implementation. Until then focus stays on the portfolio.
 *
 * The formula: ROI = (expectedRevenue × confidence%) / effortMultiplier
 * expectedRevenue is an AI estimate unless stated otherwise.
 */

import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/auditLog";
import { PRIORITY_VENTURES } from "@/lib/solutions-scope";

export const KEY_LAST_ALLOCATION   = "runtime:lastCapitalAllocation";
export const ALLOCATION_INTERVAL_H = Number(process.env.ALLOCATION_INTERVAL_H ?? "12");

export const PORTFOLIO_REVIEW_DECISION = "portfolio_review";

type VentureClass = (typeof PRIORITY_VENTURES)[number] | "new" | "unclassified";

export interface AllocationEntry {
  opportunityId:   string;
  title:           string;
  opportunityType: string;
  score:           number;
  confidence:      number;
  estimatedRevenue: number;
  effortMultiplier: number;
  roi:             number;
  roiRank:         number;        // rank by ROI across ALL scored opportunities (1 = best)
  venture:         VentureClass;
  focusEligible:   boolean;       // true only for priority-portfolio opportunities
  allocationPct:   number;        // 0 for anything outside the priority portfolio
  recommendation:  string;
  status:          string;
}

const EFFORT_MULTIPLIERS: Record<string, number> = {
  low:    1,
  medium: 2,
  high:   3,
};

const VENTURE_NAMES: Record<string, string> = {
  "aion":              "AION",
  "mail-copilot":      "Mail Co-Pilot",
  "ai-website-agency": "AI Website Agency",
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

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a.map(String) : []; } catch { return []; }
}

/**
 * Venture of an opportunity. Uses the "Venture: x" tag written by the opportunity
 * engine; for older untagged rows, only an explicit product name counts.
 * Untagged rows that name no portfolio venture are "unclassified": ranked, but
 * never given focus and never used for a portfolio-review recommendation.
 */
function ventureOf(opp: { title: string; assumptions: string | null }): VentureClass {
  const tag = parseJsonArray(opp.assumptions).find(a => a.startsWith("Venture: "));
  if (tag) {
    const v = tag.slice("Venture: ".length).trim();
    if ((PRIORITY_VENTURES as readonly string[]).includes(v)) return v as VentureClass;
    if (v === "new") return "new";
  }
  if (/\bAION\b/i.test(opp.title)) return "aion";
  if (/mail\s*co-?pilot/i.test(opp.title)) return "mail-copilot";
  if (/ai website agency|website refresh/i.test(opp.title)) return "ai-website-agency";
  return "unclassified";
}

export async function runCapitalAllocation(): Promise<{ allocationPlan: AllocationEntry[]; portfolioReviewApprovalId: string | null }> {
  const opportunities = await prisma.opportunity.findMany({
    where: {
      status: { notIn: ["rejected", "archived", "live", "revenue_generating"] },
    },
    select: {
      id: true, title: true, description: true, opportunityType: true, score: true, confidence: true,
      estimatedRevenue: true, estimatedEffort: true, status: true, currentStage: true,
      assumptions: true, evidence: true, risks: true, targetCustomer: true, executionStrategy: true,
      businessUnitId: true,
    },
    orderBy: { score: "desc" },
    take: 20,
  });

  if (opportunities.length === 0) return { allocationPlan: [], portfolioReviewApprovalId: null };

  // 1. Score and rank EVERY opportunity (new ventures included — internal analysis only).
  const ranked = opportunities
    .map(opp => ({ ...opp, roi: calcROI(opp), venture: ventureOf(opp) }))
    .sort((a, b) => b.roi - a.roi)
    .map((opp, i) => ({ ...opp, roiRank: i + 1 }));

  const isPriority = (v: VentureClass) => (PRIORITY_VENTURES as readonly string[]).includes(v);
  const portfolio  = ranked.filter(o => isPriority(o.venture));
  const others     = ranked.filter(o => !isPriority(o.venture));

  // 2. Effort allocation exists only within the priority portfolio.
  const totalROI = portfolio.reduce((sum, o) => sum + o.roi, 0) || 1;
  const portfolioEntries: AllocationEntry[] = portfolio.map((opp, index) => {
    const rawPct = Math.round((opp.roi / totalROI) * 100);
    const cappedPct = Math.min(rawPct, index === 0 ? 60 : index === 1 ? 30 : 20);
    let recommendation = "";
    if (index === 0) recommendation = `PRIMARY — allocate max effort here`;
    else if (index === 1) recommendation = `SECONDARY — maintain progress`;
    else if (index <= 3) recommendation = `ACTIVE — keep momentum`;
    else if (opp.score <= 3) recommendation = `REVIEW — consider pausing`;
    else recommendation = `PIPELINE — minimal effort`;
    return {
      opportunityId: opp.id, title: opp.title, opportunityType: opp.opportunityType,
      score: opp.score, confidence: opp.confidence,
      estimatedRevenue: opp.estimatedRevenue ?? opp.score * 300,
      effortMultiplier: effortMultiplier(opp.estimatedEffort),
      roi: opp.roi, roiRank: opp.roiRank, venture: opp.venture, focusEligible: true,
      allocationPct: Math.max(1, cappedPct), recommendation, status: opp.status,
    };
  });
  const totalPct = portfolioEntries.reduce((s, e) => s + e.allocationPct, 0);
  if (totalPct > 0) {
    portfolioEntries.forEach(e => { e.allocationPct = Math.round((e.allocationPct / totalPct) * 100); });
  }

  const otherEntries: AllocationEntry[] = others.map(opp => ({
    opportunityId: opp.id, title: opp.title, opportunityType: opp.opportunityType,
    score: opp.score, confidence: opp.confidence,
    estimatedRevenue: opp.estimatedRevenue ?? opp.score * 300,
    effortMultiplier: effortMultiplier(opp.estimatedEffort),
    roi: opp.roi, roiRank: opp.roiRank, venture: opp.venture, focusEligible: false,
    allocationPct: 0,
    recommendation: opp.venture === "new"
      ? `NEW VENTURE — analysis only; no effort allocated until the founder changes the portfolio`
      : `UNCLASSIFIED — analysis only; no effort allocated`,
    status: opp.status,
  }));

  // Portfolio first so plan[0] (dashboard "top action", runtime log) is always a portfolio venture.
  const plan: AllocationEntry[] = [...portfolioEntries, ...otherEntries];

  // 3. Team focus — priority-portfolio opportunities only.
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
  const deptTopOpp = new Map<string, string>(); // dept → opportunity title
  for (const entry of portfolioEntries) {
    for (const [dept, stages] of Object.entries(deptHints)) {
      if (!deptTopOpp.has(dept) && stages.includes(entry.status)) {
        deptTopOpp.set(dept, entry.title);
      }
    }
  }
  for (const [dept, title] of deptTopOpp.entries()) {
    await prisma.workforceTeam.updateMany({
      where: { departmentType: dept, status: "active" },
      data:  { currentFocus: `[PRIORITY] ${title.slice(0, 100)}` },
    }).catch(() => { /* non-fatal */ });
  }

  // Clear any allocator-written focus that is no longer backed by a portfolio
  // opportunity (e.g. written by an earlier version that could point at a new venture).
  await prisma.workforceTeam.updateMany({
    where: {
      status: "active",
      currentFocus: { startsWith: "[PRIORITY]" },
      ...(deptTopOpp.size > 0 ? { departmentType: { notIn: [...deptTopOpp.keys()] } } : {}),
    },
    data: { currentFocus: null },
  }).catch(() => { /* non-fatal */ });

  // 4. A new venture outranking a portfolio candidate → founder decision, never focus.
  const portfolioReviewApprovalId = await maybeRecommendPortfolioReview(ranked, isPriority);

  // 5. Persist allocation plan in RuntimeState
  await prisma.runtimeState.upsert({
    where:  { key: "runtime:capitalAllocation" },
    create: { key: "runtime:capitalAllocation", value: JSON.stringify({ updatedAt: new Date().toISOString(), plan }) },
    update: { value: JSON.stringify({ updatedAt: new Date().toISOString(), plan }) },
  }).catch(() => {});

  await auditLog("system", "capital-allocator", "allocation_updated", {
    topPortfolioOpportunity: portfolioEntries[0]?.title ?? "none",
    totalScored:             plan.length,
    portfolioScored:         portfolioEntries.length,
    newVenturesScored:       otherEntries.filter(e => e.venture === "new").length,
    portfolioReviewApprovalId,
  });

  console.log(`[allocator] Scored ${plan.length} opportunities — top portfolio: "${portfolioEntries[0]?.title ?? "none"}" (ROI: €${portfolioEntries[0]?.roi ?? 0})${portfolioReviewApprovalId ? ` · portfolio review raised: ${portfolioReviewApprovalId}` : ""}`);

  return { allocationPlan: plan, portfolioReviewApprovalId };
}

type Ranked = {
  id: string; title: string; description: string | null; opportunityType: string;
  score: number; confidence: number; estimatedRevenue: number | null; estimatedEffort: string | null;
  evidence: string | null; risks: string | null; targetCustomer: string | null; executionStrategy: string | null;
  businessUnitId: string | null; roi: number; roiRank: number; venture: VentureClass;
};

/**
 * Creates at most ONE pending portfolio-review decision. Deduplication:
 *   - never while another portfolio_review decision is pending;
 *   - never twice for the same opportunity, whatever the earlier outcome
 *     (pending, approved or rejected) — the founder already decided or is deciding.
 */
async function maybeRecommendPortfolioReview(
  ranked: Ranked[],
  isPriority: (v: VentureClass) => boolean,
): Promise<string | null> {
  // Top new venture that ranks above at least one portfolio opportunity.
  let candidate: Ranked | null = null;
  let displaced: Ranked | null = null;
  for (const o of ranked) {
    if (o.venture !== "new") continue;
    const below = ranked.find(p => isPriority(p.venture) && p.roiRank > o.roiRank);
    if (below) { candidate = o; displaced = below; break; }
  }
  if (!candidate || !displaced) return null;

  const pending = await prisma.approval.count({ where: { decisionType: PORTFOLIO_REVIEW_DECISION, status: "pending" } });
  if (pending > 0) return null;

  const marker = `Opportunity ID: ${candidate.id}`;
  const already = await prisma.approval.count({
    where: { decisionType: PORTFOLIO_REVIEW_DECISION, description: { contains: marker } },
  });
  if (already > 0) return null;

  const verified   = parseJsonArray(candidate.evidence).filter(e => e.includes("[verified source]"));
  const risks      = parseJsonArray(candidate.risks);
  const displacedName = VENTURE_NAMES[displaced.venture] ?? displaced.venture;
  const monthly    = (n: number | null, score: number) => n != null ? `€${Math.round(n).toLocaleString("en-GB")}/month (AI estimate)` : `no revenue estimate (ROI uses €${score * 300} fallback)`;

  const description = [
    `MioOS recommends a portfolio review. A new Mio Solutions venture now ranks above a current priority-portfolio opportunity on estimated ROI.`,
    `No effort has been moved: team focus stays on the priority portfolio until you decide. Approving records your decision only — the portfolio is not changed automatically (Constitution §2.1.1).`,
    ``,
    `**New venture:** ${candidate.title} (${candidate.opportunityType.replace(/_/g, " ")})`,
    candidate.description ? `${candidate.description}` : "",
    candidate.targetCustomer ? `Target customer: ${candidate.targetCustomer}` : "",
    candidate.executionStrategy ? `${candidate.executionStrategy}` : "",
    ``,
    `**Why it outranks the current portfolio candidate**`,
    `- New venture: ROI rank #${candidate.roiRank}, ROI €${candidate.roi.toLocaleString("en-GB")} — ${monthly(candidate.estimatedRevenue, candidate.score)}, confidence ${candidate.confidence}/10, effort ${candidate.estimatedEffort ?? "medium"}`,
    `- ${displacedName} candidate "${displaced.title}": ROI rank #${displaced.roiRank}, ROI €${displaced.roi.toLocaleString("en-GB")} — ${monthly(displaced.estimatedRevenue, displaced.score)}, confidence ${displaced.confidence}/10, effort ${displaced.estimatedEffort ?? "medium"}`,
    `- ROI = estimated monthly revenue × confidence ÷ effort. Revenue figures are AI estimates, not revenue.`,
    ``,
    `**Verified evidence** (sources retrieved by MioOS web search)`,
    ...(verified.length > 0 ? verified.map(e => `- ${e}`) : [`- None recorded — treat this recommendation as unproven.`]),
    ``,
    `**Expected upside:** ${monthly(candidate.estimatedRevenue, candidate.score)}; opportunity score ${candidate.score}/10.`,
    `**Expected downside / risk:**`,
    ...(risks.length > 0 ? risks.map(r => `- ${r}`) : [`- No risks recorded by research.`]),
    `- Effort moved away from ${displacedName} slows a venture that is already in the portfolio.`,
    ``,
    `**If approved:** your decision is recorded. The priority portfolio does not change yet — moving "${candidate.title}" into the portfolio and shifting effort from ${displacedName} needs a separate, dedicated implementation.`,
    `**If rejected:** nothing changes. Focus stays on the priority portfolio, the venture remains analysis-only, and MioOS will not raise this recommendation again for this opportunity.`,
    `**Priority venture that would lose effort if approved:** ${displacedName} ("${displaced.title}").`,
    ``,
    marker,
  ].filter(s => s !== "").join("\n");

  const approval = await prisma.approval.create({
    data: {
      title:          `Portfolio review: "${candidate.title.slice(0, 80)}" outranks ${displacedName}`,
      description,
      reason:         `New venture ranks #${candidate.roiRank} on estimated ROI, above ${displacedName} candidate at #${displaced.roiRank}.`,
      status:         "pending",
      decisionType:   PORTFOLIO_REVIEW_DECISION,
      priority:       "medium",
      riskLevel:      "medium", // never "low": triage only auto-approves low-risk items
      businessUnitId: candidate.businessUnitId,
    },
  });

  await auditLog("system", "capital-allocator", "portfolio_review_recommended", {
    approvalId: approval.id,
    opportunityId: candidate.id,
    displacedOpportunityId: displaced.id,
    displacedVenture: displaced.venture,
  });

  return approval.id;
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
