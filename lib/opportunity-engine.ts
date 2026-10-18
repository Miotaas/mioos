import { prisma } from "@/lib/db";
import { isAIEnabled, getAIProvider } from "@/lib/ai/provider";
import { buildFounderContextPack } from "@/lib/founder-context";
import { auditLog } from "@/lib/auditLog";
import { checkOpportunityCreationAllowed, checkWorkflowRoutingAllowed } from "@/lib/autonomy-throttle";
import { buForOpportunityType } from "@/lib/businessUnits/config";
import {
  isSolutionsType, normalizeVenture, excludedCategory, normalizeUrl, extractUrls,
  getRetrievedSourceUrls, SOLUTIONS_OPPORTUNITY_TYPES, type SolutionsOpportunityType, type VentureTag,
} from "@/lib/solutions-scope";

/**
 * Opportunity engine — Mio Solutions only (Constitution v1).
 *
 * Extracts candidate opportunities from research outputs and admits them only if
 * they pass the Mio Solutions gate (see lib/solutions-scope.ts):
 *   - unit is mio-solutions and type is one of the six Solutions types
 *   - no excluded category (affiliate, media, e-commerce product, capital/trading, generic ideation)
 *   - a credible monetization path and a named target customer
 *   - NEW ventures need ≥2 evidence sources from ≥2 domains that MioOS actually
 *     retrieved via web search; priority-portfolio opportunities without verified
 *     evidence are admitted with confidence capped at 3 and flagged.
 * Every rejection is written to the audit log with its reason.
 */

interface RawEvidence { claim?: string; sourceUrl?: string }

interface RawOpportunity {
  title: string;
  description: string;
  unit?: string;
  venture?: string;
  opportunityType: string;
  score: number;
  confidence: number;
  estimatedRevenue: number | null;
  market: string | null;
  targetCustomer: string | null;
  monetizationPath?: string;
  nextRecommendedStep: string;
  evidence: Array<RawEvidence | string>;
  risks: string[];
}

const NEW_VENTURE_MIN_SOURCES = 2;
const UNVERIFIED_CONFIDENCE_CAP = 3;

const EXTRACTION_PROMPT = `Analyze the research output below and extract concrete, actionable Mio Solutions opportunities.

Mio Solutions sells AI, software and automation solutions. Its current PRIORITY portfolio is AION, Mail Co-Pilot and the AI Website Agency — prefer opportunities that serve these. NEW opportunities outside the portfolio are allowed only when the research text contains external evidence with source URLs and there is a credible monetization path.

Only extract opportunities that have clear evidence in the text — do not invent hypothetical ones. Never invent or alter URLs: copy them exactly as they appear in the research output. If an opportunity has no source URL in the text, leave sourceUrl empty.

NEVER extract: generic ideation or idea lists, affiliate ideas, media/content businesses (channels, audiences, ad or sponsorship revenue), e-commerce products or stores, capital/investing/trading opportunities. Automation or software FOR such companies is allowed; running such a business is not.

For each opportunity return an object in a JSON array:
{
  "title": "Short opportunity name, max 80 chars",
  "description": "What it is and why it is worth pursuing, 2-3 sentences",
  "unit": "mio-solutions",
  "venture": "aion | mail-copilot | ai-website-agency | new",
  "opportunityType": "One of: software_venture | saas_product | ai_product | automation_service | productized_service | internal_tool",
  "score": 1-10 (business potential),
  "confidence": 1-10 (how certain, based only on evidence in the text),
  "estimatedRevenue": monthly EUR estimate as a number, or null,
  "market": "Target market or niche",
  "targetCustomer": "Who would buy/use this",
  "monetizationPath": "Who pays, for what, how (setup fee / subscription / usage / retainer) and why they would pay",
  "nextRecommendedStep": "Single most important next action",
  "evidence": [{"claim": "evidence point", "sourceUrl": "https://... copied exactly from the text, or empty"}],
  "risks": ["risk 1", "risk 2"]
}

Type guide:
- software_venture: a new standalone software business Mio could build and own
- saas_product: subscription software
- ai_product: a product whose core value is an AI capability
- automation_service: automating a manual workflow for client businesses, delivered as a service
- productized_service: a fixed-scope, fixed-price repeatable service
- internal_tool: a tool for Mio's own operations — ONLY if it has a clear path to being sold to others

Return ONLY a valid JSON array. If no qualifying opportunities are found, return [].
Max 3 opportunities.

RESEARCH OUTPUT:
`;

