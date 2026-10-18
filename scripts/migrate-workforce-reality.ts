/**
 * Workforce reality migration — M1 (Founder Context) + M3 (real projects + objectives).
 * Idempotent. Run AFTER db:backfill-bu. Run with: npm run db:migrate-reality
 * Does NOT delete demo work products — that is M4 (purge), held for dry-run approval.
 *
 * Constitution v1 (docs/MIOOS_CONSTITUTION.md): only Mio Solutions is operational.
 * This script creates/activates work ONLY for Mio Solutions (priority portfolio:
 * AION, Mail Co-Pilot, AI Website Agency; new evidence-backed Solutions
 * opportunities are allowed — see lib/solutions-scope.ts). For dormant units (Mio Media, Mio Commerce, Mio Capital Lab)
 * it creates nothing, pauses their teams and projects, deactivates their objectives
 * and cancels/archives their unfinished work. The legacy team automation-sales is
 * paused too. Runs in one transaction and fails (rolling back) unless exactly the 10
 * Mio Solutions objectives remain active. It never deletes records.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Aligned with docs/MIOOS_CONSTITUTION.md v1 — keep identical to founder-context.example.json.
const FOUNDER_CONTEXT = {
  "founder": {
    "name": "Mio",
    "role": "Solo founder & operator",
    "location": "Netherlands / EU",
    "workingStyle": "Ships fast, automation-first; external actions are approval-gated; financial actions are locked"
  },
  "founderPrinciple": {
    "statement": "MioOS exists to maximize long-term equity value, not short-term activity. docs/MIOOS_CONSTITUTION.md is binding and outranks this context.",
    "prefer": [
      "Recurring revenue",
      "Software products",
      "Scalable systems",
      "Intellectual property",
      "Automation",
      "Assets that compound over time"
    ],
    "avoid": [
      "Busywork",
      "Low-margin service work",
      "One-off projects that do not contribute to a larger strategic goal",
      "Any work for a dormant Business Unit"
    ],
    "conflictRule": "Only Mio Solutions is operational. Inside Mio Solutions, prioritize AION and Mail Co-Pilot; the AI Website Agency exists primarily to generate cash flow and customer relationships that accelerate them. New Mio Solutions opportunities may be pursued when evidence and monetization are real, but never at the expense of the priority portfolio without founder approval. If short-term agency revenue conflicts with long-term software value creation, prioritize long-term software value creation unless immediate cash flow is required for business survival."
  },
  "revenueGoals": {
    "currency": "EUR",
    "currentMRR": 0,
    "target90d": 1000,
    "target12m": 10000,
    "note": "Only collected cash counts as revenue. Estimates and forecasts stay on opportunities and are never revenue."
  },
  "priorityOrder": [
    "Mio Solutions — AION",
    "Mio Solutions — Mail Co-Pilot",
    "Mio Solutions — AI Website Agency",
    "Mio Solutions — new AI / software / automation opportunities with verified external evidence and a credible monetization path"
  ],
  "units": [
    {
      "slug": "mio-solutions",
      "name": "Mio Solutions",
      "focus": "STATUS: OPERATIONAL — the only unit you may work on. Identify business problems and sell AI, software and automation solutions. Current PRIORITY portfolio: AION, then Mail Co-Pilot; the AI Website Agency funds them. The portfolio is a priority, not a boundary: new opportunities are allowed when backed by verified external evidence (source URLs) and a credible monetization path, classified as software venture, SaaS product, AI product, automation service, productized service, or internal tool with commercialization potential."
    },
    {
      "slug": "mio-media",
      "name": "Mio Media",
      "focus": "STATUS: DORMANT — zero autonomous runtime, zero budget. Do not research, plan, draft or propose anything for this unit."
    },
    {
      "slug": "mio-commerce",
      "name": "Mio Commerce",
      "focus": "STATUS: DORMANT — zero autonomous runtime, zero budget. Do not research, plan, draft or propose anything for this unit."
    },
    {
      "slug": "mio-capital",
      "name": "Mio Capital Lab",
      "focus": "STATUS: DORMANT — zero autonomous runtime, zero budget. Do not research, plan, draft or propose anything for this unit. When activated by the founder: research, backtesting and paper trading only; real-money trading is prohibited."
    }
  ],
  "products": [
    {
      "name": "AION",
      "unit": "mio-solutions",
      "stage": null,
      "model": "AI gateway / control plane (venture, never infrastructure)",
      "note": "Primary software focus — priority #1."
    },
    {
      "name": "Mail Co-Pilot",
      "unit": "mio-solutions",
      "stage": null,
      "model": "Email AI assistant — subscription",
      "note": "Primary software focus — priority #2."
    },
    {
      "name": "AI Website Agency",
      "unit": "mio-solutions",
      "stage": null,
      "model": "Done-for-you AI websites — service/project revenue",
      "note": "Cash-generation vehicle (priority #3): funds AION & Mail Co-Pilot development. Do NOT prioritize above AION or Mail Co-Pilot."
    }
  ],
  "projects": [
    "AION go-to-market",
    "Mail Co-Pilot launch",
    "AI Website Agency pipeline"
  ],
  "bottlenecks": [
    "No paying customers yet",
    "Distribution / reaching real buyers",
    "Founder approval bandwidth",
    "Governance foundations (Constitution section 19) not yet complete"
  ],
  "capitalPolicy": {
    "mode": "dormant",
    "may": [],
    "mustNot": [
      "Do any work for Mio Capital Lab while it is dormant",
      "Place trades",
      "Allocate capital",
      "Recommend buy/sell actions",
      "Generate trading instructions"
    ]
  },
  "doNotGenerate": [
    "Any opportunity, research, draft or recommendation for Mio Media, Mio Commerce or Mio Capital Lab (dormant units)",
    "YouTube, Luxora, content-channel, e-commerce, dropshipping, supplier, product-store, investing, crypto or trading ideas",
    "Revenue claims or demand claims without external evidence — label estimates as estimates",
    "Toast POS opportunities",
    "Restaurant scheduling SaaS",
    "Labor compliance SaaS",
    "Generic affiliate marketing opportunities",
    "Generic ideation, idea lists, affiliate ideas, media/content businesses, e-commerce products, capital/investing/trading opportunities",
    "Generic 'top 10 SaaS ideas'",
    "Generic market discovery exercises",
    "Generic automation or AI ideas without verified external evidence (source URLs) and a credible monetization path"
  ]
};

// Mio Solutions ventures — the only projects this script creates or keeps active.
const PROJECTS = [
  { slug: "aion",              name: "AION",              description: "AI gateway / control plane — primary software focus (priority #1).", projectType: "venture", priority: "high" },
  { slug: "mail-copilot",      name: "Mail Co-Pilot",     description: "Email AI assistant — primary software focus (priority #2).",        projectType: "venture", priority: "high" },
  { slug: "ai-website-agency", name: "AI Website Agency", description: "Cash-generation vehicle (priority #3): funds AION & Mail Co-Pilot.",  projectType: "venture", priority: "high" },
];

// Projects of dormant units. Never created here. If they already exist they stay
// visible as historical records, but an "active" one is set to "paused" so it is
// not treated as active work.
const DORMANT_PROJECT_SLUGS = [
  "luxora", "youtube-channel",                                          // Mio Media
  "ecommerce-store",                                                    // Mio Commerce
  "investing-portfolio", "crypto-research", "public-markets-research",  // Mio Capital Lab
];

// Teams that are paused by this migration (Constitution v1):
//   - teams of dormant units (Mio Media, Mio Commerce, Mio Capital Lab)
//   - legacy team automation-sales (overlaps website-revenue / automation-revenue)
// Paused teams get no objectives; their active objectives are deactivated and their
// unfinished work is cancelled/archived (never deleted).
const PAUSED_TEAM_SLUGS = [
  "youtube",                // Mio Media
  "commerce", "ecommerce",  // Mio Commerce
  "crypto-stock",           // Mio Capital Lab
  "automation-sales",       // legacy Mio Solutions duplicate
];

const CANCEL_NOTE = "Cancelled by migrate-workforce-reality: team paused under MioOS Constitution v1 (dormant unit or legacy team).";

const SCOPE = "Scope: Mio Solutions. Priority portfolio first: AION, Mail Co-Pilot, AI Website Agency. New AI, software or automation opportunities only with verified external evidence (source URLs) and a credible monetization path. Never generic ideation, affiliate, media/content businesses, e-commerce products or capital/trading. Do no work for Mio Media, Mio Commerce or Mio Capital Lab (dormant units).";

// Objectives per capability team. Every objective serves Mio Solutions only.
const REAL_OBJECTIVES: Record<string, { title: string; description: string }> = {
  "website-revenue": {
    title: "Find weak-website local businesses and prepare website deals",
    description: `Discover local SMBs with outdated/poor websites. For each: analyze the current site (scores + pain points), outline a better demo concept, and draft outreach + follow-up. Match to AI Website Refresh (website / webshop / maintenance). All outreach requires founder approval before sending. Track: website. ${SCOPE}`,
  },
  "automation-revenue": {
    title: "Find SMBs with operational problems to automate",
    description: `Discover small businesses with repetitive/manual operations. Identify a concrete automation opportunity, draft a small automation proposal plus outreach + follow-up, and match to the right automation offer. All outreach requires founder approval. Track: automation. ${SCOPE}`,
  },
  research: {
    title: "Discover real opportunities for Mio Solutions",
    description: `Find concrete, revenue-bearing Mio Solutions opportunities. Priority portfolio first, in order: (1) AION, (2) Mail Co-Pilot, (3) AI Website Agency (cash vehicle that funds AION/Mail Co-Pilot — never rank above them). Also look for NEW AI, software and automation opportunities, classified as software venture, SaaS product, AI product, automation service, productized service, or internal tool with commercialization potential — admitted only with external evidence (source URLs) and a credible monetization path. For each opportunity: venture (or NEW), type, target customer, pain, solution, evidence with URLs, monetization path, revenue estimate labelled as an estimate, GO/NO-GO. Never propose generic ideation, affiliate, media/content businesses, e-commerce products, capital/trading, Toast POS, restaurant scheduling or labor compliance ideas. ${SCOPE}`,
  },
  sales: {
    title: "Build pipeline for AI Website Agency and Mail Co-Pilot",
    description: `Generate cash via the AI Website Agency (funds AION & Mail Co-Pilot) and build the Mail Co-Pilot subscription pipeline. Qualify prospects, prepare outreach. All outreach requires founder approval. Keep AION and Mail Co-Pilot as the strategic priority; the Agency is the funding engine, not the end goal. ${SCOPE}`,
  },
  marketing: {
    title: "Plan launch campaigns for AION, Mail Co-Pilot and AI Website Agency",
    description: `Campaign plans for AION (priority #1) and Mail Co-Pilot (priority #2) launches, and lead generation for the AI Website Agency. Campaign drafts require founder approval. ${SCOPE}`,
  },
  content: {
    title: "Produce sales and launch content for AION, Mail Co-Pilot and AI Website Agency",
    description: `Content that supports selling Mio Solutions: launch posts, landing-page copy, case-style explainers and outreach assets for AION, Mail Co-Pilot and the AI Website Agency. No channel-building, YouTube or brand-media work. All content requires founder review before publishing. ${SCOPE}`,
  },
  development: {
    title: "Advance AION and Mail Co-Pilot development",
    description: `AION (#1) and Mail Co-Pilot (#2) are the primary software focus. Review product work, identify blockers, prepare specs. Deployment decisions require founder approval. ${SCOPE}`,
  },
  operations: {
    title: "Unblock execution for AION, Mail Co-Pilot and AI Website Agency",
    description: `Monitor bottlenecks, overdue tasks and blocked projects for AION, Mail Co-Pilot and the AI Website Agency. Escalate what needs founder attention. Respect the effort priority order. ${SCOPE}`,
  },
  support: {
    title: "Support intelligence for live products",
    description: `Review support issues for live products (Mail Co-Pilot, AI Website Agency), surface recurring patterns, escalate critical issues. ${SCOPE}`,
  },
  executive: {
    title: "Review Mio Solutions: AION, Mail Co-Pilot and AI Website Agency",
    description: `Weekly review in priority order (AION, Mail Co-Pilot, AI Website Agency), then any new evidence-backed Mio Solutions opportunities. Surface decisions that require the founder and the single best next action per venture. ${SCOPE}`,
  },
};

// The only teams allowed to hold an active objective after this migration.
const EXPECTED_ACTIVE_TEAMS = Object.keys(REAL_OBJECTIVES).sort();

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function migrate(tx: Tx) {
  console.log("-- M1: Founder Context --");
  const value = JSON.stringify(FOUNDER_CONTEXT);
  await tx.systemConfig.upsert({ where: { key: "founder_context" }, update: { value }, create: { key: "founder_context", value } });
  console.log("  founder_context written to SystemConfig");

  console.log("-- M3a: Mio Solutions projects --");
  for (const p of PROJECTS) {
    await tx.project.upsert({
      where: { slug: p.slug },
      update: { name: p.name, description: p.description, projectType: p.projectType, priority: p.priority },
      create: { slug: p.slug, name: p.name, description: p.description, projectType: p.projectType, priority: p.priority, status: "active" },
    });
    console.log(`  project ok ${p.slug}`);
  }

  console.log("-- M3a1: dormant-unit projects (never created; active ones paused) --");
  const pausedProjects = await tx.project.updateMany({
    where: { slug: { in: DORMANT_PROJECT_SLUGS }, status: "active" },
    data:  { status: "paused" },
  });
  console.log(`  dormant projects paused: ${pausedProjects.count}`);

  console.log("-- M3a2: revenue teams (Website + Automation) --");
  const REVENUE_TEAMS = [
    { slug: "website-revenue",    name: "Website Revenue Team",    departmentType: "sales", objective: "Find local businesses with weak websites; close website/webshop/maintenance deals." },
    { slug: "automation-revenue", name: "Automation Revenue Team", departmentType: "sales", objective: "Find SMBs with operational problems; close small automation deals." },
  ];
  for (const t of REVENUE_TEAMS) {
    await tx.workforceTeam.upsert({
      where: { slug: t.slug },
      update: { name: t.name, departmentType: t.departmentType, objective: t.objective, status: "active" },
      create: { slug: t.slug, name: t.name, departmentType: t.departmentType, objective: t.objective, status: "active" },
    });
    console.log(`  team ok ${t.slug}`);
  }

  console.log("-- M3a3: pause dormant-unit and legacy teams --");
  // A paused team is skipped by the worker's startup objective bootstrap, by
  // objective evaluation, by handoff acceptance and by pipeline team selection.
  const toPause = await tx.workforceTeam.findMany({ where: { slug: { in: PAUSED_TEAM_SLUGS } }, select: { id: true, slug: true, status: true } });
  const pausedTeamIds = toPause.map(t => t.id);
  const pausedTeams = await tx.workforceTeam.updateMany({ where: { id: { in: pausedTeamIds }, status: { not: "paused" } }, data: { status: "paused" } });
  console.log(`  teams found: ${toPause.map(t => `${t.slug} (was ${t.status})`).join(", ") || "none"}`);
  console.log(`  teams newly paused: ${pausedTeams.count}`);

  console.log("-- M3a4: cancel/archive unfinished work of paused teams (no deletes) --");
  const now = new Date();
  const queue = await tx.runtimeQueue.updateMany({
    where: { teamId: { in: pausedTeamIds }, status: { in: ["queued", "running"] } },
    data:  { status: "cancelled", lockedAt: null, error: CANCEL_NOTE },
  });
  const openAssignments = await tx.assignment.findMany({
    where:  { teamId: { in: pausedTeamIds }, status: { in: ["pending", "active", "review"] } },
    select: { id: true, status: true },
  });
  for (const a of openAssignments) {
    await tx.assignmentMessage.create({ data: { assignmentId: a.id, senderType: "system", content: `${CANCEL_NOTE} Previous status: ${a.status}.` } });
  }
  const assignments = await tx.assignment.updateMany({
    where: { id: { in: openAssignments.map(a => a.id) } },
    data:  { status: "archived" },
  });
  // Handoffs targeting a paused team, and handoffs from a paused team (so dormant
  // work cannot flow into active teams). "rejected" is the existing terminal status.
  const handoffs = await tx.teamHandoff.updateMany({
    where: {
      status: { in: ["pending", "in_progress"] },
      OR: [{ toTeamId: { in: pausedTeamIds } }, { fromTeamId: { in: pausedTeamIds } }],
    },
    data: { status: "rejected", notes: CANCEL_NOTE },
  });
  await tx.systemExecutionLog.create({
    data: {
      sourceType: "system",
      sourceId:   "migrate-workforce-reality",
      event:      "dormant_unit_containment",
      details:    JSON.stringify({ pausedTeams: toPause.map(t => t.slug), queueCancelled: queue.count, assignmentsArchived: assignments.count, handoffsRejected: handoffs.count, at: now.toISOString() }),
    },
  });
  console.log(`  runtime queue items cancelled: ${queue.count}`);
  console.log(`  assignments archived: ${assignments.count}`);
  console.log(`  handoffs rejected: ${handoffs.count}`);

  console.log("-- M3b: Mio Solutions objectives (deactivate everything else) --");
  const teams = await tx.workforceTeam.findMany({ select: { id: true, slug: true } });
  let created = 0, updated = 0, deactivated = 0;
  for (const team of teams) {
    const real = REAL_OBJECTIVES[team.slug];
    if (!real) {
      // Any team outside the Mio Solutions list holds no active objective.
      const d = await tx.teamObjective.updateMany({ where: { teamId: team.id, active: true }, data: { active: false } });
      deactivated += d.count;
      continue;
    }
    const existing = await tx.teamObjective.findFirst({ where: { teamId: team.id, title: real.title } });
    if (existing) {
      await tx.teamObjective.update({ where: { id: existing.id }, data: { description: real.description, active: true, nextRunAt: existing.nextRunAt ?? now } });
      updated++;
    } else {
      await tx.teamObjective.create({ data: { teamId: team.id, title: real.title, description: real.description, frequency: "daily", active: true, nextRunAt: now } });
      created++;
    }
    const d = await tx.teamObjective.updateMany({ where: { teamId: team.id, active: true, title: { not: real.title } }, data: { active: false } });
    deactivated += d.count;
  }
  console.log(`  objectives: created ${created}, updated ${updated}, deactivated ${deactivated}`);

  console.log("-- M3c: verify invariants (fails and rolls back on violation) --");
  const errors: string[] = [];

  const active = await tx.teamObjective.findMany({ where: { active: true }, select: { team: { select: { slug: true } } } });
  const activeSlugs = active.map(o => o.team.slug).sort();
  if (active.length !== EXPECTED_ACTIVE_TEAMS.length) {
    errors.push(`expected exactly ${EXPECTED_ACTIVE_TEAMS.length} active objectives, found ${active.length}`);
  }
  const unexpected = activeSlugs.filter(s => !EXPECTED_ACTIVE_TEAMS.includes(s));
  if (unexpected.length) errors.push(`active objectives on teams outside Mio Solutions: ${unexpected.join(", ")}`);
  const missing = EXPECTED_ACTIVE_TEAMS.filter(s => !activeSlugs.includes(s));
  if (missing.length) errors.push(`Mio Solutions teams missing (team row absent or no active objective): ${missing.join(", ")}`);
  const dupes = activeSlugs.filter((s, i) => activeSlugs.indexOf(s) !== i);
  if (dupes.length) errors.push(`teams with more than one active objective: ${[...new Set(dupes)].join(", ")}`);

  // Any other active team would receive a default objective from the worker at startup.
  const strayActiveTeams = await tx.workforceTeam.findMany({
    where:  { status: "active", slug: { notIn: EXPECTED_ACTIVE_TEAMS } },
    select: { slug: true },
  });
  if (strayActiveTeams.length) errors.push(`active teams outside Mio Solutions (would get a default objective from the worker): ${strayActiveTeams.map(t => t.slug).join(", ")}`);

  const stillActivePaused = await tx.workforceTeam.count({ where: { slug: { in: PAUSED_TEAM_SLUGS }, status: { not: "paused" } } });
  if (stillActivePaused) errors.push(`${stillActivePaused} team(s) from the paused list are not paused`);
  const openWork = await tx.runtimeQueue.count({ where: { teamId: { in: pausedTeamIds }, status: { in: ["queued", "running"] } } })
    + await tx.assignment.count({ where: { teamId: { in: pausedTeamIds }, status: { in: ["pending", "active", "review"] } } })
    + await tx.teamHandoff.count({ where: { status: { in: ["pending", "in_progress"] }, OR: [{ toTeamId: { in: pausedTeamIds } }, { fromTeamId: { in: pausedTeamIds } }] } });
  if (openWork) errors.push(`${openWork} unfinished work item(s) still open for paused teams`);
  const activeDormantProjects = await tx.project.count({ where: { slug: { in: DORMANT_PROJECT_SLUGS }, status: "active" } });
  if (activeDormantProjects) errors.push(`${activeDormantProjects} dormant project(s) still active`);

  if (errors.length) {
    throw new Error(`Migration invariants violated — all changes rolled back:\n  - ${errors.join("\n  - ")}`);
  }
  console.log(`  OK: ${active.length} active objectives on: ${activeSlugs.join(", ")}`);
}

async function main() {
  // One transaction: if any invariant fails, nothing is written.
  await prisma.$transaction(migrate, { timeout: 120_000, maxWait: 10_000 });
  console.log("-- done (M4 purge NOT run — held for dry-run approval) --");
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
