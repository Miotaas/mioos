/**
 * Autonomous Research Engine — Mio Solutions (Constitution v1).
 *
 * Research should never be idle. Every run creates up to 3 discovery tasks for
 * the Research team:
 *   - up to 2 PRIORITY tasks for the current portfolio (AION, Mail Co-Pilot,
 *     AI Website Agency), and
 *   - 1 OPEN discovery task for new AI / software / automation opportunities.
 *
 * Each task is created with real web-search results attached (when a search
 * connector is configured). The opportunity engine only accepts a NEW venture if
 * its evidence URLs were actually retrieved by that connector, so research must
 * cite those URLs. Without a search connector, open discovery cannot produce
 * admissible new opportunities — by design (fail closed).
 *
 * Never researched: generic ideation, affiliate, media/content businesses,
 * e-commerce products, capital/trading. Dormant units get no research.
 *
 * Runs every 6 hours via RuntimeState key.
 */

import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/auditLog";
import { SOLUTIONS_SCOPE_TEXT, SOLUTIONS_TYPE_LABELS } from "@/lib/solutions-scope";

export const KEY_LAST_RESEARCH_RUN   = "runtime:lastAutonomousResearch";
export const RESEARCH_INTERVAL_H     = Number(process.env.RESEARCH_INTERVAL_H ?? "6");

interface Topic {
  kind:    "priority" | "open";
  venture: "aion" | "mail-copilot" | "ai-website-agency" | "new";
  topic:   string;
  query:   string; // web-search query used to attach real sources
}

const PRIORITY_TOPICS: Topic[] = [
  { kind: "priority", venture: "ai-website-agency", topic: "Local businesses with outdated websites needing an AI Website Refresh (website / webshop / maintenance)", query: "small business website redesign demand Netherlands 2026" },
  { kind: "priority", venture: "aion",              topic: "Customer segments and go-to-market wedges for AION (AI gateway / control plane)",                        query: "companies using multiple LLM providers AI gateway cost control" },
  { kind: "priority", venture: "mail-copilot",      topic: "Ideal-customer profiles and pricing wedges for Mail Co-Pilot (email AI subscription)",                     query: "AI email assistant for business inbox pricing comparison" },
  { kind: "priority", venture: "mail-copilot",      topic: "Small businesses with high inbound email volume and manual inbox handling that fit Mail Co-Pilot",         query: "small business overwhelmed by customer emails manual inbox" },
];

// Open discovery: NEW Mio Solutions opportunities. Each must come back with
// verified sources and a monetization path or the opportunity engine rejects it.
const OPEN_TOPICS: Topic[] = [
  { kind: "open", venture: "new", topic: "Recurring, costly manual workflows in European SMBs that a software product, AI product or productized automation service could solve", query: "SMB manual process pain points survey automation 2026" },
  { kind: "open", venture: "new", topic: "Document-heavy, manual workflows in logistics, freight forwarding and transport companies that an AI product or SaaS could automate",  query: "freight forwarding manual document processing problem AI" },
  { kind: "open", venture: "new", topic: "B2B teams publicly asking for AI or automation tooling they cannot find (forums, job posts, review sites)",                          query: "\"looking for a tool\" automate workflow B2B AI forum" },
  { kind: "open", venture: "new", topic: "Underserved niches where existing B2B software is criticised in reviews and an AI-first product could win",                     query: "B2B software reviews complaints manual workaround niche" },
];

async function getResearchContext(): Promise<{
  recentOpportunities: number;
  saasOpps:            number;
  hasRevenueGoal:      boolean;
  hasSaasGoal:         boolean;
}> {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000);

  const [recentOpps, saasOpps, goals] = await Promise.all([
    prisma.opportunity.count({
      where: { createdAt: { gte: fourteenDaysAgo }, status: { notIn: ["rejected", "archived"] } },
    }),
    prisma.opportunity.count({
      where: { opportunityType: { in: ["saas_product", "ai_product", "software_venture"] }, status: { notIn: ["rejected", "archived"] } },
    }),
    prisma.goal.findMany({
      where:  { status: "active" },
      select: { title: true, goalType: true },
    }),
  ]);

  const goalText = goals.map(g => `${g.title} ${g.goalType}`).join(" ").toLowerCase();

  return {
    recentOpportunities: recentOpps,
    saasOpps,
    hasRevenueGoal: goalText.includes("revenue") || goalText.includes("mrr") || goalText.includes("business"),
    hasSaasGoal:    goalText.includes("saas") || goalText.includes("software") || goalText.includes("app"),
  };
}

function rotate<T>(list: T[], offset = 0): T {
  return list[(Math.floor(Date.now() / 86_400_000) + offset) % list.length];
}

function selectTopics(ctx: Awaited<ReturnType<typeof getResearchContext>>): Topic[] {
  const priority: Topic[] = [];

  // Priority portfolio first — up to 2 per run.
  if (ctx.recentOpportunities < 5) priority.push(rotate(PRIORITY_TOPICS));
  if (ctx.hasSaasGoal || ctx.saasOpps < 2 || (ctx.hasRevenueGoal && ctx.recentOpportunities < 3)) {
    const next = rotate(PRIORITY_TOPICS, 1);
    if (!priority.includes(next)) priority.push(next);
  }

  // Always one open-discovery slot so Mio Solutions keeps finding new opportunities.
  return [...priority.slice(0, 2), rotate(OPEN_TOPICS)];
}

