import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const [
      pendingApprovals,
      pendingWorkforceApprovals,
      pendingHandoffs,
      recentOutputs,
      activeProjects,
      activeGoals,
      dueTasks,
      revenueEntries,
    ] = await Promise.all([
      prisma.approvalQueue.findMany({
        where: { status: "pending" },
        include: { agentRun: { include: { agent: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.approval.findMany({
        where: { status: "pending" },
        include: { sourceTeam: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.teamHandoff.findMany({
        where: { status: { in: ["pending", "accepted", "in_progress"] } },
        include: { fromTeam: true, toTeam: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.workforceOutput.findMany({
        where: { createdAt: { gte: twoDaysAgo } },
        include: { team: true },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
      prisma.project.findMany({
        where: { status: { in: ["active", "planning", "blocked"] } },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.goal.findMany({
        where: { status: "active" },
        include: { milestones: { orderBy: { order: "asc" } } },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.task.findMany({
        where: {
          status: { notIn: ["done", "cancelled"] },
          dueDate: { lte: tomorrow },
        },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
      prisma.revenueEntry.findMany({
        orderBy: { amount: "desc" },
      }),
    ]);

    // Revenue calculations
    const liveRevenue = revenueEntries
      .filter(r => r.revenueType === "live")
      .reduce((s, r) => s + r.amount, 0);
    const pipelineRevenue = revenueEntries
      .filter(r => r.revenueType === "pipeline")
      .reduce((s, r) => s + r.amount, 0);
    const potentialRevenue = revenueEntries
      .filter(r => r.revenueType === "potential")
      .reduce((s, r) => s + r.amount, 0);

    const overdueTaskCount = dueTasks.filter(
      t => t.dueDate && new Date(t.dueDate) < now
    ).length;

    const blockedProjects = activeProjects.filter(p => p.status === "blocked");

    const avgGoalProgress =
      activeGoals.length > 0
        ? Math.round(activeGoals.reduce((s, g) => s + g.progress, 0) / activeGoals.length)
        : 0;

    const totalPendingApprovals =
      pendingApprovals.length + pendingWorkforceApprovals.length;

    const priorityOrder: Record<string, number> = {
      urgent: 0, high: 1, medium: 2, low: 3,
    };

    const needsAttention = [
      ...pendingWorkforceApprovals.map(a => ({
        type: "approval" as const,
        id: a.id,
        title: a.title,
        source: a.sourceTeam?.name ?? "Team",
        priority: a.priority,
        time: a.createdAt.toISOString(),
        reason: a.reason ?? undefined,
      })),
      ...pendingApprovals.map(a => ({
        type: "agent_approval" as const,
        id: a.id,
        title: a.actionType.replace(/_/g, " "),
        source: a.agentRun?.agent?.name ?? "Agent",
        priority: "medium",
        time: a.createdAt.toISOString(),
        reason: a.reason ?? undefined,
      })),
      ...blockedProjects.map(p => ({
        type: "blocked_project" as const,
        id: p.id,
        title: p.name,
        source: "Projects",
        priority: "high",
        time: p.updatedAt.toISOString(),
        reason: p.blocker ?? undefined,
      })),
      ...dueTasks
        .filter(t => t.dueDate && new Date(t.dueDate) < now)
        .map(t => ({
          type: "overdue_task" as const,
          id: t.id,
          title: t.title,
          source: "Tasks",
          priority: t.priority,
          time: t.dueDate!.toISOString(),
          reason: undefined as string | undefined,
        })),
    ].sort(
      (a, b) =>
        (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
    );

    return NextResponse.json({
      generatedAt: now.toISOString(),

      stats: {
        pendingApprovals: totalPendingApprovals,
        activeProjects: activeProjects.length,
        blockedProjects: blockedProjects.length,
        activeGoals: activeGoals.length,
        avgGoalProgress,
        overdueTasks: overdueTaskCount,
        recentOutputs: recentOutputs.length,
        liveRevenue,
        pipelineRevenue,
        potentialRevenue,
      },

      needsAttention,

      recentOutputs: recentOutputs.map(o => ({
        id: o.id,
        title: o.title,
        team: o.team?.name ?? "Team",
        outputType: o.outputType,
        status: o.status,
        time: o.createdAt.toISOString(),
      })),

      handoffs: pendingHandoffs.map(h => ({
        id: h.id,
        title: h.title,
        from: h.fromTeam?.name ?? "Team",
        to: h.toTeam?.name ?? "Team",
        status: h.status,
        priority: h.priority,
        time: h.createdAt.toISOString(),
      })),

      goals: activeGoals.map(g => ({
        id: g.id,
        title: g.title,
        progress: g.progress,
        goalType: g.goalType,
        targetDate: g.targetDate?.toISOString() ?? null,
        milestoneCount: g.milestones.length,
        milestonesCompleted: g.milestones.filter(m => m.completed).length,
      })),

      revenue: {
        live: liveRevenue,
        pipeline: pipelineRevenue,
        potential: potentialRevenue,
        topEntries: revenueEntries.slice(0, 5).map(r => ({
          id: r.id,
          title: r.title,
          amount: r.amount,
          currency: r.currency,
          revenueType: r.revenueType,
          status: r.status,
        })),
      },

      projects: activeProjects.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        priority: p.priority,
        nextAction: p.nextAction ?? null,
        blocker: p.blocker ?? null,
        revenueImpact: p.revenueImpact ?? null,
      })),
    });
  } catch (e) {
    console.error("[GET /api/briefings/daily]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
