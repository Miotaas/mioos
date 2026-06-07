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
  opportunities: unknown[];
  prospects: unknown[];
  campaignDrafts: unknown[];
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

  const [opportunities, prospects, campaignDrafts] = await Promise.all([
    prisma.commerceOpportunity.findMany({
      where: { status: { notIn: ["archived", "rejected"] } },
      take: 20,
      select: { id: true, title: true, opportunityType: true, status: true, estimatedRevenue: true, riskLevel: true },
    }),
    prisma.prospect.findMany({
      where: { status: { in: ["discovered", "qualified"] } },
      take: 20,
      select: { id: true, companyName: true, fitScore: true, status: true, painPointHypothesis: true },
    }),
    prisma.campaignDraft.findMany({
      where: { status: { in: ["draft", "pending_approval"] } },
      take: 10,
      select: { id: true, name: true, channel: true, status: true, goal: true },
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
    opportunities,
    prospects,
    campaignDrafts,
  };
}

const COMMERCE_SAFETY_RULES = `
COMMERCE SAFETY RULES (non-negotiable):
- NEVER send outreach automatically.
- NEVER launch ads or spend budget.
- NEVER create live Stripe products.
- NEVER deliver products to customers.
- NEVER scrape platforms aggressively.
- NEVER resell products without verified rights.
- NEVER issue refunds.
- ONLY create internal draft records and queue actions for human approval.`;

const COMMERCE_ACTION_SCHEMA = `"create_task" | "update_lead_status" | "flag_issue" | "schedule_followup" | "create_note" | "archive_lead" | "create_opportunity" | "create_prospect" | "create_campaign_draft" | "create_fulfillment_flow" | "convert_prospect_to_lead" | "prepare_outreach" | "prepare_ad_campaign" | "prepare_stripe_offer" | "prepare_delivery_email" | "create_memory" | "create_capture"`;

function buildDefaultSystemPrompt(): string {
  return `You are a strategic AI agent embedded in MioOS, a private Business Operating System.
Your role is to analyse the state of the business and produce actionable strategic recommendations.

CRITICAL RULES:
- You NEVER modify data directly.
- You ONLY generate recommendations, insights, and proposed actions.
- All proposed actions require human approval before execution.
- Be concise, specific, and honest about risks.
${COMMERCE_SAFETY_RULES}

Respond ONLY with valid JSON matching this exact schema:
{
  "summary": "2–3 sentence executive summary",
  "recommendations": ["actionable recommendation", ...],
  "insights": ["key observation", ...],
  "proposedActions": [
    {
      "actionType": ${COMMERCE_ACTION_SCHEMA},
      "description": "plain-English description of the action",
      "reason": "why this action is recommended",
      "targetEntity": "lead | task | project | deployment | support_issue | opportunity | prospect | campaign_draft | fulfillment_flow",
      "targetId": "entity id or null",
      "payload": {}
    }
  ]
}`;
}

function buildCommerceAgentSystemPrompt(agentType: string): string {
  const base = `You are an AI agent embedded in MioOS. You produce structured JSON output only. All proposed actions require human approval.
${COMMERCE_SAFETY_RULES}

Respond ONLY with valid JSON:
{
  "summary": "string",
  "recommendations": ["string"],
  "insights": ["string"],
  "proposedActions": [{ "actionType": ${COMMERCE_ACTION_SCHEMA}, "description": "string", "reason": "string", "targetEntity": "string", "targetId": "string|null", "payload": {} }]
}`;

  const prompts: Record<string, string> = {
    digital_commerce: `${base}

You are the Digital Commerce Agent. You discover legal digital product opportunities.
Focus on: PLR products, affiliate programs, licensed bundles, reseller rights, original digital products.
NEVER suggest unauthorized resale or copyright violation.
Propose: create_opportunity actions for viable digital products found in context.`,

    outreach: `${base}

You are the Outreach Agent. You prepare prospect lists and outreach message drafts.
Analyse existing prospects and leads. Identify outreach gaps.
NEVER send messages. NEVER contact anyone automatically.
Propose: create_prospect, prepare_outreach actions. Draft outreach text in the payload.`,

    ads: `${base}

You are the Ads Agent. You prepare campaign drafts for LinkedIn, Google, Meta, Instagram, Facebook.
Analyse leads and opportunities to identify best ad angles.
NEVER launch ads. NEVER spend budget. NEVER create live campaigns.
Propose: create_campaign_draft, prepare_ad_campaign actions with channel, hook, copy, and audience in payload.`,

    sales: `${base}

You are the Sales Agent. You identify follow-up opportunities and conversion paths.
Analyse leads by status, urgency, and pipeline value. Recommend next best actions.
NEVER contact leads automatically.
Propose: schedule_followup, update_lead_status, convert_prospect_to_lead actions.`,

    fulfillment: `${base}

You are the Fulfillment Agent. You prepare order confirmation, invoice, and delivery workflows.
Analyse existing fulfillment flows and identify gaps.
NEVER send emails automatically. NEVER deliver products without approval.
Propose: create_fulfillment_flow, prepare_delivery_email, prepare_stripe_offer actions.`,

    ceo: `${base}

You are the CEO Agent. You provide executive-level strategic direction across the full business.
Prioritise commerce opportunities by estimated ROI, speed to revenue, and risk level.
Analyse leads, deployments, support issues, and commerce opportunities holistically.
Propose a prioritised action plan with the highest-leverage actions first.`,
  };

  return prompts[agentType] ?? buildDefaultSystemPrompt();
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
  const opportunities = context.opportunities as Array<{ id: string; title: string; status: string; estimatedRevenue?: number | null }>;
  const prospects = context.prospects as Array<{ id: string; companyName: string; status: string; fitScore?: number | null }>;

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

  // Commerce insights
  const discoveredOpportunities = opportunities.filter(o => o.status === "discovered");
  const qualifiedProspects = prospects.filter(p => p.status === "qualified");
  if (discoveredOpportunities.length > 0) {
    recommendations.push(
      `Review ${discoveredOpportunities.length} discovered commerce opportunit${discoveredOpportunities.length > 1 ? "ies" : "y"} — validate or approve the highest-potential ones.`,
    );
  }
  if (qualifiedProspects.length > 0) {
    recommendations.push(
      `${qualifiedProspects.length} qualified prospect${qualifiedProspects.length > 1 ? "s" : ""} ready for outreach — prepare a message draft or convert to lead.`,
    );
    qualifiedProspects.slice(0, 1).forEach(p => {
      proposedActions.push({
        actionType: "prepare_outreach",
        description: `Prepare outreach draft for ${p.companyName}`,
        reason: `Prospect is qualified with fit score ${p.fitScore ?? "unknown"}. Ready for outreach.`,
        targetEntity: "prospect",
        targetId: p.id,
        payload: { channel: "email" },
      });
    });
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

    const commerceTypes = ["digital_commerce", "outreach", "ads", "sales", "fulfillment", "ceo"];
    const defaultPrompt = commerceTypes.includes(agent.agentType)
      ? buildCommerceAgentSystemPrompt(agent.agentType)
      : buildDefaultSystemPrompt();
    const systemPrompt = agent.systemPrompt?.trim() || defaultPrompt;
    const userContent = agent.prompt?.trim()
      ? `${agent.prompt}\n\nCurrent MioOS state:\n${JSON.stringify(context, null, 2)}`
      : `Analyse the current state of MioOS and provide strategic recommendations.\n\nCurrent MioOS state:\n${JSON.stringify(context, null, 2)}`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const output: ParsedAgentOutput = apiKey
      ? await callAnthropicAPI(systemPrompt, userContent, apiKey)
      : generateMockOutput(context, agent.name);

    // Queue non-memory proposed actions for approval
    const nonMemoryActions = output.proposedActions.filter(a => a.actionType !== "create_memory");
    if (agent.requiresApproval && nonMemoryActions.length > 0) {
      await Promise.all(
        nonMemoryActions.map((action) =>
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

    // Phase 1.9 + 2.0: post-run intelligence hooks — fire and forget
    Promise.resolve().then(async () => {
      try {
        const { extractAndQueueMemorySuggestions } = await import("@/lib/memoryExtractor");
        await extractAndQueueMemorySuggestions(agentId, run.id, output);
      } catch { /* never block on memory extraction */ }

      try {
        const { analyzeAndQueuePatterns } = await import("@/lib/patternAnalyzer");
        await analyzeAndQueuePatterns(agentId, run.id);
      } catch { /* never block on pattern analysis */ }

      try {
        const { generateAndStoreInsights } = await import("@/lib/insightEngine");
        await generateAndStoreInsights(agentId, run.id);
      } catch { /* never block on insight generation */ }

      try {
        const { generateExecutiveBriefing } = await import("@/lib/briefingGenerator");
        await generateExecutiveBriefing(agentId, run.id);
      } catch { /* never block on briefing generation */ }

      try {
        const { triggerWorkflows } = await import("@/lib/workflowRunner");
        await triggerWorkflows("completed_run", agentId, 0);
      } catch { /* never block on workflow chaining */ }
    }).catch(() => {});

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
