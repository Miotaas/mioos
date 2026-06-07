import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/auditLog";

type InsightType = "risk" | "opportunity" | "efficiency" | "revenue" | "execution";

interface InsightInput {
  type: InsightType;
  title: string;
  summary: string;
  confidence: number;
  importance: number;
}

async function generateInsights(agentId: string): Promise<InsightInput[]> {
  const now = new Date();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const insights: InsightInput[] = [];

  const [tasks, goals, leads, liveDeployments, issues, opportunities, prospects, recentApprovals, recentMemories] =
    await Promise.all([
      prisma.task.findMany({
        where: { status: { notIn: ["done", "cancelled"] } },
        take: 100,
        select: { id: true, priority: true, status: true, dueDate: true, nodeId: true },
      }),
      prisma.goal.findMany({
        where: { status: "active" },
        take: 20,
        select: { id: true, progress: true, targetDate: true },
      }),
      prisma.lead.findMany({
        where: { status: { notIn: ["won", "lost", "archived"] } },
        take: 50,
        select: { id: true, status: true, estimatedValue: true, nextActionDate: true },
      }),
      prisma.deployment.findMany({
        where: { status: "live" },
        take: 20,
        select: { id: true, monthlyPrice: true },
      }),
      prisma.supportIssue.findMany({
        where: { status: { notIn: ["resolved", "archived"] } },
        take: 20,
        select: { id: true, severity: true },
      }),
      prisma.commerceOpportunity.findMany({
        where: { status: { notIn: ["archived", "rejected"] } },
        take: 20,
        select: { id: true, status: true, estimatedRevenue: true },
      }),
      prisma.prospect.findMany({
        where: { status: { in: ["discovered", "qualified"] } },
        take: 20,
        select: { id: true, status: true, fitScore: true },
      }),
      prisma.approvalQueue.findMany({
        where: { createdAt: { gte: oneDayAgo } },
        take: 50,
        select: { id: true, status: true },
      }),
      prisma.agentMemory.findMany({
        where: { agentId, importance: { gte: 7 }, createdAt: { gte: sevenDaysAgo } },
        take: 10,
        select: { id: true, title: true, importance: true },
      }),
    ]);

  // Empty pipeline
  const pipelineValue = leads.reduce((s, l) => s + (l.estimatedValue ?? 0), 0);
  if (leads.length === 0) {
    insights.push({
      type: "risk",
      title: "Sales pipeline is empty",
      summary: "No active leads in the pipeline. Revenue generation is at risk without new prospects.",
      confidence: 9,
      importance: 9,
    });
  } else if (pipelineValue === 0) {
    insights.push({
      type: "risk",
      title: "Pipeline exists but has no estimated value",
      summary: `${leads.length} lead${leads.length > 1 ? "s" : ""} exist without estimated values. Pipeline health cannot be measured.`,
      confidence: 8,
      importance: 6,
    });
  }

  // Overdue leads
  const overdueLeads = leads.filter(l => l.nextActionDate && new Date(l.nextActionDate) < now);
  if (overdueLeads.length >= 2) {
    insights.push({
      type: "risk",
      title: `${overdueLeads.length} leads with overdue follow-ups`,
      summary: "Repeated follow-up delays signal a pipeline management problem. Leads are going cold.",
      confidence: 8,
      importance: 7,
    });
  }

  // Task concentration risk
  const tasksByNode = new Map<string, number>();
  for (const t of tasks) if (t.nodeId) tasksByNode.set(t.nodeId, (tasksByNode.get(t.nodeId) ?? 0) + 1);
  const maxNodeTasks = Math.max(0, ...tasksByNode.values());
  if (tasks.length > 5 && maxNodeTasks / tasks.length > 0.6) {
    insights.push({
      type: "efficiency",
      title: "Task effort is heavily concentrated on one project",
      summary: `Over 60% of all open tasks belong to a single project. Strategic effort may be imbalanced.`,
      confidence: 7,
      importance: 6,
    });
  }

  // Approval pressure
  const pendingApprovals = recentApprovals.filter(a => a.status === "pending");
  if (pendingApprovals.length >= 5) {
    insights.push({
      type: "execution",
      title: `${pendingApprovals.length} agent actions pending approval`,
      summary: "Approval queue is growing. Unreviewed actions reduce the value agents can deliver.",
      confidence: 9,
      importance: 7,
    });
  }

  // Qualified prospects with no conversion
  const qualified = prospects.filter(p => p.status === "qualified");
  if (qualified.length > 0) {
    insights.push({
      type: "opportunity",
      title: `${qualified.length} qualified prospect${qualified.length > 1 ? "s" : ""} ready for outreach`,
      summary: "Qualified prospects exist without outreach initiated. Conversion opportunity is being left on the table.",
      confidence: 8,
      importance: 7,
    });
  }

  // Approved commerce opportunities
  const approved = opportunities.filter(o => o.status === "approved");
  if (approved.length > 0) {
    const revPotential = approved.reduce((s, o) => s + (o.estimatedRevenue ?? 0), 0);
    insights.push({
      type: "opportunity",
      title: `${approved.length} approved opportunit${approved.length > 1 ? "ies" : "y"} ready to execute`,
      summary: revPotential > 0
        ? `€${revPotential.toLocaleString()} estimated revenue in approved opportunities awaiting execution.`
        : "Approved opportunities exist but have no execution plan yet.",
      confidence: 8,
      importance: 8,
    });
  }

  // Stalled goals
  const stalled = goals.filter(g => g.progress < 20);
  if (stalled.length >= 2) {
    insights.push({
      type: "efficiency",
      title: `${stalled.length} goals stuck below 20% progress`,
      summary: "Multiple goals show minimal progress. Reassess scope, resource allocation, or strategic priority.",
      confidence: 7,
      importance: 6,
    });
  }

  // Live recurring revenue
  const mrr = liveDeployments.reduce((s, d) => s + (d.monthlyPrice ?? 0), 0);
  if (mrr > 0) {
    insights.push({
      type: "revenue",
      title: `€${mrr.toLocaleString()}/month from ${liveDeployments.length} live deployment${liveDeployments.length > 1 ? "s" : ""}`,
      summary: "Active recurring revenue exists. Prioritise retention and upsell for these accounts.",
      confidence: 9,
      importance: 8,
    });
  }

  // Critical issues
  const criticalIssues = issues.filter(i => i.severity === "critical");
  if (criticalIssues.length > 0) {
    insights.push({
      type: "risk",
      title: `${criticalIssues.length} critical support issue${criticalIssues.length > 1 ? "s" : ""} unresolved`,
      summary: "Critical issues left open risk client trust, retention, and live deployment stability.",
      confidence: 9,
      importance: 9,
    });
  }

  // High-value memories from this week
  if (recentMemories.length >= 3) {
    insights.push({
      type: "execution",
      title: `${recentMemories.length} high-importance memories recorded this week`,
      summary: "Significant knowledge has been captured. Review and action the most critical items.",
      confidence: 6,
      importance: 5,
    });
  }

  return insights;
}

export async function generateAndStoreInsights(agentId: string, runId: string): Promise<void> {
  const candidates = await generateInsights(agentId);
  if (candidates.length === 0) return;

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (const ins of candidates) {
    try {
      // Deduplicate: don't re-create the same insight within 24 hours
      const existing = await prisma.insight.findFirst({
        where: { type: ins.type, title: ins.title, status: "active", createdAt: { gte: oneDayAgo } },
      });
      if (existing) continue;

      await prisma.insight.create({
        data: {
          type: ins.type,
          title: ins.title,
          summary: ins.summary,
          confidence: ins.confidence,
          importance: ins.importance,
          agentId,
          runId,
          status: "active",
        },
      });

      await auditLog("agent", agentId, "insight_generated", {
        runId, type: ins.type, title: ins.title, importance: ins.importance,
      });
    } catch {
      // Individual insight failures must not block execution
    }
  }
}
