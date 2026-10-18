import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/auditLog";
import { createOpportunityFromCondition } from "@/lib/opportunity-engine";
import { SOLUTIONS_SCOPE_TEXT } from "@/lib/solutions-scope";

interface ConditionResult {
  condition: string;
  action: string;
  assignmentsCreated: number;
}

async function getResearchTeam() {
  return prisma.workforceTeam.findFirst({
    where: { departmentType: "research", status: "active" },
    include: { autonomyConfig: true },
  });
}

async function dailyLimitOk(teamId: string, source: string, limit: number): Promise<boolean> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const count = await prisma.runtimeQueue.count({
    where: { teamId, source, createdAt: { gte: startOfDay } },
  });
  return count < limit;
}

async function createResearchAssignment(params: {
  teamId: string;
  title: string;
  description: string;
  goalId?: string | null;
}): Promise<string> {
  const assignment = await prisma.assignment.create({
    data: {
      title:       params.title.slice(0, 180),
      description: params.description,
      teamId:      params.teamId,
      priority:    "high",
      status:      "pending",
      goalId:      params.goalId ?? null,
    },
  });

  await prisma.runtimeQueue.create({
    data: {
      teamId:       params.teamId,
      assignmentId: assignment.id,
      title:        params.title.slice(0, 180),
      description:  params.description.slice(0, 500),
      priority:     "high",
      source:       "condition",
      status:       "queued",
    },
  });

  return assignment.id;
}

// Condition: Revenue goal exists but pipeline is thin → discover Mio Solutions opportunities
async function checkRevenueGapCondition(researchTeamId: string): Promise<ConditionResult | null> {
  const revenueGoals = await prisma.goal.findMany({
    where: { status: "active", goalType: "business", target: { gt: 0 } },
    take: 3,
  });
  if (revenueGoals.length === 0) return null;

  const pipelineCount = await prisma.revenueEntry.count({
    where: { status: "active", revenueType: { in: ["pipeline", "potential"] } },
  });
  if (pipelineCount >= 5) return null;

  const goal = revenueGoals[0];
  const target = goal.target ?? 5000;

  const title = `Discover Mio Solutions opportunities to close revenue gap`;
  const description = [
    `Revenue goal "${goal.title}" (target: €${target}) detected with only ${pipelineCount} active pipeline entries.`,
    ``,
    SOLUTIONS_SCOPE_TEXT,
    ``,
    `Your mission: Find 3-5 concrete opportunities. Start with the priority portfolio:`,
    `- Mail Co-Pilot: businesses with high inbound email volume and manual inbox handling`,
    `- AI Website Agency: local businesses with outdated websites (website / webshop / maintenance)`,
    `- AION: teams with several AI providers that need a gateway / control plane`,
    `Then add NEW AI, software or automation opportunities only where you have external evidence with source URLs.`,
    ``,
    `For each opportunity, provide:`,
    `- Venture: AION, Mail Co-Pilot, AI Website Agency, or NEW`,
    `- Type: software venture, SaaS product, AI product, automation service, productized service, or internal tool with commercialization potential`,
    `- Target customer and specific pain point`,
    `- External evidence with source URLs (label anything without a source as an assumption)`,
    `- Monetization path: who pays, for what, and why`,
    `- Estimated revenue per client (monthly), labelled as an estimate`,
    ``,
    `Focus on opportunities that can generate €${Math.round(target / 5)}-€${Math.round(target / 2)}/month per client.`,
  ].join("\n");

  const ok = await dailyLimitOk(researchTeamId, "condition", 2);
  if (!ok) return null;

  await createResearchAssignment({ teamId: researchTeamId, title, description, goalId: goal.id });

  await auditLog("system", "revenue_gap_condition", "autonomous_research_triggered", {
    goalId:        goal.id,
    goalTitle:     goal.title,
    pipelineCount,
  });

  return {
    condition:          "Revenue gap detected",
    action:             `Research assignment created for automation service opportunities`,
    assignmentsCreated: 1,
  };
}

// (E-commerce product discovery condition removed — Mio Commerce is dormant under Constitution v1.)

