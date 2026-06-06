import { prisma } from "@/lib/db";
import type { ParsedAgentOutput, ParsedProposedAction } from "@/types";

interface AgentContext {
  tasks: unknown[];
  goals: unknown[];
  projects: unknown[];
  notes: unknown[];
  captures: unknown[];
  leads: unknown[];
  deployments: unknown[];
  supportIssues: unknown[];
  memories: unknown[];
  tools: unknown[];
}

async function assembleContext(agentId?: string): Promise<AgentContext> {
  const [tasks, goals, projects, notes, captures, leads, deployments, supportIssues] =
    await Promise.all([
      prisma.task.findMany({
        where: { status: { not: "done" } },
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
        take: 50,
        select: { id: true, title: true, status: true, priority: true, dueDate: true, nodeId: true },
      }),
      prisma.goal.findMany({
        where: { status: "active" },
        take: 20,
        select: { id: true, title: true, progress: true, targetDate: true },
      }),
      prisma.node.findMany({
        where: { type: "project", status: "active" },
        take: 20,
        select: { id: true, label: true, status: true, priority: true },
      }),
      prisma.note.findMany({
        orderBy: { updatedAt: "desc" },
        take: 15,
        select: { id: true, title: true, content: true, tags: true, updatedAt: true },
      }),
      prisma.capture.findMany({
        where: { status: "inbox" },
        take: 20,
        select: { id: true, title: true, type: true, priority: true, createdAt: true },
      }),
      prisma.lead.findMany({
        where: { status: { notIn: ["won", "lost", "archived"] } },
        orderBy: { updatedAt: "desc" },
        take: 30,
        select: {
          id: true,
          companyName: true,
          status: true,
          priority: true,
          estimatedValue: true,
          nextActionDate: true,
          recommendedProductId: true,
        },
      }),
      prisma.deployment.findMany({
        where: { status: { notIn: ["cancelled"] } },
        take: 20,
        select: { id: true, status: true, environment: true, monthlyPrice: true, nextCheckIn: true },
      }),
      prisma.supportIssue.findMany({
        where: { status: { notIn: ["resolved", "archived"] } },
        take: 20,
        select: { id: true, title: true, severity: true, status: true, createdAt: true },
      }),
    ]);

  // Load agent-specific memories (importance >= 4, most important + most recent first)
  let memories: unknown[] = [];
  if (agentId) {
    memories = await prisma.agentMemory.findMany({
      where: { agentId, importance: { gte: 4 } },
      orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
      take: 15,
      select: { id: true, memoryType: true, title: true, content: true, importance: true, updatedAt: true },
    });
  }

  // Load tools assigned to this agent (enabled only)
  let tools: unknown[] = [];
  if (agentId) {
    const agentTools = await prisma.agentTool.findMany({
      where: { agentId },
      include: {
        tool: { select: { name: true, slug: true, description: true, requiresApproval: true } },
      },
    });
    tools = agentTools
      .filter((at) => (at.tool as { enabled?: boolean }).enabled !== false)
      .map((at) => at.tool);
  }

  return {
    tasks,
    goals,
    projects,
    notes: notes.map((n) => ({ ...n, content: n.content.slice(0, 400) })),
    captures,
    leads,
    deployments,
    supportIssues,
    memories,
    tools,
  };
}

function buildDefaultSystemPrompt(): string {
  return `You are a strategic AI agent embedded in MioOS, a private Business Operating System.
Your role is to analyse the state of the business and produce actionable strategic recommendations.

CRITICAL RULES:
- You NEVER modify data directly.
- You ONLY generate recommendations, insights, and proposed actions.
- All proposed actions require human approval before execution.
- Be concise, specific, and honest about risks.

Respond ONLY with valid JSON matching this exact schema:
{
  "summary": "2–3 sentence executive summary",
  "recommendations": ["actionable recommendation", ...],
  "insights": ["key observation", ...],
  "proposedActions": [
    {
      "actionType": "create_task | update_lead_status | flag_issue | schedule_followup | create_note | archive_lead",
      "description": "plain-English description of the action",
      "reason": "why this action is recommended",
      "targetEntity": "lead | task | project | deployment | support_issue",
      "targetId": "entity id or null",
      "payload": {}
    }
  ]
}`;
}