async function retrieveSources(query: string): Promise<Array<{ url: string; title: string; snippet?: string }>> {
  try {
    const { executeWebSearch } = await import("@/lib/connectors/webSearch");
    const id = await executeWebSearch(query);
    const rec = await prisma.searchResearch.findUnique({ where: { id } });
    if (!rec || rec.status !== "completed" || !rec.sources) return [];
    return (JSON.parse(rec.sources) as Array<{ url: string; title: string; snippet?: string }>).slice(0, 8);
  } catch (err) {
    console.error(`[research-engine] Source retrieval failed for "${query}":`, err);
    return [];
  }
}

export async function runAutonomousResearch(): Promise<{ tasksCreated: number }> {
  const researchTeam = await prisma.workforceTeam.findFirst({
    where:   { departmentType: "research", status: "active" },
    include: { autonomyConfig: true },
  });

  if (!researchTeam) return { tasksCreated: 0 };
  if (!researchTeam.autonomyConfig?.canSelfInitiate) return { tasksCreated: 0 };

  // Daily limit: max 3 autonomous research tasks per day
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayCount = await prisma.runtimeQueue.count({
    where: { teamId: researchTeam.id, source: "research_engine", createdAt: { gte: todayStart } },
  });
  if (todayCount >= 3) return { tasksCreated: 0 };

  const ctx    = await getResearchContext();
  const topics = selectTopics(ctx).slice(0, 3 - todayCount);

  let created = 0;
  for (const t of topics) {
    // Don't duplicate an identical title from today
    const existing = await prisma.assignment.findFirst({
      where: { title: { contains: t.topic.slice(0, 50) }, teamId: researchTeam.id, createdAt: { gte: todayStart } },
    });
    if (existing) continue;

    const sources     = await retrieveSources(t.query);
    const title       = `${t.kind === "open" ? "Open Discovery" : "Market Discovery"}: ${t.topic}`;
    const description = buildResearchDescription(t, sources, ctx);

    const assignment = await prisma.assignment.create({
      data: {
        title:         title.slice(0, 180),
        description,
        teamId:        researchTeam.id,
        priority:      t.kind === "priority" ? "high" : "medium",
        status:        "pending",
      },
    });

    await prisma.runtimeQueue.create({
      data: {
        teamId:       researchTeam.id,
        assignmentId: assignment.id,
        title:        title.slice(0, 180),
        description:  description.slice(0, 500),
        priority:     t.kind === "priority" ? "high" : "medium",
        source:       "research_engine",
        status:       "queued",
      },
    });

    await auditLog("system", assignment.id, "autonomous_research_created", {
      kind: t.kind,
      venture: t.venture,
      topic: t.topic.slice(0, 80),
      sourcesAttached: sources.length,
    });

    created++;
  }

  if (created > 0) {
    console.log(`[research-engine] Created ${created} autonomous discovery task(s)`);
  }

  return { tasksCreated: created };
}

function buildResearchDescription(
  t: Topic,
  sources: Array<{ url: string; title: string; snippet?: string }>,
  ctx: { recentOpportunities: number; hasRevenueGoal: boolean },
): string {
  const urgency = ctx.recentOpportunities < 3
    ? "⚠️ Opportunity pipeline is thin — this discovery is critical."
    : ctx.recentOpportunities < 5
    ? "Pipeline is building — add quality opportunities."
    : "Routine discovery — expand the portfolio.";

  const sourceBlock = sources.length > 0
    ? [`## Retrieved Sources (real web-search results — cite these URLs exactly)`, ...sources.map((s, i) => `${i + 1}. ${s.title} — ${s.url}${s.snippet ? `\n   ${s.snippet.slice(0, 200)}` : ""}`)].join("\n")
    : `## Retrieved Sources\nNone — no web-search connector result was available. Label every claim as an assumption; a NEW opportunity cannot be admitted without retrieved sources.`;

  return [
    `## Autonomous Research Assignment — Mio Solutions`,
    t.kind === "priority"
      ? `Focus: priority portfolio — ${t.venture}`
      : `Focus: OPEN discovery — new Mio Solutions opportunities beyond the current portfolio`,
    ``,
    `Topic: "${t.topic}"`,
    ``,
    urgency,
    ctx.hasRevenueGoal ? "Revenue goal is active — prioritise opportunities with clear monetisation paths." : "",
    ``,
    SOLUTIONS_SCOPE_TEXT,
    ``,
    sourceBlock,
    ``,
    `## What To Research`,
    `1. Is there real demand? Cite the source URL for every evidence claim, copied exactly from Retrieved Sources.`,
    `2. Who is the customer? (Role, company size, industry, specific pain)`,
    `3. How is it monetized? (Who pays, for what: setup fee, subscription, usage, retainer — and why they would pay)`,
    `4. Who else solves this? (Competitors, pricing, gaps)`,
    `5. What is the fastest path to first revenue?`,
    `6. What are the key risks?`,
    ``,
    `## Classification (required for every opportunity)`,
    ...Object.values(SOLUTIONS_TYPE_LABELS).map(l => `- ${l}`),
    `For each opportunity also state which venture it serves: AION, Mail Co-Pilot, AI Website Agency, or NEW.`,
    ``,
    `## Output Required`,
    `A discovery report Sales and Development can act on: specific niches, named companies where possible, evidence with URLs, revenue estimates labelled as estimates, monetization path, and a GO/NO-GO recommendation.`,
    `Claims without a source URL are assumptions — say so.`,
  ].filter(Boolean).join("\n");
}
