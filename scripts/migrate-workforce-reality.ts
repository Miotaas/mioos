/**
 * Workforce reality migration — M1 (Founder Context) + M3 (real projects + objectives).
 * Idempotent. Run AFTER db:backfill-bu. Run with: npm run db:migrate-reality
 * Does NOT delete demo work products — that is M4 (purge), held for dry-run approval.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FOUNDER_CONTEXT = {
  founder: { name: "Mio", role: "Solo founder & operator", location: "Netherlands / EU", workingStyle: "Ships fast, automation-first; external actions are approval-gated" },
  founderPrinciple: { statement: "MioOS exists to maximize long-term equity value, not short-term activity.", prefer: ["Recurring revenue", "Software products", "Scalable systems", "Intellectual property", "Automation", "Assets that compound over time"], avoid: ["Busywork", "Low-margin service work", "One-off projects that do not contribute to a larger strategic goal"], conflictRule: "The AI Website Agency exists primarily to generate cash flow and customer relationships that accelerate AION and Mail Co-Pilot. If short-term agency revenue conflicts with long-term software value creation, prioritize long-term software value creation unless immediate cash flow is required for business survival." },
  revenueGoals: { currency: "EUR", currentMRR: 0, target90d: 1000, target12m: 10000 },
  priorityOrder: ["AION", "Mail Co-Pilot", "AI Website Agency", "Luxora / YouTube", "E-commerce", "Capital / Investing"],
  units: [
    { slug: "ai-ventures", name: "AI Ventures", focus: "Build & sell AI software/services. Primary software focus: AION, then Mail Co-Pilot. AI Website Agency funds them." },
    { slug: "content",     name: "Content / YouTube", focus: "Grow Luxora and YouTube automation channels into audience and revenue" },
    { slug: "ecommerce",   name: "E-commerce", focus: "Current and future supplier-fulfilled stores" },
    { slug: "capital",     name: "Capital / Investing", focus: "Research only: investing, crypto, public-markets research. No trading." },
  ],
  products: [
    { name: "AION",              unit: "ai-ventures", stage: null, model: "AI gateway / control plane (venture, never infrastructure)", note: "Primary software focus — priority #1." },
    { name: "Mail Co-Pilot",     unit: "ai-ventures", stage: null, model: "Email AI assistant — subscription", note: "Primary software focus — priority #2." },
    { name: "AI Website Agency", unit: "ai-ventures", stage: null, model: "Done-for-you AI websites — service/project revenue", note: "Cash-generation vehicle (priority #3): funds AION & Mail Co-Pilot development. Do NOT prioritize above AION or Mail Co-Pilot." },
    { name: "Luxora",            unit: "content",     stage: null, model: "Content brand / channel" },
  ],
  projects: ["AION go-to-market", "Mail Co-Pilot launch", "AI Website Agency pipeline", "Luxora", "YouTube channel growth", "E-commerce store", "Investing portfolio", "Crypto research", "Public markets research"],
  bottlenecks: ["No paying customers yet", "Distribution / reaching real buyers", "Founder approval bandwidth", "Execution focus split across ventures"],
  capitalPolicy: { mode: "research-only", may: ["Perform market research", "Build watchlists", "Develop investment theses", "Perform risk analysis", "Identify sectors and trends"], mustNot: ["Place trades", "Allocate capital", "Recommend buy/sell actions", "Generate trading instructions"] },
  doNotGenerate: ["Toast POS opportunities", "Restaurant scheduling SaaS", "Labor compliance SaaS", "Generic affiliate marketing opportunities", "Generic 'top 10 SaaS ideas'", "Generic market discovery exercises", "Generic automation opportunities not tied to a real venture"],
};

const PROJECTS = [
  { slug: "aion",                  name: "AION",                  description: "AI gateway / control plane — primary software focus (priority #1).", projectType: "venture",    priority: "high" },
  { slug: "mail-copilot",          name: "Mail Co-Pilot",         description: "Email AI assistant — primary software focus (priority #2).",        projectType: "venture",    priority: "high" },
  { slug: "ai-website-agency",     name: "AI Website Agency",     description: "Cash-generation vehicle (priority #3): funds AION & Mail Co-Pilot.",  projectType: "venture",    priority: "high" },
  { slug: "luxora",                name: "Luxora",                description: "Content brand / channel.",                                          projectType: "initiative", priority: "medium" },
  { slug: "youtube-channel",       name: "YouTube Channel",       description: "YouTube/automation content growth.",                                projectType: "initiative", priority: "medium" },
  { slug: "ecommerce-store",       name: "E-commerce Store",      description: "Current and future supplier-fulfilled stores.",                     projectType: "initiative", priority: "medium" },
  { slug: "investing-portfolio",   name: "Investing Portfolio",   description: "Capital — research/paper only. No trading.",                        projectType: "initiative", priority: "low" },
  { slug: "crypto-research",       name: "Crypto Research",       description: "Crypto market research and theses. Research only — no trades.",      projectType: "initiative", priority: "low" },
  { slug: "public-markets-research", name: "Public Markets Research", description: "Public/equities research and theses. Research only — no trades.", projectType: "initiative", priority: "low" },
];

const REAL_OBJECTIVES: Record<string, { title: string; description: string }> = {
  "website-revenue": {
    title: "Find weak-website local businesses and prepare website deals",
    description: "Discover local SMBs with outdated/poor websites. For each: analyze the current site (scores + pain points), outline a better demo concept, and draft outreach + follow-up. Match to AI Website Refresh (website / webshop / maintenance). All outreach requires founder approval before sending. Track: website.",
  },
  "automation-revenue": {
    title: "Find SMBs with operational problems to automate",
    description: "Discover small businesses with repetitive/manual operations. Identify a concrete automation opportunity, draft a small automation proposal plus outreach + follow-up, and match to the right automation offer. All outreach requires founder approval. Track: automation.",
  },
  research: {
    title: "Discover real opportunities for Mio's ventures",
    description: "Find concrete, revenue-bearing opportunities in priority order: (1) AION, (2) Mail Co-Pilot, (3) AI Website Agency (cash vehicle that funds AION/Mail Co-Pilot — never rank above them), (4) Luxora/YouTube, (5) E-commerce, (6) Capital. For Capital: RESEARCH ONLY — market research, watchlists, theses, risk, sectors/trends; never trades, allocation, buy/sell, or trading instructions. For each opportunity: target customer, pain, solution, revenue potential, GO/NO-GO. Never propose Toast POS, restaurant scheduling, labor compliance, generic SaaS lists, generic affiliate, or generic market-discovery ideas.",
  },
  sales: {
    title: "Build pipeline for AI Website Agency and Mail Co-Pilot",
    description: "Generate cash via the AI Website Agency (funds AION & Mail Co-Pilot) and build the Mail Co-Pilot subscription pipeline. Qualify prospects, prepare outreach. All outreach requires founder approval. Keep AION and Mail Co-Pilot as the strategic priority; the Agency is the funding engine, not the end goal.",
  },
  marketing: {
    title: "Plan launch campaigns for AI products and content",
    description: "Campaign plans for AION (priority #1) and Mail Co-Pilot (priority #2) launches; support AI Website Agency lead-gen and Luxora/YouTube growth. Campaign drafts require founder approval.",
  },
  content: {
    title: "Produce content for Luxora, YouTube and product launches",
    description: "Content plans, scripts and posts for Luxora and YouTube, and launch content for AION and Mail Co-Pilot. All content requires founder review before publishing.",
  },
  development: {
    title: "Advance AION and Mail Co-Pilot development",
    description: "AION (#1) and Mail Co-Pilot (#2) are the primary software focus. Review product work, identify blockers, prepare specs. Deployment decisions require founder approval.",
  },
  commerce: {
    title: "Find and validate e-commerce products",
    description: "Discover and validate supplier-fulfilled product opportunities for current and future stores, with clear margin and demand. Supplier commitments and paid testing require founder approval.",
  },
  operations: {
    title: "Unblock execution across the ventures",
    description: "Monitor bottlenecks, overdue tasks and blocked projects across AI Ventures, Content, E-commerce and Capital. Escalate what needs founder attention. Respect the effort priority order.",
  },
  support: {
    title: "Support intelligence for live products",
    description: "Review support issues for live products (Mail Co-Pilot, AI Website Agency), surface recurring patterns, escalate critical issues.",
  },
  executive: {
    title: "Portfolio review across all ventures",
    description: "Weekly review in priority order (AION, Mail Co-Pilot, AI Website Agency, Luxora/YouTube, E-commerce, Capital). Surface decisions that require the founder and the single best next action per unit. Capital is research-only.",
  },
};

async function main() {
  console.log("-- M1: Founder Context --");
  const value = JSON.stringify(FOUNDER_CONTEXT);
  await prisma.systemConfig.upsert({ where: { key: "founder_context" }, update: { value }, create: { key: "founder_context", value } });
  console.log("  founder_context written to SystemConfig");

  console.log("-- M3a: real projects --");
  for (const p of PROJECTS) {
    await prisma.project.upsert({
      where: { slug: p.slug },
      update: { name: p.name, description: p.description, projectType: p.projectType, priority: p.priority },
      create: { slug: p.slug, name: p.name, description: p.description, projectType: p.projectType, priority: p.priority, status: "active" },
    });
    console.log(`  project ok ${p.slug}`);
  }

  console.log("-- M3a2: revenue teams (Website + Automation) --");
  const REVENUE_TEAMS = [
    { slug: "website-revenue",    name: "Website Revenue Team",    departmentType: "sales", objective: "Find local businesses with weak websites; close website/webshop/maintenance deals." },
    { slug: "automation-revenue", name: "Automation Revenue Team", departmentType: "sales", objective: "Find SMBs with operational problems; close small automation deals." },
  ];
  for (const t of REVENUE_TEAMS) {
    await prisma.workforceTeam.upsert({
      where: { slug: t.slug },
      update: { name: t.name, departmentType: t.departmentType, objective: t.objective, status: "active" },
      create: { slug: t.slug, name: t.name, departmentType: t.departmentType, objective: t.objective, status: "active" },
    });
    console.log(`  team ok ${t.slug}`);
  }

  console.log("-- M3b: real objectives (deactivate generics) --");
  const teams = await prisma.workforceTeam.findMany({ select: { id: true, slug: true, name: true } });
  const now = new Date();
  let created = 0, updated = 0, deactivated = 0;
  for (const team of teams) {
    const real = REAL_OBJECTIVES[team.slug];
    if (!real) continue;
    const existing = await prisma.teamObjective.findFirst({ where: { teamId: team.id, title: real.title } });
    if (existing) {
      await prisma.teamObjective.update({ where: { id: existing.id }, data: { description: real.description, active: true, nextRunAt: existing.nextRunAt ?? now } });
      updated++;
    } else {
      await prisma.teamObjective.create({ data: { teamId: team.id, title: real.title, description: real.description, frequency: "daily", active: true, nextRunAt: now } });
      created++;
    }
    const d = await prisma.teamObjective.updateMany({ where: { teamId: team.id, active: true, title: { not: real.title } }, data: { active: false } });
    deactivated += d.count;
  }
  console.log(`  objectives: created ${created}, updated ${updated}, generic deactivated ${deactivated}`);
  console.log("-- done (M4 purge NOT run — held for dry-run approval) --");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