async function callAnthropicAPI(
  systemPrompt: string,
  userContent: string,
  apiKey: string,
): Promise<ParsedAgentOutput> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  const data = await response.json();
  const text: string = data.content?.[0]?.text ?? "";

  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    return JSON.parse(jsonMatch ? jsonMatch[1] : text) as ParsedAgentOutput;
  } catch {
    return {
      summary: text.slice(0, 300),
      recommendations: [text],
      insights: [],
      proposedActions: [],
    };
  }
}

function generateMockOutput(context: AgentContext, agentName: string): ParsedAgentOutput {
  const now = new Date();
  const tasks = context.tasks as Array<{
    id: string; title: string; status: string; priority: string; dueDate?: string | null;
  }>;
  const leads = context.leads as Array<{
    id: string; companyName: string; status: string; estimatedValue?: number | null; nextActionDate?: string | null;
  }>;
  const goals = context.goals as Array<{ title: string; progress: number }>;
  const issues = context.supportIssues as Array<{ id: string; title: string; severity: string }>;
  const deployments = context.deployments as Array<{ id: string; status: string; nextCheckIn?: string | null }>;

  const overdueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now);
  const overdueLeads = leads.filter((l) => l.nextActionDate && new Date(l.nextActionDate) < now);
  const criticalIssues = issues.filter((i) => i.severity === "critical" || i.severity === "high");
  const staleDeployments = deployments.filter((d) => d.nextCheckIn && new Date(d.nextCheckIn) < now);
  const lowProgressGoals = goals.filter((g) => g.progress < 30);
  const pipelineValue = leads.reduce((s, l) => s + (l.estimatedValue ?? 0), 0);

  const recommendations: string[] = [];
  const insights: string[] = [];
  const proposedActions: ParsedProposedAction[] = [];

  if (overdueTasks.length > 0) {
    recommendations.push(
      `Clear ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""} — execution is blocked. Prioritise before new work.`,
    );
    overdueTasks.slice(0, 2).forEach((t) => {
      proposedActions.push({
        actionType: "flag_issue",
        description: `Flag task "${t.title}" as critically overdue`,
        reason: `Due date has passed. Blocking execution.`,
        targetEntity: "task",
        targetId: t.id,
        payload: { priority: "urgent" },
      });
    });
  }

  if (overdueLeads.length > 0) {
    recommendations.push(
      `Re-engage ${overdueLeads.length} lead${overdueLeads.length > 1 ? "s" : ""} with overdue follow-ups. Every day of silence costs pipeline value.`,
    );
    overdueLeads.slice(0, 2).forEach((l) => {
      proposedActions.push({
        actionType: "schedule_followup",
        description: `Schedule follow-up with ${l.companyName}`,
        reason: `Follow-up date has passed. Lead is going cold.`,
        targetEntity: "lead",
        targetId: l.id,
        payload: {},
      });
    });
  }

  if (criticalIssues.length > 0) {
    recommendations.push(
      `Escalate ${criticalIssues.length} critical/high support issue${criticalIssues.length > 1 ? "s" : ""} before they affect live deployments.`,
    );
  }

  if (staleDeployments.length > 0) {
    recommendations.push(
      `Check in on ${staleDeployments.length} deployment${staleDeployments.length > 1 ? "s" : ""} with overdue check-in dates.`,
    );
  }

  if (lowProgressGoals.length > 0) {
    recommendations.push(
      `Review ${lowProgressGoals.length} goal${lowProgressGoals.length > 1 ? "s" : ""} stuck below 30% progress — adjust scope or timeline now, not at end of quarter.`,
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "All systems are operating nominally. Focus energy on moving active leads through the pipeline today.",
    );
    recommendations.push("Consider reviewing goals progress and updating milestones for the week.");
  }

  insights.push(`Active pipeline value: €${pipelineValue.toLocaleString()}`);
  insights.push(`${tasks.length} open task${tasks.length !== 1 ? "s" : ""} across all projects`);
  insights.push(`${leads.length} active lead${leads.length !== 1 ? "s" : ""} in pipeline`);
  insights.push(`${deployments.length} deployment${deployments.length !== 1 ? "s" : ""} running`);
  if (overdueTasks.length > 0) insights.push(`${overdueTasks.length} task${overdueTasks.length !== 1 ? "s" : ""} past due date`);
  if (overdueLeads.length > 0) insights.push(`${overdueLeads.length} lead follow-up${overdueLeads.length !== 1 ? "s" : ""} overdue`);

  const urgencyLevel =
    criticalIssues.length > 0 || (overdueTasks.length > 2 && overdueLeads.length > 1)
      ? "High urgency"
      : overdueTasks.length > 0 || overdueLeads.length > 0
      ? "Moderate urgency"
      : "Low urgency";

  const summary = `${agentName} analysis complete. ${urgencyLevel}. Found ${overdueTasks.length} overdue task${overdueTasks.length !== 1 ? "s" : ""}, ${overdueLeads.length} overdue follow-up${overdueLeads.length !== 1 ? "s" : ""}, and ${criticalIssues.length} critical issue${criticalIssues.length !== 1 ? "s" : ""}. Active pipeline: €${pipelineValue.toLocaleString()}.`;

  return { summary, recommendations, insights, proposedActions };
}