// Condition: Project stalled > 7 days → Executive team review
async function checkStalledProjectCondition(): Promise<ConditionResult | null> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const stalledProjects = await prisma.project.findMany({
    where: {
      status: "active",
      updatedAt: { lt: sevenDaysAgo },
    },
    take: 2,
  });
  if (stalledProjects.length === 0) return null;

  const execTeam = await prisma.workforceTeam.findFirst({
    where: { departmentType: "executive", status: "active" },
    include: { autonomyConfig: true },
  });
  if (!execTeam?.autonomyConfig?.canSelfInitiate) return null;

  const ok = await dailyLimitOk(execTeam.id, "condition", 1);
  if (!ok) return null;

  const names = stalledProjects.map(p => p.name).join(", ");
  const title = `Review stalled projects: ${names}`;
  const description = [
    `${stalledProjects.length} project(s) have not been updated in over 7 days: ${names}.`,
    ``,
    `Your task:`,
    `1. Assess why each project has stalled`,
    `2. Identify the blocker or reason for inactivity`,
    `3. Propose a concrete next action to unstall each project`,
    `4. Flag if founder attention or a decision is needed`,
    `5. Recommend whether to continue, pivot, or archive each project`,
  ].join("\n");

  await createResearchAssignment({ teamId: execTeam.id, title, description });

  return {
    condition:          `${stalledProjects.length} project(s) stalled > 7 days`,
    action:             `Executive review assignment created`,
    assignmentsCreated: 1,
  };
}

// Condition: Active automation opportunities with no pipeline revenue → trigger Sales
async function checkPipelineGapCondition(): Promise<ConditionResult | null> {
  const opportunities = await prisma.opportunity.findMany({
    where: {
      opportunityType: "automation_service",
      status: { in: ["researching", "validating"] },
    },
    take: 3,
  });
  if (opportunities.length === 0) return null;

  const pipelineRevenue = await prisma.revenueEntry.aggregate({
    _sum: { amount: true },
    where: { status: "active", revenueType: "pipeline" },
  });
  if ((pipelineRevenue._sum.amount ?? 0) > 0) return null;

  const salesTeam = await prisma.workforceTeam.findFirst({
    where: { departmentType: "sales", status: "active" },
    include: { autonomyConfig: true },
  });
  if (!salesTeam?.autonomyConfig?.canSelfInitiate) return null;

  const ok = await dailyLimitOk(salesTeam.id, "condition", 1);
  if (!ok) return null;

  const oppTitles = opportunities.map(o => o.title).join("; ");
  const title = `Convert automation opportunities to pipeline entries`;
  const description = [
    `${opportunities.length} automation service opportunities exist but the pipeline has €0 in active deals.`,
    `Opportunities: ${oppTitles}`,
    ``,
    `Your task:`,
    `1. Review these opportunities and identify which is closest to revenue`,
    `2. Define who the ideal buyer is for each`,
    `3. Create a concrete outreach strategy (company names, contacts, message angle)`,
    `4. Estimate probability and deal size for each opportunity`,
    `5. Recommend which opportunity to prioritize and why`,
    ``,
    `All outreach requires founder approval before sending.`,
  ].join("\n");

  await createResearchAssignment({ teamId: salesTeam.id, title, description });

  return {
    condition:          "Active opportunities but €0 pipeline",
    action:             "Sales assignment created to convert opportunities to pipeline",
    assignmentsCreated: 1,
  };
}

export async function checkAutonomousConditions(): Promise<{ assignmentsCreated: number; results: ConditionResult[] }> {
  const researchTeam = await getResearchTeam();
  if (!researchTeam?.autonomyConfig?.canSelfInitiate) {
    return { assignmentsCreated: 0, results: [] };
  }

  const results: ConditionResult[] = [];

  const checks = await Promise.allSettled([
    checkRevenueGapCondition(researchTeam.id),
    checkStalledProjectCondition(),
    checkPipelineGapCondition(),
  ]);

  for (const check of checks) {
    if (check.status === "fulfilled" && check.value) {
      results.push(check.value);
    } else if (check.status === "rejected") {
      console.error("[conditions] Condition check failed:", check.reason);
    }
  }

  const assignmentsCreated = results.reduce((sum, r) => sum + r.assignmentsCreated, 0);
  return { assignmentsCreated, results };
}
