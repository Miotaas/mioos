import { prisma } from "@/lib/db";

// ── Shared types ──────────────────────────────────────────────────────────────

export interface ProjectHealth {
  status: "excellent" | "good" | "warning" | "critical";
  score: number;
  reasons: string[];
}

export interface GoalIntelligence {
  id: string;
  title: string;
  progress: number;
  goalType: string;
  stalled: boolean;
  daysToDeadline: number | null;
  milestonesDone: number;
  milestonesTotal: number;
  suggestedActions: string[];
}

export interface RevenueAtRisk {
  id: string;
  title: string;
  amount: number;
  reason: string;
}

export interface RevenueIntelligence {
  live: number;
  pipeline: number;
  potential: number;
  total: number;
  forecast30d: number;
  atRisk: RevenueAtRisk[];
  fastestPath: {
    id: string;
    title: string;
    amount: number;
    probability: number;
    action: string;
  } | null;
  byType: { service: number; product: number };
  byProject: { projectId: string; projectName: string; amount: number }[];
}

export interface TeamPerformance {
  teamId: string;
  teamName: string;
  departmentType: string;
  completedThisWeek: number;
  completedThisMonth: number;
  outputsThisWeek: number;
  pendingApprovals: number;
  handoffsCreated: number;
}

export interface WorkforcePerformance {
  totalActiveAssignments: number;
  completedThisWeek: number;
  outputsThisWeek: number;
  pendingApprovals: number;
  teams: TeamPerformance[];
}

export interface Recommendation {
  id: string;
  title: string;
  reason: string;
  priority: "critical" | "high" | "medium" | "low";
  source: "revenue" | "goal" | "project" | "workforce" | "approval";
  action: string;
  viewTarget?: string;
}

// ── Goal Intelligence ─────────────────────────────────────────────────────────

const GOAL_SUGGESTION_TEMPLATES: Record<string, string[]> = {
  business: [
    "Create a Research Team assignment to map the competitive landscape",
    "Send a founder request: generate an execution plan for this goal",
    "Assign a Sales Team outreach strategy linked to this goal",
  ],
  personal: [
    "Break this goal into weekly milestones",
    "Send a founder request: help me make progress on this goal",
    "Set a concrete deadline and assign a team to support it",
  ],
};

function getGoalSuggestions(
  title: string,
  goalType: string,
  progress: number,
  stalled: boolean,
): string[] {
  const base = GOAL_SUGGESTION_TEMPLATES[goalType] ?? GOAL_SUGGESTION_TEMPLATES.personal;
  if (stalled) {
    return [`Re-activate: send a founder request for "${title}"`, base[0]];
  }
  if (progress < 30) {
    return [base[0], `Send a request: "Help me advance goal: ${title}"`];
  }
  return [base[1] ?? base[0]];
}

export async function getGoalIntelligence(): Promise<GoalIntelligence[]> {
  const goals = await prisma.goal.findMany({
    where: { status: "active" },
    orderBy: { progress: "asc" },
    include: { milestones: true },
  });

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const now = new Date();

  return goals.map(goal => {
    const milestonesDone = goal.milestones.filter(m => m.completed).length;
    const milestonesTotal = goal.milestones.length;
    const recentlyUpdated = goal.updatedAt > fourteenDaysAgo;
    const stalled = goal.progress <= 20 && !recentlyUpdated;
    const daysToDeadline = goal.targetDate
      ? Math.ceil((goal.targetDate.getTime() - now.getTime()) / 86400000)
      : null;

    return {
      id: goal.id,
      title: goal.title,
      progress: goal.progress,
      goalType: goal.goalType ?? "personal",
      stalled,
      daysToDeadline,
      milestonesDone,
      milestonesTotal,
      suggestedActions: getGoalSuggestions(goal.title, goal.goalType ?? "personal", goal.progress, stalled),
    };
  });
}

// ── Revenue Intelligence ──────────────────────────────────────────────────────

