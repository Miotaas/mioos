import { prisma } from "@/lib/db";
import type { Recommendation } from "./executive-analysis";

export async function generateRecommendations(): Promise<Recommendation[]> {
  const now = new Date();
  const fourteenDaysOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    agentQueueCount,
    wfApprovalCount,
    blockedProjects,
    stalledGoals,
    closingRevenue,
    reviewAssignments,
    overdueTaskCount,
    inactiveProjects,
  ] = await Promise.all([
    prisma.approvalQueue.count({ where: { status: "pending" } }),
    prisma.approval.count({ where: { status: "pending" } }),
    prisma.project.findMany({
      where: { OR: [{ status: "blocked" }, { blocker: { not: null } }] },
      select: { id: true, name: true, blocker: true },
      take: 5,
    }),
    prisma.goal.findMany({
      where: { status: "active", progress: { lte: 20 }, updatedAt: { lt: fourteenDaysAgo } },
      select: { id: true, title: true, progress: true, targetDate: true },
      take: 5,
    }),
    prisma.revenueEntry.findMany({
      where: {
        status: "active",
        revenueType: "pipeline",
        expectedCloseDate: { gte: now, lte: fourteenDaysOut },
      },
      select: { id: true, title: true, amount: true, expectedCloseDate: true },
      orderBy: { amount: "desc" },
      take: 3,
    }),
    prisma.assignment.findMany({
      where: { status: "review" },
      select: { id: true, title: true },
      take: 5,
    }),
    prisma.task.count({
      where: { status: { notIn: ["done", "cancelled"] }, dueDate: { lt: now } },
    }),
    prisma.project.findMany({
      where: { status: "active", updatedAt: { lt: fourteenDaysAgo }, blocker: null },
      select: { id: true, name: true },
      take: 3,
    }),
  ]);

  const recs: Recommendation[] = [];

  // Approvals — most urgent, blocks workforce
  const totalApprovals = agentQueueCount + wfApprovalCount;
  if (totalApprovals > 0) {
    recs.push({
      id: "pending_approvals",
      title: `Review ${totalApprovals} pending approval${totalApprovals !== 1 ? "s" : ""}`,
      reason: "Your workforce is waiting on your decision before it can proceed",
      priority: "critical",
      source: "approval",
      action: "Open Inbox to approve or reject each item",
      viewTarget: "inbox",
    });
  }

  // Assignments submitted for review
  for (const a of reviewAssignments) {
    recs.push({
      id: `review_${a.id}`,
      title: `Review completed work: "${a.title}"`,
      reason: "AI team finished this assignment and is awaiting your review",
      priority: "high",
      source: "workforce",
      action: "Open Workforce to review and approve or revise the output",
      viewTarget: "workforce",
    });
  }

  // Blocked projects
  for (const p of blockedProjects) {
    recs.push({
      id: `blocked_${p.id}`,
      title: `Unblock: ${p.name}`,
      reason: p.blocker ? `Blocker: "${p.blocker}"` : "Project is blocked with no active resolution",
      priority: "high",
      source: "project",
      action: "Resolve the blocker or send a request to the responsible team",
      viewTarget: "projects",
    });
  }

  // Pipeline deals closing soon
  for (const r of closingRevenue) {
    const days = r.expectedCloseDate
      ? Math.ceil((r.expectedCloseDate.getTime() - now.getTime()) / 86400000)
      : null;
    recs.push({
      id: `rev_close_${r.id}`,
      title: `Close deal: ${r.title}`,
      reason: `€${Math.round(r.amount)} pipeline deal${days !== null ? ` closing in ${days} day${days !== 1 ? "s" : ""}` : ""}`,
      priority: "high",
      source: "revenue",
      action: "Review proposal status and schedule a follow-up meeting",
      viewTarget: "revenue",
    });
  }

  // Stalled goals
  for (const g of stalledGoals) {
    const daysLeft = g.targetDate
      ? Math.ceil((g.targetDate.getTime() - now.getTime()) / 86400000)
      : null;
    recs.push({
      id: `stalled_${g.id}`,
      title: `Re-activate goal: "${g.title}"`,
      reason: daysLeft !== null
        ? `Stalled at ${g.progress}% with ${daysLeft} day${daysLeft !== 1 ? "s" : ""} to deadline`
        : `No progress on this goal in over 14 days (currently at ${g.progress}%)`,
      priority: daysLeft !== null && daysLeft < 30 ? "high" : "medium",
      source: "goal",
      action: "Use \"Request AI help\" on this goal to generate an action plan",
      viewTarget: "goals",
    });
  }

  // Overdue tasks
  if (overdueTaskCount > 0) {
    recs.push({
      id: "overdue_tasks",
      title: `Clear ${overdueTaskCount} overdue task${overdueTaskCount !== 1 ? "s" : ""}`,
      reason: "Tasks past their deadline slow everything else down",
      priority: overdueTaskCount >= 5 ? "high" : "medium",
      source: "project",
      action: "Complete, reschedule, or cancel overdue tasks",
      viewTarget: "tasks",
    });
  }

  // Inactive projects (silent but not blocked)
  for (const p of inactiveProjects) {
    recs.push({
      id: `inactive_${p.id}`,
      title: `Check in on: ${p.name}`,
      reason: "This project hasn't been updated in over 14 days",
      priority: "low",
      source: "project",
      action: "Review status and update the next action, or assign to a team",
      viewTarget: "projects",
    });
  }

  const ORDER: Record<Recommendation["priority"], number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return recs.sort((a, b) => ORDER[a.priority] - ORDER[b.priority]).slice(0, 10);
}
