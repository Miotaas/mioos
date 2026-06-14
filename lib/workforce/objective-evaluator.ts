import { prisma } from "@/lib/db";
import { isAIEnabled, getAIProvider } from "@/lib/ai/provider";
import { auditLog } from "@/lib/auditLog";

interface BusinessContext {
  activeProjects: Array<{ name: string; status: string; blocker: string | null }>;
  activeGoals: Array<{ title: string; progress: number }>;
  openLeads: number;
  overdueTasks: number;
  pendingApprovals: number;
  openSupportIssues: number;
  blockedProjects: number;
}

async function getBusinessContext(): Promise<BusinessContext> {
  const now = new Date();
  const [projects, goals, openLeads, overdueTasks, pendingApprovals, openSupportIssues, blockedProjects] =
    await Promise.all([
      prisma.project.findMany({
        where: { status: "active" },
        take: 5,
        select: { name: true, status: true, blocker: true },
      }),
      prisma.goal.findMany({
        where: { status: "active" },
        take: 5,
        select: { title: true, progress: true },
      }),
      prisma.lead.count({ where: { status: { notIn: ["won", "lost", "archived"] } } }),
      prisma.task.count({
        where: { status: { notIn: ["done", "cancelled"] }, dueDate: { lt: now } },
      }),
      prisma.approval.count({ where: { status: "pending" } }),
      prisma.supportIssue.count({
        where: { status: { notIn: ["resolved", "archived"] }, severity: { in: ["high", "critical"] } },
      }),
      prisma.project.count({ where: { status: "blocked" } }),
    ]);

  return { activeProjects: projects, activeGoals: goals, openLeads, overdueTasks, pendingApprovals, openSupportIssues, blockedProjects };
}

function needsWork(departmentType: string, ctx: BusinessContext): boolean {
  switch (departmentType.toLowerCase()) {
    case "research":       return ctx.activeProjects.length > 0 || ctx.activeGoals.length > 0;
    case "sales":          return ctx.openLeads > 0;
    case "marketing":      return ctx.activeGoals.length > 0 || ctx.activeProjects.length > 0;
    case "content":        return ctx.activeGoals.length > 0 || ctx.activeProjects.length > 0;
    case "operations":     return ctx.overdueTasks > 0 || ctx.blockedProjects > 0;
    case "support":        return ctx.openSupportIssues > 0;
    case "executive":      return ctx.pendingApprovals > 0 || ctx.overdueTasks > 2 || ctx.blockedProjects > 0;
    case "development":    return ctx.activeProjects.length > 0;
    case "commerce":       return ctx.activeGoals.length > 0;
    default:               return ctx.activeProjects.length > 0;
  }
}

function buildTemplateTitle(departmentType: string, objective: string, ctx: BusinessContext): string {
  const proj = ctx.activeProjects[0];
  const goal = ctx.activeGoals[0];
  switch (departmentType.toLowerCase()) {
    case "research":
      return proj
        ? `Research opportunities and competitive landscape for ${proj.name}`
        : "Research market opportunities aligned with current business goals";
    case "sales":
      return ctx.openLeads > 0
        ? `Review ${ctx.openLeads} active leads and identify best next-contact priorities`
        : "Analyze pipeline and identify lead qualification opportunities";
    case "marketing":
      return goal
        ? `Develop marketing approach to support: ${goal.title}`
        : "Identify highest-impact marketing channels for current initiatives";
    case "content":
      return proj
        ? `Create content strategy supporting ${proj.name}`
        : "Generate content brief for current business priorities";
    case "operations":
      return ctx.overdueTasks > 0
        ? `Analyze and resolve ${ctx.overdueTasks} overdue execution bottlenecks`
        : "Review operational workflows and identify efficiency improvements";
    case "development":
      return proj
        ? `Review technical requirements and blockers for ${proj.name}`
        : "Assess technical debt and prioritize development improvements";
    case "support":
      return ctx.openSupportIssues > 0
        ? `Resolve and document ${ctx.openSupportIssues} critical support issues`
        : "Review support patterns and create improvement recommendations";
    case "executive":
      return ctx.pendingApprovals > 0
        ? `Executive review: ${ctx.pendingApprovals} pending decisions require attention`
        : "Generate strategic briefing for current business status";
    case "commerce":
      return goal
        ? `Identify revenue opportunities supporting: ${goal.title}`
        : "Evaluate highest-potential revenue opportunities";
    default:
      return objective.slice(0, 100);
  }
}