export async function getRevenueIntelligence(): Promise<RevenueIntelligence> {
  const [entries, projects] = await Promise.all([
    prisma.revenueEntry.findMany({ where: { status: "active" } }),
    prisma.project.findMany({ select: { id: true, name: true } }),
  ]);

  const projectMap = new Map(projects.map(p => [p.id, p.name]));
  const now = new Date();
  const fourteenDaysOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const liveEntries = entries.filter(e => e.revenueType === "live");
  const pipelineEntries = entries.filter(e => e.revenueType === "pipeline");
  const potentialEntries = entries.filter(e => e.revenueType === "potential");

  const live = liveEntries.reduce((s, e) => s + e.amount, 0);
  const pipeline = pipelineEntries.reduce((s, e) => s + e.amount * ((e.probability ?? 80) / 100), 0);
  const potential = potentialEntries.reduce((s, e) => s + e.amount * ((e.probability ?? 40) / 100), 0);

  const atRisk: RevenueAtRisk[] = [];
  for (const e of pipelineEntries) {
    if (e.expectedCloseDate && e.expectedCloseDate < fourteenDaysOut && e.expectedCloseDate > now) {
      atRisk.push({ id: e.id, title: e.title, amount: e.amount, reason: "Closing in under 14 days" });
    } else if (e.probability != null && e.probability < 30) {
      atRisk.push({ id: e.id, title: e.title, amount: e.amount, reason: `Low probability (${e.probability}%)` });
    }
  }

  const fastestEntry = pipelineEntries
    .slice()
    .sort((a, b) => {
      const probDiff = (b.probability ?? 50) - (a.probability ?? 50);
      if (probDiff !== 0) return probDiff;
      const aDate = a.expectedCloseDate ? a.expectedCloseDate.getTime() : Infinity;
      const bDate = b.expectedCloseDate ? b.expectedCloseDate.getTime() : Infinity;
      return aDate - bDate;
    })[0] ?? null;

  const fastestPath = fastestEntry
    ? {
        id: fastestEntry.id,
        title: fastestEntry.title,
        amount: fastestEntry.amount,
        probability: fastestEntry.probability ?? 50,
        action: "Follow up on proposal and confirm next steps",
      }
    : null;

  const byType = {
    service: entries.filter(e => e.serviceType === "service").reduce((s, e) => s + e.amount, 0),
    product: entries.filter(e => e.serviceType === "product").reduce((s, e) => s + e.amount, 0),
  };

  const projectRevMap = new Map<string, number>();
  for (const e of entries) {
    if (e.projectId) {
      projectRevMap.set(e.projectId, (projectRevMap.get(e.projectId) ?? 0) + e.amount);
    }
  }
  const byProject = Array.from(projectRevMap.entries())
    .map(([projectId, amount]) => ({
      projectId,
      projectName: projectMap.get(projectId) ?? "Unknown project",
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const forecast30d = live + pipeline * 0.3;

  return { live, pipeline, potential, total: live + pipeline + potential, forecast30d, atRisk, fastestPath, byType, byProject };
}

// ── Workforce Performance ─────────────────────────────────────────────────────

export async function getWorkforcePerformance(): Promise<WorkforcePerformance> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [teams, assignments, outputs, approvals, handoffs] = await Promise.all([
    prisma.workforceTeam.findMany({ where: { status: "active" } }),
    prisma.assignment.findMany({
      where: { status: { not: "archived" } },
      select: { id: true, status: true, teamId: true, completedAt: true },
    }),
    prisma.workforceOutput.findMany({
      where: { createdAt: { gte: weekAgo } },
      select: { id: true, teamId: true, createdAt: true },
    }),
    prisma.approval.findMany({
      where: { status: "pending" },
      select: { id: true, sourceTeamId: true },
    }),
    prisma.teamHandoff.findMany({
      where: { createdAt: { gte: monthAgo } },
      select: { id: true, fromTeamId: true },
    }),
  ]);

  const teamPerformance: TeamPerformance[] = teams.map(team => ({
    teamId: team.id,
    teamName: team.name,
    departmentType: team.departmentType,
    completedThisWeek: assignments.filter(
      a => a.teamId === team.id && a.status === "completed" && a.completedAt && a.completedAt >= weekAgo,
    ).length,
    completedThisMonth: assignments.filter(
      a => a.teamId === team.id && a.status === "completed" && a.completedAt && a.completedAt >= monthAgo,
    ).length,
    outputsThisWeek: outputs.filter(o => o.teamId === team.id).length,
    pendingApprovals: approvals.filter(a => a.sourceTeamId === team.id).length,
    handoffsCreated: handoffs.filter(h => h.fromTeamId === team.id).length,
  }));

  const completedThisWeek = assignments.filter(
    a => a.status === "completed" && a.completedAt && a.completedAt >= weekAgo,
  ).length;

  return {
    totalActiveAssignments: assignments.filter(a => a.status === "active").length,
    completedThisWeek,
    outputsThisWeek: outputs.length,
    pendingApprovals: approvals.length,
    teams: teamPerformance,
  };
}
