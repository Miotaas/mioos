/**
 * Executive Loop Engine
 *
 * Reads system state, active agent goals, intelligence signals, and creates
 * internal coordination artifacts: workspaces, delegations, messages.
 *
 * Safety invariants (hard-coded, never bypassed):
 *   - Never calls external APIs
 *   - Never sends outreach or publishes content
 *   - Never spends money or processes payments
 *   - Never modifies business data (tasks, leads, products)
 *   - All output is internal coordination only
 */

import { prisma } from "@/lib/db";
import { isAutonomyPaused } from "@/lib/autonomy";
import { auditLog } from "@/lib/auditLog";

interface LoopResult {
  runId: string;
  decisions: string[];
  createdDelegations: number;
  createdMessages: number;
  createdWorkspaces: number;
  summary: string;
}

const DELEGATION_COOLDOWN_HOURS = 20;
const GOAL_WORKSPACE_PREFIX = "Goal: ";

// ── Helpers ───────────────────────────────────────────────────────

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

function daysAgo(d: number): Date {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000);
}

// Find the best available reviewer/delegate agent
async function findDelegateAgent(excludeId: string): Promise<string | null> {
  const agent = await prisma.agent.findFirst({
    where: {
      status: "active",
      id: { not: excludeId },
      authorityLevel: { in: ["research", "review", "delegate"] },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return agent?.id ?? null;
}

// ── Main loop ─────────────────────────────────────────────────────

export async function runExecutiveLoop(
  triggerType: "manual" | "scheduled" | "goal_review" | "briefing" | "system" = "manual"
): Promise<LoopResult> {
  // Safety: refuse to run if autonomy is paused
  if (await isAutonomyPaused()) {
    throw new Error("Autonomy is paused. Resume autonomy before running the Executive Loop.");
  }

  // Create the run record
  const run = await prisma.executiveLoopRun.create({
    data: { triggerType, status: "running", startedAt: new Date() },
  });

  const decisions: string[] = [];
  let createdDelegations = 0;
  let createdMessages = 0;
  let createdWorkspaces = 0;

  try {
    // ── 1. Load Executive Agent ───────────────────────────────────
    const execAgent = await prisma.agent.findFirst({
      where: { status: "active", authorityLevel: "coordinate" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });

    if (!execAgent) {
      throw new Error("No active coordinator agent found. Seed the Executive Agent first.");
    }

    // ── 2. Load system state ──────────────────────────────────────
    const [
      activeGoals,
      topInsights,
      pendingPatterns,
      activeDelegations,
      recentDelegationTargets,
    ] = await Promise.all([
      prisma.agentGoal.findMany({
        where: { status: "active" },
        include: { agent: { select: { id: true, name: true } } },
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
      prisma.insight.findMany({
        where: { status: "active", importance: { gte: 7 } },
        orderBy: { importance: "desc" },
        take: 5,
      }),
      prisma.patternRecord.findMany({
        where: { status: "pending" },
        orderBy: { occurrences: "desc" },
        take: 5,
      }),
      prisma.agentDelegation.count({
        where: { status: { in: ["pending", "accepted", "running"] } },
      }),
      // What delegations did we create recently to avoid duplicates?
      prisma.agentDelegation.findMany({
        where: {
          assignedByAgentId: execAgent.id,
          createdAt: { gte: hoursAgo(DELEGATION_COOLDOWN_HOURS) },
        },
        select: { objective: true },
      }),
    ]);

    const recentObjectives = new Set(
      recentDelegationTargets.map(d => d.objective.slice(0, 60).toLowerCase())
    );

    // ── 3. Ensure strategy workspace exists ───────────────────────
    let strategyWorkspace = await prisma.agentWorkspace.findFirst({
      where: { name: "Executive Strategy", status: "active" },
      select: { id: true },
    });

    if (!strategyWorkspace) {
      strategyWorkspace = await prisma.agentWorkspace.create({
        data: {
          name: "Executive Strategy",
          description: "Primary workspace for executive coordination and goal-driven delegation.",
          workspaceType: "strategy",
          status: "active",
        },
        select: { id: true },
      });
      // Add executive agent as member
      await prisma.agentWorkspaceMember.create({
        data: { workspaceId: strategyWorkspace.id, agentId: execAgent.id, role: "executive" },
      }).catch(() => {});
      createdWorkspaces++;
      decisions.push("Created Executive Strategy workspace for coordination.");
    }

    // ── 4. Goal-driven delegation ─────────────────────────────────
    for (const goal of activeGoals) {
      const objectiveKey = goal.title.slice(0, 60).toLowerCase();
      if (recentObjectives.has(objectiveKey)) continue;

      const toAgentId = await findDelegateAgent(execAgent.id) ?? execAgent.id;

      await prisma.agentDelegation.create({
        data: {
          assignedByAgentId: execAgent.id,
          assignedToAgentId: toAgentId,
          objective: goal.title,
          inputContext: JSON.stringify({
            goalId: goal.id,
            goalType: goal.goalType,
            period: goal.period,
            targetMetric: goal.targetMetric,
            targetValue: goal.targetValue,
            currentValue: goal.currentValue,
          }),
          expectedOutput: goal.targetMetric
            ? `Progress update on: ${goal.targetMetric}`
            : "Findings and recommendations",
          status: "pending",
        },
      });

      createdDelegations++;
      recentObjectives.add(objectiveKey);
      decisions.push(
        `Delegated goal "${goal.title}" (${goal.goalType}, ${goal.period}) to agent for research.`
      );
    }

    // ── 5. High-priority insight response ─────────────────────────
    for (const insight of topInsights) {
      const key = `insight:${insight.id}`;
      if (recentObjectives.has(key)) continue;

      const toAgentId = await findDelegateAgent(execAgent.id) ?? execAgent.id;
      const objective = `Validate and assess: ${insight.title}`;

      await prisma.agentDelegation.create({
        data: {
          assignedByAgentId: execAgent.id,
          assignedToAgentId: toAgentId,
          objective,
          inputContext: JSON.stringify({
            insightId: insight.id,
            insightType: insight.type,
            summary: insight.summary,
          }),
          expectedOutput: "Risk assessment or opportunity validation with confidence score.",
          status: "pending",
        },
      });

      createdDelegations++;
      recentObjectives.add(key);
      decisions.push(
        `Delegated validation of ${insight.type} insight: "${insight.title}" (importance ${insight.importance}/10).`
      );
    }

    // ── 5b. Research requests for unresearched goals ─────────────
    for (const goal of activeGoals) {
      const researchKey = `research:${goal.id}`;
      if (recentObjectives.has(researchKey)) continue;

      // Only create a research request if no recent one exists for this goal
      const recentResearch = await prisma.researchRequest.count({
        where: {
          title: { contains: goal.title.slice(0, 40) },
          createdAt: { gte: hoursAgo(DELEGATION_COOLDOWN_HOURS * 3) },
        },
      });
      if (recentResearch > 0) continue;

      await prisma.researchRequest.create({
        data: {
          requestedByAgentId: execAgent.id,
          workspaceId: strategyWorkspace.id,
          title: `Research: ${goal.title}`,
          objective: goal.description
            ? `${goal.description} — Target: ${goal.targetMetric ?? "not set"}`
            : `Gather intelligence to advance goal: ${goal.title}. Target metric: ${goal.targetMetric ?? "unspecified"}.`,
          priority: "medium",
          status: "pending",
        },
      });

      recentObjectives.add(researchKey);
      decisions.push(`Created research request for goal: "${goal.title}".`);
    }

    // ── 6. Pattern-driven messages ────────────────────────────────
    for (const pattern of pendingPatterns) {
      const key = `pattern:${pattern.id}`;
      if (recentObjectives.has(key)) continue;

      await prisma.agentMessage.create({
        data: {
          fromAgentId: execAgent.id,
          toAgentId: execAgent.id,
          subject: `Pattern detected: ${pattern.title}`,
          content: `Recurring pattern detected (${pattern.occurrences}x): ${pattern.description}. Status: ${pattern.status}. Review and determine if action is needed.`,
          priority: pattern.occurrences >= 3 ? "high" : "medium",
          status: "unread",
        },
      });

      createdMessages++;
      recentObjectives.add(key);
      decisions.push(
        `Logged pattern alert for "${pattern.title}" (${pattern.occurrences} occurrences).`
      );
    }

    // ── 7. Delegation volume summary ──────────────────────────────
    decisions.push(
      `System state: ${activeDelegations} active delegations, ${activeGoals.length} active goals.`
    );

    // ── 8. Workspace activity log ─────────────────────────────────
    if (createdDelegations > 0 || createdMessages > 0) {
      await prisma.workspaceActivity.create({
        data: {
          workspaceId: strategyWorkspace.id,
          activityType: "delegation",
          summary: `Executive Loop run: ${createdDelegations} delegations created, ${createdMessages} messages logged.`,
        },
      }).catch(() => {});
    }

    // ── 9. Finalize run ───────────────────────────────────────────
    const summary =
      decisions.length > 0
        ? `Loop completed: ${createdDelegations} delegations, ${createdMessages} messages, ${createdWorkspaces} workspaces. ${decisions.length} decisions logged.`
        : "Loop completed — no new coordination needed at this time.";

    await prisma.executiveLoopRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        summary,
        decisions: JSON.stringify(decisions),
        createdDelegations,
        createdMessages,
        createdWorkspaces,
        completedAt: new Date(),
      },
    });

    await auditLog("system", run.id, "executive_loop_completed", {
      triggerType,
      decisions: decisions.length,
      createdDelegations,
      createdMessages,
    });

    return { runId: run.id, decisions, createdDelegations, createdMessages, createdWorkspaces, summary };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    await prisma.executiveLoopRun.update({
      where: { id: run.id },
      data: { status: "failed", error, completedAt: new Date() },
    });
    throw err;
  }
}
