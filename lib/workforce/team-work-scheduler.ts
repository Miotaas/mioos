/**
 * team-work-scheduler.ts
 *
 * Enqueues autonomous work for the four master-prompt business teams.
 * Safe to call on every runtime tick — idempotent within a session.
 * Only queues a new assignment when the team has fewer than 2 pending/active items.
 */

import { prisma } from "@/lib/db";
import { isAutonomyPaused } from "@/lib/autonomy";

const TEAM_DEFINITIONS = [
  {
    slug:           "ecommerce",
    name:           "E-commerce Team",
    departmentType: "commerce",
    objective:      "Find profitable products and generate revenue through sourcing, validation, and direct sales.",
    currentFocus:   "Validate affiliate programs and B2B reseller opportunities in the EU market.",
    workItems: [
      { title: "Evaluate top 5 affiliate programs with >30% recurring commission in EU market",       priority: "high" },
      { title: "Validate B2B SaaS reseller opportunity — Mail Co-Pilot EU distribution",              priority: "high" },
      { title: "Research trending AI productivity tools for affiliate partnership",                    priority: "medium" },
      { title: "Analyse pricing models for e-commerce automation bundle — Dutch SMB target",          priority: "medium" },
      { title: "Identify dropshipping product category with <€20 COGS and >€60 sell price in NL",    priority: "medium" },
    ],
  },
  {
    slug:           "automation-sales",
    name:           "Automation Sales Team",
    departmentType: "sales",
    objective:      "Acquire B2B clients by identifying operational inefficiencies and designing automation solutions.",
    currentFocus:   "Qualify Dutch SMBs with manual workflows and convert to automation service clients.",
    workItems: [
      { title: "Identify 10 Dutch SMBs with manual invoice or HR workflow bottlenecks",               priority: "urgent" },
      { title: "Design automation proposal for accounting firm — invoice-to-CRM workflow",             priority: "high" },
      { title: "Draft outreach sequence for AI automation services — 5-touch LinkedIn + email",       priority: "high" },
      { title: "Qualify top 5 inbound leads from LinkedIn campaign — BANT framework",                 priority: "urgent" },
      { title: "Research competitor pricing for B2B workflow automation in Netherlands",               priority: "medium" },
    ],
  },
  {
    slug:           "youtube",
    name:           "YouTube Automation Team",
    departmentType: "content",
    objective:      "Build and scale faceless YouTube channels to generate advertising and sponsorship revenue.",
    currentFocus:   "Research top channels and produce content for AI automation niche launch.",
    workItems: [
      { title: "Research top 20 faceless YouTube channels in AI business automation niche",           priority: "high" },
      { title: "Script 3 YouTube Shorts: How AI agents run my business autonomously",                 priority: "high" },
      { title: "Analyse monetisation strategies — RPM, sponsorship, affiliate for AI channels",       priority: "medium" },
      { title: "Draft 30-day content calendar for AI automation YouTube channel",                     priority: "medium" },
      { title: "Write script: 'I replaced my sales team with AI agents — here is what happened'",    priority: "high" },
    ],
  },
  {
    slug:           "crypto-stock",
    name:           "Crypto / Stock Trader Team",
    departmentType: "research",
    objective:      "Grow capital through systematic research, validated trade proposals, and disciplined risk-controlled execution.",
    currentFocus:   "Develop paper trading strategy with sector rotation signals for Q2 2026.",
    workItems: [
      { title: "Analyse AI/ML sector rotation signals and momentum stocks for Q2 2026",               priority: "high" },
      { title: "Research BTC support and resistance levels for paper trading entry thesis",            priority: "high" },
      { title: "Design risk-controlled paper trading ruleset: max 5% drawdown per position",          priority: "medium" },
      { title: "Evaluate DeFi yield farming risk vs reward for capital allocation — top 3 protocols", priority: "medium" },
      { title: "Build watchlist: 10 AI stocks with strong earnings momentum and low P/E vs peers",    priority: "medium" },
    ],
  },
] as const;

export interface TeamScheduleResult {
  team:            string;
  action:          "queued" | "skipped" | "upserted_and_queued";
  assignmentTitle?: string;
}

export async function enqueueTeamWork(): Promise<{ results: TeamScheduleResult[]; total: number }> {
  if (await isAutonomyPaused()) {
    return { results: [], total: 0 };
  }

  const results: TeamScheduleResult[] = [];
  let total = 0;

  for (const def of TEAM_DEFINITIONS) {
    // Ensure team exists
    let team = await prisma.workforceTeam.findFirst({ where: { slug: def.slug } });

    let wasUpserted = false;
    if (!team) {
      team = await prisma.workforceTeam.create({
        data: {
          name:           def.name,
          slug:           def.slug,
          departmentType: def.departmentType,
          objective:      def.objective,
          currentFocus:   def.currentFocus,
          status:         "active",
        },
      });
      wasUpserted = true;
    } else {
      // Refresh objective/focus if changed
      await prisma.workforceTeam.update({
        where: { id: team.id },
        data:  { objective: def.objective, currentFocus: def.currentFocus },
      });
    }

    // Check active work queue
    const activeCount = await prisma.assignment.count({
      where: { teamId: team.id, status: { in: ["pending", "active", "review"] } },
    });

    if (activeCount >= 2) {
      results.push({ team: def.name, action: "skipped" });
      continue;
    }

    // Find next work item not yet assigned
    const existingTitles = await prisma.assignment.findMany({
      where:  { teamId: team.id },
      select: { title: true },
    });
    const existingSet = new Set(existingTitles.map(a => a.title));
    const nextItem = def.workItems.find(w => !existingSet.has(w.title));

    if (!nextItem) {
      results.push({ team: def.name, action: "skipped" });
      continue;
    }

    await prisma.assignment.create({
      data: {
        title:    nextItem.title,
        teamId:   team.id,
        status:   "pending",
        priority: nextItem.priority,
      },
    });

    results.push({
      team:            def.name,
      action:          wasUpserted ? "upserted_and_queued" : "queued",
      assignmentTitle: nextItem.title,
    });
    total++;
  }

  return { results, total };
}
