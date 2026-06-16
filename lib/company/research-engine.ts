/**
 * Autonomous Research Engine
 *
 * Research should never be idle. This engine ensures the Research team
 * always has discovery tasks regardless of whether the founder has created
 * goals, projects, or explicit requests.
 *
 * Triggers:
 * - < 5 discovered opportunities in last 14 days → create discovery tasks
 * - Active revenue goals but no automation opps → research automation services
 * - Ecommerce goal exists but < 2 ecommerce opps → research products
 * - Saas goal or high-performing saas opp → research SaaS opportunities
 *
 * Runs every 6 hours via RuntimeState key.
 */

import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/auditLog";

export const KEY_LAST_RESEARCH_RUN   = "runtime:lastAutonomousResearch";
export const RESEARCH_INTERVAL_H     = Number(process.env.RESEARCH_INTERVAL_H ?? "6");

const DISCOVERY_TOPICS: Record<string, string[]> = {
  automation_service: [
    "Automation services for logistics and dispatch companies",
    "CRM automation tools for independent service businesses",
    "Invoice and quote automation for tradespeople and contractors",
    "Email follow-up automation for sales teams and agencies",
    "Scheduling and booking automation for professional services",
  ],
  ecommerce_product: [
    "Trending niche products with high margins and low competition",
    "Digital products with zero fulfillment cost and recurring revenue",
    "Print-on-demand opportunities in underserved niches",
    "High-demand dropshipping products for European markets",
    "Subscription box opportunities in specialty markets",
  ],
  saas_product: [
    "SaaS tools missing from the small business automation market",
    "AI-powered tools for solo founders and freelancers",
    "B2B software opportunities in niche professional industries",
    "Integration tools for popular platforms with missing connections",
    "Micro-SaaS opportunities with low development cost and clear ROI",
  ],
  content_business: [
    "High-monetization content niches with low competition",
    "Newsletter opportunities in professional B2B markets",
    "Educational content gaps in emerging technology fields",
  ],
};

async function getResearchContext(): Promise<{
  recentOpportunities: number;
  automationOpps:      number;
  ecommerceOpps:       number;
  saasOpps:            number;
  hasRevenueGoal:      boolean;
  hasEcommerceGoal:    boolean;
  hasSaasGoal:         boolean;
}> {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000);

  const [recentOpps, automationOpps, ecommerceOpps, saasOpps, goals] = await Promise.all([
    prisma.opportunity.count({
      where: { createdAt: { gte: fourteenDaysAgo }, status: { not: "rejected" } },
    }),
    prisma.opportunity.count({
      where: { opportunityType: "automation_service", status: { notIn: ["rejected", "archived"] } },
    }),
    prisma.opportunity.count({
      where: { opportunityType: "ecommerce_product", status: { notIn: ["rejected", "archived"] } },
    }),
    prisma.opportunity.count({
      where: { opportunityType: "saas_product", status: { notIn: ["rejected", "archived"] } },
    }),
    prisma.goal.findMany({
      where:  { status: "active" },
      select: { title: true, goalType: true },
    }),
  ]);

  const goalText = goals.map(g => `${g.title} ${g.goalType}`).join(" ").toLowerCase();

  return {
    recentOpportunities: recentOpps,
    automationOpps,
    ecommerceOpps,
    saasOpps,
    hasRevenueGoal:   goalText.includes("revenue") || goalText.includes("mrr") || goalText.includes("business"),
    hasEcommerceGoal: goalText.includes("ecommerce") || goalText.includes("product") || goalText.includes("shop"),
    hasSaasGoal:      goalText.includes("saas") || goalText.includes("software") || goalText.includes("app"),
  };
}

function selectTopics(ctx: Awaited<ReturnType<typeof getResearchContext>>): Array<{ type: string; topic: string }> {
  const selected: Array<{ type: string; topic: string }> = [];

  // Always ensure general automation research if thin pipeline
  if (ctx.recentOpportunities < 5) {
    const idx = Math.floor(Date.now() / 86_400_000) % DISCOVERY_TOPICS.automation_service.length;
    selected.push({ type: "automation_service", topic: DISCOVERY_TOPICS.automation_service[idx] });
  }

  // Add ecommerce if goal exists or low supply
  if (ctx.hasEcommerceGoal || ctx.ecommerceOpps < 2) {
    const idx = Math.floor(Date.now() / 86_400_000) % DISCOVERY_TOPICS.ecommerce_product.length;
    selected.push({ type: "ecommerce_product", topic: DISCOVERY_TOPICS.ecommerce_product[idx] });
  }

  // Add SaaS research if goal exists or thin pipeline
  if (ctx.hasSaasGoal || ctx.saasOpps < 2) {
    const idx = Math.floor(Date.now() / 86_400_000) % DISCOVERY_TOPICS.saas_product.length;
    selected.push({ type: "saas_product", topic: DISCOVERY_TOPICS.saas_product[idx] });
  }

  // If revenue goal and low overall pipeline — add aggressive research
  if (ctx.hasRevenueGoal && ctx.recentOpportunities < 3) {
    const idx = (Math.floor(Date.now() / 86_400_000) + 1) % DISCOVERY_TOPICS.automation_service.length;
    selected.push({ type: "automation_service", topic: DISCOVERY_TOPICS.automation_service[idx] });
  }

  // Cap at 3 tasks per run to avoid overwhelming queue
  return selected.slice(0, 3);
}