let _aiDisabledWarned = false;
async function extractWithAI(content: string): Promise<RawOpportunity[]> {
  if (!isAIEnabled()) {
    if (!_aiDisabledWarned) {
      _aiDisabledWarned = true;
      console.warn(
        "[opportunity-engine] AI provider disabled: opportunity extraction will not run. " +
        "Set ANTHROPIC_API_KEY (or OPENAI_API_KEY / OPENROUTER_API_KEY, or AI_PROVIDER=ollama) to enable.",
      );
    }
    return [];
  }

  const ai = getAIProvider();
  const truncated = content.slice(0, 5000);

  try {
    const fc = await buildFounderContextPack().catch(() => "");
    const result = await ai.generate((fc ? fc + "\n\n" : "") + EXTRACTION_PROMPT + truncated);
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (o): o is RawOpportunity =>
        typeof o === "object" && o !== null &&
        typeof o.title === "string" && o.title.length > 0,
    );
  } catch {
    return [];
  }
}

/** Returns the Solutions type, or null if the value is not an allowed Mio Solutions type. */
function normalizeOpportunityType(raw: string): SolutionsOpportunityType | null {
  const t = String(raw ?? "").trim().toLowerCase();
  return isSolutionsType(t) ? t : null;
}

interface GateResult {
  ok: boolean;
  reason?: string;
  type?: SolutionsOpportunityType;
  venture?: VentureTag;
  confidence?: number;
  evidenceLines?: string[];
  verifiedCount?: number;
}

function gateCandidate(
  opp: RawOpportunity,
  sourceText: string,
  retrieved: Set<string>,
): GateResult {
  if (opp.unit && opp.unit !== "mio-solutions") return { ok: false, reason: `unit "${opp.unit}" is not mio-solutions` };

  const type = normalizeOpportunityType(opp.opportunityType);
  if (!type) return { ok: false, reason: `type "${opp.opportunityType}" is not a Mio Solutions type (${SOLUTIONS_OPPORTUNITY_TYPES.join(", ")})` };

  const haystack = [opp.title, opp.description, opp.market, opp.targetCustomer, opp.monetizationPath].filter(Boolean).join(" ");
  const excluded = excludedCategory(haystack);
  if (excluded) return { ok: false, reason: `excluded category: ${excluded}` };

  const monetization = (opp.monetizationPath ?? "").trim();
  if (monetization.length < 20) return { ok: false, reason: "no credible monetization path" };
  if (!(opp.targetCustomer ?? "").trim()) return { ok: false, reason: "no target customer" };

  // Evidence: a URL counts only if it appears in the research output AND was
  // retrieved by MioOS's web-search connector.
  const textUrls = new Set(extractUrls(sourceText).map(normalizeUrl).filter(Boolean) as string[]);
  const verifiedDomains = new Set<string>();
  let verifiedCount = 0;
  const evidenceLines: string[] = [];
  for (const e of Array.isArray(opp.evidence) ? opp.evidence : []) {
    const claim = typeof e === "string" ? e : String(e?.claim ?? "");
    const url = typeof e === "string" ? (extractUrls(e)[0] ?? "") : String(e?.sourceUrl ?? "");
    const n = url ? normalizeUrl(url) : null;
    const verified = Boolean(n && textUrls.has(n) && retrieved.has(n));
    if (verified && n) { verifiedCount++; verifiedDomains.add(n.split("/")[0]); }
    evidenceLines.push(`${claim.slice(0, 300)}${url ? ` — ${url}` : ""} [${verified ? "verified source" : "unverified"}]`);
  }

  const venture = normalizeVenture(opp.venture);
  let confidence = Math.min(10, Math.max(1, Math.round(Number(opp.confidence) || 1)));

  if (venture === "new") {
    if (verifiedCount < NEW_VENTURE_MIN_SOURCES || verifiedDomains.size < NEW_VENTURE_MIN_SOURCES) {
      return { ok: false, reason: `new opportunity needs ≥${NEW_VENTURE_MIN_SOURCES} verified sources from ≥${NEW_VENTURE_MIN_SOURCES} domains (found ${verifiedCount} from ${verifiedDomains.size})` };
    }
    if (type === "internal_tool" && !/sell|licen|subscri|resell|customers?|clients?/i.test(monetization)) {
      return { ok: false, reason: "internal tool without a commercialization path" };
    }
  } else if (verifiedCount === 0) {
    confidence = Math.min(confidence, UNVERIFIED_CONFIDENCE_CAP);
  }

  return { ok: true, type, venture, confidence, evidenceLines, verifiedCount };
}

async function businessUnitIdForType(type: string): Promise<string | null> {
  const slug = buForOpportunityType(type);
  if (!slug) return null;
  const bu = await prisma.businessUnit.findUnique({ where: { slug }, select: { id: true } }).catch(() => null);
  return bu?.id ?? null;
}

