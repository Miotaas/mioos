import { prisma } from "@/lib/db";
import { isAIEnabled, getAIProvider } from "@/lib/ai/provider";
import { classifyOpportunityType } from "@/lib/workflow-router";
import { auditLog } from "@/lib/auditLog";
import { checkOpportunityCreationAllowed, checkWorkflowRoutingAllowed } from "@/lib/autonomy-throttle";

interface RawOpportunity {
  title: string;
  description: string;
  opportunityType: string;
  score: number;
  confidence: number;
  estimatedRevenue: number | null;
  market: string | null;
  targetCustomer: string | null;
  nextRecommendedStep: string;
  evidence: string[];
  risks: string[];
}

const EXTRACTION_PROMPT = `Analyze the research output below and extract any concrete, actionable business opportunities.

Only extract opportunities that have clear evidence in the text — do not invent hypothetical ones.

For each opportunity found, return a JSON array with objects:
{
  "title": "Short opportunity name, max 80 chars",
  "description": "What the opportunity is and why it's worth pursuing, 2-3 sentences",
  "opportunityType": "One of: automation_service | ecommerce_product | saas_product | content_business | internal_tool",
  "score": 1-10 (business potential),
  "confidence": 1-10 (how certain based on evidence in the text),
  "estimatedRevenue": monthly EUR revenue potential as a number, or null,
  "market": "Target market or niche",
  "targetCustomer": "Who would buy/use this",
  "nextRecommendedStep": "Single most important next action",
  "evidence": ["evidence point 1", "evidence point 2"],
  "risks": ["risk 1", "risk 2"]
}

Classification guide:
- automation_service: automating manual workflows for businesses (CRM, inbox, scheduling, invoicing, admin)
- ecommerce_product: physical products, dropshipping, online store opportunities
- saas_product: subscription software, AI tools, platforms
- content_business: YouTube, newsletter, blog, course, audience business
- internal_tool: internal automation, tool for own workflow

Return ONLY a valid JSON array. If no concrete opportunities are found, return [].
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
    const result = await ai.generate(EXTRACTION_PROMPT + truncated);
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (o): o is RawOpportunity =>
        typeof o === "object" &&
        typeof o.title === "string" &&
        o.title.length > 0,
    );
  } catch {
    return [];
  }
}

function normalizeOpportunityType(raw: string): string {
  const valid = ["automation_service", "ecommerce_product", "saas_product", "content_business", "internal_tool"];
  return valid.includes(raw) ? raw : "automation_service";
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

  let created = 0;
  for (const opp of extracted) {
    try {
      const type = normalizeOpportunityType(opp.opportunityType);
      if (!await checkOpportunityCreationAllowed(type)) {
        console.log(`[opportunity-engine] Throttle: skipping "${opp.title}" (${type})`);
        continue;
      }
      await prisma.opportunity.create({
        data: {
          title:               opp.title.slice(0, 120),
          description:         opp.description,
          opportunityType:     type,
          source:              "research",
          status:              "discovered",
          score:               Math.min(10, Math.max(1, Math.round(opp.score))),
          confidence:          Math.min(10, Math.max(1, Math.round(opp.confidence))),
          estimatedRevenue:    opp.estimatedRevenue ?? null,
          market:              opp.market ?? null,
          targetCustomer:      opp.targetCustomer ?? null,
          nextRecommendedStep: opp.nextRecommendedStep ?? null,
          evidence:            JSON.stringify(opp.evidence ?? []),
          risks:               JSON.stringify(opp.risks ?? []),
          assignedWorkflowTemplate: type,
          sourceOutputId:      output.id,
          goalId:              output.goalId ?? null,
          projectId:           output.projectId ?? null,
        },
      });

      await auditLog("opportunity", "new", "opportunity_discovered", {
        title:  opp.title,
        type,
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
      },
    });
    return opp.id;
  } catch (err) {
    console.error("[opportunity-engine] Failed to create condition opportunity:", err);
    return null;
  }
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
  const discovered = await prisma.opportunity.findMany({
    where: { status: "discovered", workflowRoutedAt: null },
    orderBy: { score: "desc" },
    take: 5,
  });

  let routed = 0;
  for (const opp of discovered) {
    try {
      const result = await routeOpportunityToWorkflow(opp.id);
      if (result.assignmentsCreated > 0) routed++;
    } catch (err) {
      console.error(`[opportunity-engine] Failed to route opportunity ${opp.id}:`, err);
    }
  }

  return { processed: discovered.length, routed };
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