function computeNextRunAt(frequency: string, timeOfDay: string | null): Date {
  const now = new Date();
  const [h, m] = (timeOfDay ?? "08:00").split(":").map(Number);
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setHours(h, m);

  if (frequency === "daily") {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (frequency === "weekly") {
    next.setDate(next.getDate() + 7);
  } else if (frequency === "monthly") {
    next.setMonth(next.getMonth() + 1);
  } else {
    return new Date("9999-01-01");
  }
  return next;
}

export async function executeAgent(agentId: string): Promise<string> {
  const run = await prisma.agentRun.create({
    data: { agentId, status: "running", startedAt: new Date() },
  });

  try {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    if (agent.status === "disabled") throw new Error("Agent is disabled");

    const context = await assembleContext(agentId);

    await prisma.agentRun.update({
      where: { id: run.id },
      data: { inputContext: JSON.stringify(context) },
    });

    const systemPrompt = agent.systemPrompt?.trim() || buildDefaultSystemPrompt();
    const userContent = agent.prompt?.trim()
      ? `${agent.prompt}\n\nCurrent MioOS state:\n${JSON.stringify(context, null, 2)}`
      : `Analyse the current state of MioOS and provide strategic recommendations.\n\nCurrent MioOS state:\n${JSON.stringify(context, null, 2)}`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const output: ParsedAgentOutput = apiKey
      ? await callAnthropicAPI(systemPrompt, userContent, apiKey)
      : generateMockOutput(context, agent.name);

    if (agent.requiresApproval && output.proposedActions.length > 0) {
      await Promise.all(
        output.proposedActions.map((action) =>
          prisma.approvalQueue.create({
            data: {
              agentRunId: run.id,
              actionType: action.actionType,
              proposedAction: JSON.stringify(action),
              reason: action.reason,
              status: "pending",
            },
          }),
        ),
      );
    }

    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: "completed", output: JSON.stringify(output), completedAt: new Date() },
    });

    const schedule = await prisma.agentSchedule.findUnique({ where: { agentId } });
    if (schedule?.enabled && schedule.frequency !== "manual") {
      await prisma.agentSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: new Date(),
          nextRunAt: computeNextRunAt(schedule.frequency, schedule.timeOfDay),
        },
      });
    }

    return run.id;
  } catch (err) {
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
        completedAt: new Date(),
      },
    });
    throw err;
  }
}

export { computeNextRunAt };