export async function extractOpportunitiesFromOutput(output: {
  id: string;
  title: string;
  content: string;
  goalId?: string | null;
  projectId?: string | null;
}): Promise<number> {
  const extracted = await extractWithAI(output.content);
  if (extracted.length === 0) return 0;

  const retrieved = await getRetrievedSourceUrls().catch(() => new Set<string>());

  let created = 0;
  for (const opp of extracted) {
    try {
      const gate = gateCandidate(opp, output.content, retrieved);
      if (!gate.ok || !gate.type) {
        console.log(`[opportunity-engine] Rejected "${opp.title}": ${gate.reason}`);
        await auditLog("opportunity", output.id, "opportunity_candidate_rejected", {
          title: opp.title.slice(0, 120), type: opp.opportunityType, reason: gate.reason,
        });
        continue;
      }
      const type = gate.type;
      if (!await checkOpportunityCreationAllowed(type)) {
        console.log(`[opportunity-engine] Throttle: skipping "${opp.title}" (${type})`);
        continue;
      }
      const risks = Array.isArray(opp.risks) ? opp.risks.map(String) : [];
      if (gate.venture !== "new" && gate.verifiedCount === 0) {
        risks.unshift(`No verified external evidence — confidence capped at ${UNVERIFIED_CONFIDENCE_CAP}`);
      }
      await prisma.opportunity.create({
        data: {
          title:               opp.title.slice(0, 120),
          description:         opp.description,
          opportunityType:     type,
          source:              "research",
          status:              "discovered",
          score:               Math.min(10, Math.max(1, Math.round(Number(opp.score) || 1))),
          confidence:          gate.confidence ?? 1,
          estimatedRevenue:    typeof opp.estimatedRevenue === "number" ? opp.estimatedRevenue : null,
          market:              opp.market ?? null,
          targetCustomer:      opp.targetCustomer ?? null,
          nextRecommendedStep: opp.nextRecommendedStep ?? null,
          executionStrategy:   `Monetization path: ${String(opp.monetizationPath ?? "").trim()}`,
          evidence:            JSON.stringify(gate.evidenceLines ?? []),
          risks:               JSON.stringify(risks),
          assumptions:         JSON.stringify([`Venture: ${gate.venture}`, `Verified evidence sources: ${gate.verifiedCount ?? 0}`]),
          assignedWorkflowTemplate: type,
          sourceOutputId:      output.id,
          goalId:              output.goalId ?? null,
          projectId:           output.projectId ?? null,
          businessUnitId:      await businessUnitIdForType(type),
        },
      });

      await auditLog("opportunity", "new", "opportunity_discovered", {
        title:  opp.title,
        type,
        venture: gate.venture,
        verifiedSources: gate.verifiedCount ?? 0,
        sourceOutputId: output.id,
      });

      created++;
    } catch (err) {
      console.error("[opportunity-engine] Failed to save opportunity:", err);
    }
  }

  return created;
}

export async function createOpportunityFromCondition(params: {
  title: string;
  description: string;
  opportunityType: string;
  source: string;
  goalId?: string | null;
}): Promise<string | null> {
  try {
    const type = normalizeOpportunityType(params.opportunityType);
    if (!type) {
      console.warn(`[opportunity-engine] Condition opportunity rejected: "${params.opportunityType}" is not a Mio Solutions type`);
      return null;
    }
    const opp = await prisma.opportunity.create({
      data: {
        title:               params.title.slice(0, 120),
        description:         params.description,
        opportunityType:     type,
        source:              params.source,
        status:              "discovered",
        score:               6,
        confidence:          5,
        assignedWorkflowTemplate: type,
        goalId:              params.goalId ?? null,
        businessUnitId:      await businessUnitIdForType(type),
      },
    });
    return opp.id;
  } catch (err) {
    console.error("[opportunity-engine] Failed to create condition opportunity:", err);
    return null;
  }
}

/** Priority-portfolio opportunities route before new ones. */
function isPriorityVenture(assumptions: string | null): boolean {
  return !(assumptions ?? "").includes("Venture: new");
}

