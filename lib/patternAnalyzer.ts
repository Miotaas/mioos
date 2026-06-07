import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/auditLog";

type PatternType = "blocker" | "overdue" | "approval_delay" | "revenue_risk" | "operational_risk";

interface DetectedPattern {
  patternType: PatternType;
  title: string;
  description: string;
  occurrences: number;
}

async function detectPatterns(): Promise<DetectedPattern[]> {
  const now = new Date();
  const patterns: DetectedPattern[] = [];

  const [tasks, leads, approvals, issues, deployments] = await Promise.all([
    prisma.task.findMany({
      where: { status: { notIn: ["done", "cancelled"] }, dueDate: { lt: now } },
      include: { node: { select: { id: true, label: true } } },
      take: 50,
    }),
    prisma.lead.findMany({
      where: {
        status: { notIn: ["won", "lost", "archived"] },
        nextActionDate: { lt: now },
      },
      take: 30,
    }),
    prisma.approvalQueue.findMany({
      where: { status: "pending" },
      take: 50,
    }),
    prisma.supportIssue.findMany({
      where: {
        status: { notIn: ["resolved", "archived"] },
        severity: { in: ["critical", "high"] },
      },
      take: 20,
    }),
    prisma.deployment.findMany({
      where: { status: { notIn: ["cancelled"] }, nextCheckIn: { lt: now } },
      take: 20,
    }),
  ]);

  // Overdue tasks: group by project, flag concentration >= 2
  if (tasks.length >= 2) {
    const byProject = new Map<string, { label: string; count: number }>();
    for (const t of tasks) {
      if (t.node) {
        const prev = byProject.get(t.node.id) ?? { label: t.node.label, count: 0 };
        byProject.set(t.node.id, { label: prev.label, count: prev.count + 1 });
      }
    }
    for (const [, { label, count }] of byProject) {
      if (count >= 2) {
        patterns.push({
          patternType: "overdue",
          title: `Repeated overdue tasks in "${label}"`,
          description: `${count} tasks in "${label}" are past due. Suggests scope creep or capacity issues.`,
          occurrences: count,
        });
      }
    }
    // Fallback: global overdue signal with no project grouping
    if (tasks.length >= 4 && patterns.filter(p => p.patternType === "overdue").length === 0) {
      patterns.push({
        patternType: "overdue",
        title: `${tasks.length} tasks overdue across all projects`,
        description: `Systematic execution lag detected. Review workload capacity and priority alignment.`,
        occurrences: tasks.length,
      });
    }
  }

  // Lead follow-up delays
  if (leads.length >= 2) {
    patterns.push({
      patternType: "revenue_risk",
      title: `${leads.length} leads with overdue follow-ups`,
      description: `Lead follow-ups are repeatedly delayed. Pipeline is at risk of going cold.`,
      occurrences: leads.length,
    });
  }

  // Approval queue buildup by action type
  if (approvals.length >= 3) {
    const byType = new Map<string, number>();
    for (const a of approvals) byType.set(a.actionType, (byType.get(a.actionType) ?? 0) + 1);
    for (const [type, count] of byType) {
      if (count >= 2) {
        patterns.push({
          patternType: "approval_delay",
          title: `Approval bottleneck on "${type}"`,
          description: `${count} "${type}" actions are pending approval. Approval queue is building up.`,
          occurrences: count,
        });
        break; // one approval delay signal is enough
      }
    }
    if (approvals.length >= 8 && patterns.filter(p => p.patternType === "approval_delay").length === 0) {
      patterns.push({
        patternType: "approval_delay",
        title: `${approvals.length} agent actions awaiting approval`,
        description: `Approval backlog is accumulating. Review and clear to maintain agent velocity.`,
        occurrences: approvals.length,
      });
    }
  }

  // Critical / high support issues
  if (issues.length >= 1) {
    patterns.push({
      patternType: "operational_risk",
      title: `${issues.length} unresolved high-severity support issue${issues.length > 1 ? "s" : ""}`,
      description: `Unresolved critical/high issues threaten client retention and deployment stability.`,
      occurrences: issues.length,
    });
  }

  // Stale deployments
  if (deployments.length >= 2) {
    patterns.push({
      patternType: "operational_risk",
      title: `${deployments.length} deployments with overdue check-ins`,
      description: `Multiple deployments have missed check-in dates. Operational visibility is degrading.`,
      occurrences: deployments.length,
    });
  }

  return patterns;
}

export async function analyzeAndQueuePatterns(agentId: string, runId: string): Promise<void> {
  const patterns = await detectPatterns();
  if (patterns.length === 0) return;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  for (const p of patterns) {
    try {
      // Avoid duplicating patterns detected within the last 7 days
      const existing = await prisma.patternRecord.findFirst({
        where: {
          patternType: p.patternType,
          status: { in: ["pending", "approved"] },
          createdAt: { gte: sevenDaysAgo },
        },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        await prisma.patternRecord.update({
          where: { id: existing.id },
          data: { occurrences: { increment: p.occurrences }, updatedAt: new Date() },
        });
        continue;
      }

      const record = await prisma.patternRecord.create({
        data: {
          patternType: p.patternType,
          title: p.title,
          description: p.description,
          occurrences: p.occurrences,
          agentId,
          runId,
          status: "pending",
        },
      });

      await prisma.approvalQueue.create({
        data: {
          agentRunId: runId,
          actionType: "store_pattern",
          proposedAction: JSON.stringify({
            actionType: "store_pattern",
            description: `Pattern: ${p.title}`,
            reason: p.description,
            targetEntity: "pattern",
            targetId: null,
            payload: { patternId: record.id, patternType: p.patternType },
          }),
          reason: p.description,
          status: "pending",
        },
      });

      await auditLog("agent", agentId, "pattern_detected", {
        runId,
        patternType: p.patternType,
        title: p.title,
        occurrences: p.occurrences,
        patternId: record.id,
      });
    } catch {
      // Individual pattern failures must not block execution
    }
  }
}