export async function runAutonomousResearch(): Promise<{ tasksCreated: number }> {
  const researchTeam = await prisma.workforceTeam.findFirst({
    where:   { departmentType: "research", status: "active" },
    include: { autonomyConfig: true },
  });

  if (!researchTeam) return { tasksCreated: 0 };
  if (!researchTeam.autonomyConfig?.canSelfInitiate) return { tasksCreated: 0 };

  // Daily limit: max 3 autonomous research tasks per run
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayCount = await prisma.runtimeQueue.count({
    where: { teamId: researchTeam.id, source: "research_engine", createdAt: { gte: todayStart } },
  });
  if (todayCount >= 3) return { tasksCreated: 0 };

  const ctx    = await getResearchContext();
  const topics = selectTopics(ctx);

  if (topics.length === 0) return { tasksCreated: 0 };

  let created = 0;
  for (const { type, topic } of topics) {
    // Don't duplicate an identical title from today
    const existing = await prisma.assignment.findFirst({
      where: { title: { contains: topic.slice(0, 50) }, teamId: researchTeam.id, createdAt: { gte: todayStart } },
    });
    if (existing) continue;

    const title       = `Market Discovery: ${topic}`;
    const description = buildResearchDescription(type, topic, ctx);

    const assignment = await prisma.assignment.create({
      data: {
        title:         title.slice(0, 180),
        description,
        teamId:        researchTeam.id,
        priority:      "medium",
        status:        "pending",
      },
    });

    await prisma.runtimeQueue.create({
      data: {
        teamId:       researchTeam.id,
        assignmentId: assignment.id,
        title:        title.slice(0, 180),
        description:  description.slice(0, 500),
        priority:     "medium",
        source:       "research_engine",
        status:       "queued",
      },
    });

    await auditLog("system", assignment.id, "autonomous_research_created", {
      type,
      topic: topic.slice(0, 80),
    });

    created++;
  }

  if (created > 0) {
    console.log(`[research-engine] Created ${created} autonomous discovery task(s)`);
  }

  return { tasksCreated: created };
}

function buildResearchDescription(type: string, topic: string, ctx: {
  recentOpportunities: number;
  hasRevenueGoal: boolean;
}): string {
  const typeLabel: Record<string, string> = {
    automation_service: "Automation Service",
    ecommerce_product:  "E-Commerce Product",
    saas_product:       "SaaS Product",
    content_business:   "Content Business",
  };

  const urgency = ctx.recentOpportunities < 3
    ? "⚠️ Opportunity pipeline is thin — this discovery is critical."
    : ctx.recentOpportunities < 5
    ? "Pipeline is building — add quality opportunities."
    : "Routine discovery — expand the portfolio.";

  return [
    `## Autonomous Research Assignment`,
    `Type: ${typeLabel[type] ?? type}`,
    ``,
    `Topic: "${topic}"`,
    ``,
    urgency,
    ctx.hasRevenueGoal ? "Revenue goal is active — prioritise opportunities with clear monetisation paths." : "",
    ``,
    `## What To Research`,
    `1. Is there real demand for this? (Search volume, forums, communities, Reddit, social signals)`,
    `2. Who is the customer? (Demographics, job title, company size, pain point)`,
    `3. What is the revenue potential? (Market size, pricing benchmarks, willingness to pay)`,
    `4. Who else is doing this? (Top 3-5 competitors, pricing, differentiation)`,
    `5. What is the fastest path to first revenue? (Build, sell, validate)`,
    `6. What are the key risks? (Competition, regulation, market size, technical complexity)`,
    ``,
    `## Output Required`,
    `Produce a market discovery report that Sales and Development can immediately act on.`,
    `Include: specific niches, company names where possible, revenue estimates, and a GO/NO-GO recommendation.`,
    `Every opportunity you identify will be reviewed by the Executive team and routed to Sales, Marketing, or Development.`,
  ].filter(Boolean).join("\n");
}