export async function routeOpportunityToWorkflow(
  opportunityId: string,
): Promise<{ assignmentsCreated: number }> {
  const opportunity = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
  if (!opportunity) return { assignmentsCreated: 0 };
  if (opportunity.workflowRoutedAt) return { assignmentsCreated: 0 };

  if (!await checkWorkflowRoutingAllowed()) {
    console.log(`[opportunity-engine] Throttle: workflow routing blocked for "${opportunity.title}"`);
    return { assignmentsCreated: 0 };
  }

  // Auto-create Project for high-potential opportunities
  let autoProjectId: string | null = null;
  if (opportunity.score >= 6 && !opportunity.projectId) {
    try {
      const slug = opportunity.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 55) + "-" + Date.now().toString(36);

      const project = await prisma.project.create({
        data: {
          name:          opportunity.title.slice(0, 150),
          slug,
          description:   opportunity.description ?? `Auto-created from opportunity: ${opportunity.title}`,
          status:        "active",
          priority:      opportunity.score >= 8 ? "high" : "medium",
          opportunityId: opportunity.id,
          autoCreated:   true,
          revenueImpact: opportunity.estimatedRevenue ?? null,
        },
      });
      autoProjectId = project.id;
      console.log(`[opportunity-engine] Auto-created project: "${project.name}"`);
    } catch (err) {
      console.error("[opportunity-engine] Auto-project creation failed:", err);
    }
  }

  // Auto-create RevenueEntry for opportunities with revenue potential
  if (opportunity.estimatedRevenue && opportunity.estimatedRevenue > 0 && !opportunity.revenueEntryId) {
    try {
      await prisma.revenueEntry.create({
        data: {
          title:         `[Potential] ${opportunity.title}`,
          amount:        opportunity.estimatedRevenue,
          currency:      "EUR",
          revenueType:   "potential",
          serviceType:   opportunity.opportunityType === "ecommerce_product" ? "product" : "service",
          status:        "active",
          opportunityId: opportunity.id,
          projectId:     autoProjectId ?? null,
          probability:   opportunity.confidence * 10,
        },
      });
    } catch (err) {
      console.error("[opportunity-engine] Revenue entry creation failed:", err);
    }
  }

  // Update projectId before starting pipeline so assignments carry it
  if (autoProjectId) {
    await prisma.opportunity.update({
      where: { id: opportunityId },
      data:  { projectId: autoProjectId },
    });
  }

  // Start the sequential pipeline — stage 0 only; each stage advances after completion
  const { startOpportunityPipeline } = await import("@/lib/company/department-pipeline");
  const { assignmentsCreated, chain } = await startOpportunityPipeline(opportunityId);

  await auditLog("opportunity", opportunityId, "pipeline_started", {
    opportunityType: opportunity.opportunityType,
    assignmentsCreated,
    chain,
  });

  console.log(`[opportunity-engine] Started pipeline for "${opportunity.title}" (${opportunity.opportunityType}) → [${chain.join(" → ")}] (stage 0 queued)`);

  return { assignmentsCreated };
}

export async function processDiscoveredOpportunities(): Promise<{ processed: number; routed: number }> {
  // Discovered opportunities outside Mio Solutions (legacy e-commerce/content rows)
  // are archived, never routed. Nothing is deleted.
  const outOfScope = await prisma.opportunity.findMany({
    where:  { status: "discovered", workflowRoutedAt: null, opportunityType: { notIn: [...SOLUTIONS_OPPORTUNITY_TYPES] } },
    select: { id: true, opportunityType: true },
  });
  for (const o of outOfScope) {
    await prisma.opportunity.update({
      where: { id: o.id },
      data:  { status: "archived", nextRecommendedStep: `Archived: type "${o.opportunityType}" is outside Mio Solutions (Constitution v1) — not routed.` },
    });
    await auditLog("opportunity", o.id, "opportunity_archived_out_of_scope", { type: o.opportunityType });
  }

  const discovered = await prisma.opportunity.findMany({
    where: { status: "discovered", workflowRoutedAt: null, opportunityType: { in: [...SOLUTIONS_OPPORTUNITY_TYPES] } },
    orderBy: { score: "desc" },
    take: 20,
  });
  // Priority portfolio (AION, Mail Co-Pilot, AI Website Agency) first, then new opportunities.
  discovered.sort((x, y) => Number(isPriorityVenture(y.assumptions)) - Number(isPriorityVenture(x.assumptions)) || y.score - x.score);

  let routed = 0;
  for (const opp of discovered.slice(0, 5)) {
    try {
      const result = await routeOpportunityToWorkflow(opp.id);
      if (result.assignmentsCreated > 0) routed++;
    } catch (err) {
      console.error(`[opportunity-engine] Failed to route opportunity ${opp.id}:`, err);
    }
  }

  return { processed: Math.min(discovered.length, 5), routed };
}

export async function getOpportunitySummary(): Promise<{
  total: number;
  discovered: number;
  active: number;
  live: number;
  estimatedRevenue: number;
}> {
  const [total, discovered, active, live, revenue] = await Promise.all([
    prisma.opportunity.count({ where: { status: { notIn: ["rejected", "archived"] } } }),
    prisma.opportunity.count({ where: { status: "discovered" } }),
    prisma.opportunity.count({ where: { status: { in: ["researching", "validating", "approved", "building", "marketing", "selling", "demo", "pilot"] } } }),
    prisma.opportunity.count({ where: { status: { in: ["live", "revenue_generating"] } } }),
    prisma.opportunity.aggregate({
      _sum: { estimatedRevenue: true },
      where: { status: { notIn: ["rejected", "archived"] } },
    }),
  ]);

  return {
    total,
    discovered,
    active,
    live,
    estimatedRevenue: revenue._sum.estimatedRevenue ?? 0,
  };
}