async function buildAssignmentTitle(
  departmentType: string,
  objective: string,
  ctx: BusinessContext,
): Promise<string> {
  if (!isAIEnabled()) return buildTemplateTitle(departmentType, objective, ctx);

  const ctxLines = [
    `Active projects: ${ctx.activeProjects.map(p => p.name).join(", ") || "none"}`,
    `Active goals: ${ctx.activeGoals.map(g => `${g.title} (${g.progress}%)`).join(", ") || "none"}`,
    `Open leads: ${ctx.openLeads}`,
    `Overdue tasks: ${ctx.overdueTasks}`,
    `Pending approvals: ${ctx.pendingApprovals}`,
  ].join("\n");

  const prompt = `Team department: ${departmentType}\nTeam objective: ${objective}\n\nCurrent business context:\n${ctxLines}\n\nWrite ONE specific, actionable task for this team to work on right now. Max 80 characters. Be concrete, not generic.`;

  try {
    const ai = getAIProvider();
    const result = await ai.generate(prompt);
    const cleaned = result.trim().replace(/^["']|["']$/g, "").slice(0, 100);
    return cleaned || buildTemplateTitle(departmentType, objective, ctx);
  } catch {
    return buildTemplateTitle(departmentType, objective, ctx);
  }
}

async function checkDailyLimit(teamId: string, maxDailyRuns: number): Promise<boolean> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const count = await prisma.runtimeQueue.count({
    where: { teamId, source: "objective", createdAt: { gte: startOfDay } },
  });
  return count < maxDailyRuns;
}

export async function evaluateObjectives(): Promise<{ created: number }> {
  const ctx = await getBusinessContext();
  const now = new Date();
  let created = 0;

  const configs = await prisma.autonomyConfig.findMany({
    where: { canSelfInitiate: true },
    include: {
      team: {
        include: { objectives: { where: { active: true }, take: 1 } },
      },
    },
  });

  for (const config of configs) {
    const team = config.team;
    if (team.status !== "active") continue;
    if (!needsWork(team.departmentType, ctx)) continue;

    const withinLimit = await checkDailyLimit(team.id, config.maxDailyRuns);
    if (!withinLimit) continue;

    const objective = team.objectives[0];
    if (!objective) continue;

    if (objective.nextRunAt && objective.nextRunAt > now) continue;

    const title = await buildAssignmentTitle(team.departmentType, objective.description, ctx);
    const description = `Autonomous objective: ${objective.title}\n\n${objective.description}\n\nTriggered by runtime at ${now.toISOString()}`;

    const assignment = await prisma.assignment.create({
      data: {
        title,
        description,
        teamId: team.id,
        priority: "medium",
        status: "pending",
      },
    });

    await prisma.runtimeQueue.create({
      data: {
        teamId: team.id,
        assignmentId: assignment.id,
        title,
        description,
        priority: "medium",
        source: "objective",
        status: "queued",
      },
    });

    const next = new Date(now);
    if (objective.frequency === "hourly") next.setHours(next.getHours() + 1);
    else if (objective.frequency === "weekly") next.setDate(next.getDate() + 7);
    else next.setDate(next.getDate() + 1);

    await prisma.teamObjective.update({
      where: { id: objective.id },
      data: { lastRunAt: now, nextRunAt: next },
    });

    await auditLog("assignment", assignment.id, "objective_assignment_created", {
      teamId: team.id,
      teamName: team.name,
      objectiveId: objective.id,
    });

    created++;
  }

  return { created };
}
