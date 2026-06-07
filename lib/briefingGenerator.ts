import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/auditLog";
import { getWebSearchConnectorStatus } from "@/lib/connectors/webSearch";
import { getEmailConnectorStatus } from "@/lib/connectors/email";
import { getCalendarConnectorStatus } from "@/lib/connectors/calendar";

export async function generateExecutiveBriefing(agentId: string, runId: string): Promise<void> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const [insights, patterns, memories, pendingApprovals, leads, urgentTasks, recentResearch, latestEmail, latestCalendar] = await Promise.all([
    prisma.insight.findMany({
      where: { status: "active", createdAt: { gte: sevenDaysAgo } },
      orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
      take: 20,
    }),
    prisma.patternRecord.findMany({
      where: { status: { in: ["pending", "approved"] }, createdAt: { gte: sevenDaysAgo } },
      orderBy: [{ occurrences: "desc" }, { createdAt: "desc" }],
      take: 10,
    }),
    prisma.agentMemory.findMany({
      where: { agentId, importance: { gte: 6 }, updatedAt: { gte: sevenDaysAgo } },
      orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
      take: 10,
    }),
    prisma.approvalQueue.findMany({ where: { status: "pending" }, take: 30 }),
    prisma.lead.findMany({
      where: { status: { notIn: ["won", "lost", "archived"] } },
      take: 30,
      select: { id: true, nextActionDate: true },
    }),
    prisma.task.findMany({
      where: { status: { notIn: ["done", "cancelled"] }, priority: { in: ["urgent", "high"] } },
      take: 10,
      select: { id: true, title: true, priority: true },
    }),
    prisma.researchResult.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: [{ confidenceScore: "desc" }, { createdAt: "desc" }],
      take: 5,
    }),
    prisma.emailInsight.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.calendarInsight.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);

  const overdueLeads = leads.filter(l => l.nextActionDate && new Date(l.nextActionDate) < now);
  const criticalTasks = urgentTasks.filter(t => t.priority === "urgent");

  // Connector awareness context
  const webSearchStatus = getWebSearchConnectorStatus();
  const emailStatus = getEmailConnectorStatus();
  const calendarStatus = getCalendarConnectorStatus();

  // What Needs Attention
  const attention: string[] = [];
  if (pendingApprovals.length > 0)
    attention.push(`${pendingApprovals.length} agent action${pendingApprovals.length > 1 ? "s" : ""} pending your approval`);
  if (overdueLeads.length > 0)
    attention.push(`${overdueLeads.length} lead${overdueLeads.length > 1 ? "s" : ""} with overdue follow-ups`);
  if (criticalTasks.length > 0)
    attention.push(`${criticalTasks.length} urgent task${criticalTasks.length > 1 ? "s" : ""} require attention`);
  if (latestCalendar?.todayEvents && latestCalendar.todayEvents > 0)
    attention.push(`${latestCalendar.todayEvents} calendar event${latestCalendar.todayEvents > 1 ? "s" : ""} today`);

  // Risks
  const risks = insights
    .filter(i => i.type === "risk")
    .slice(0, 4)
    .map(i => i.summary);

  // Opportunities
  const opportunities = insights
    .filter(i => i.type === "opportunity")
    .slice(0, 4)
    .map(i => i.summary);

  // What Changed
  const changed: string[] = [
    ...memories.slice(0, 3).map(m => m.title),
    ...patterns.slice(0, 2).map(p => `Pattern: ${p.title}`),
  ];

  // Research-derived opportunities and risks
  for (const result of recentResearch) {
    try {
      const opp = JSON.parse(result.opportunities ?? "[]") as string[];
      opportunities.push(...opp.slice(0, 2));
    } catch { /* ignore */ }
    try {
      const r = JSON.parse(result.risks ?? "[]") as string[];
      risks.push(...r.slice(0, 1));
    } catch { /* ignore */ }
  }

  // Recommended Actions
  const execAndEfficiency = insights
    .filter(i => i.type === "execution" || i.type === "efficiency")
    .slice(0, 2)
    .map(i => i.summary);
  const actions: string[] = [...execAndEfficiency];
  if (recentResearch.length > 0)
    actions.push(`Review ${recentResearch.length} completed research result${recentResearch.length > 1 ? "s" : ""} in the Executive Loop`);
  if (criticalTasks.length > 0)
    actions.push(`Clear ${criticalTasks.length} urgent task${criticalTasks.length > 1 ? "s" : ""} before taking on new work`);
  if (overdueLeads.length > 0)
    actions.push(`Re-engage ${overdueLeads.length} overdue lead${overdueLeads.length > 1 ? "s" : ""} today`);
  if (pendingApprovals.length > 0)
    actions.push(`Review ${pendingApprovals.length} pending approval${pendingApprovals.length > 1 ? "s" : ""} in the Approval Queue`);
  if (latestCalendar?.nextDeadline)
    actions.push(`Prepare for upcoming: ${latestCalendar.nextDeadline}`);
  // Connector recommendations
  if (!webSearchStatus.connected) actions.push("Configure SERPER_API_KEY or TAVILY_API_KEY to enable web search intelligence.");
  if (!emailStatus.connected) actions.push("Configure EMAIL_IMAP_* env vars to enable email inbox awareness.");
  if (!calendarStatus.connected) actions.push("Configure CALENDAR_ICAL_URL to enable calendar awareness.");

  // Skip briefing if there's nothing to report
  if (attention.length === 0 && risks.length === 0 && opportunities.length === 0 && changed.length === 0) return;

  const riskCount = risks.length;
  const opportunityCount = opportunities.length;
  const parts = [
    `${insights.length} insight${insights.length !== 1 ? "s" : ""} generated`,
    riskCount > 0 ? `${riskCount} risk${riskCount > 1 ? "s" : ""} identified` : null,
    opportunityCount > 0 ? `${opportunityCount} opportunit${opportunityCount > 1 ? "ies" : "y"} detected` : null,
    pendingApprovals.length > 0 ? `${pendingApprovals.length} action${pendingApprovals.length > 1 ? "s" : ""} pending approval` : null,
  ].filter(Boolean);
  const summary = parts.join(". ") + ".";

  try {
    await prisma.executiveBriefing.create({
      data: {
        summary,
        risks: JSON.stringify(risks),
        opportunities: JSON.stringify(opportunities),
        actions: JSON.stringify(actions),
        patterns: JSON.stringify(patterns.slice(0, 4).map(p => p.title)),
        insights: JSON.stringify(insights.slice(0, 6).map(i => `[${i.type.toUpperCase()}] ${i.title}`)),
        agentId,
        runId,
      },
    });

    await auditLog("agent", agentId, "briefing_generated", {
      runId,
      insightCount: insights.length,
      riskCount,
      opportunityCount,
      actionCount: actions.length,
    });
  } catch {
    // Briefing generation must never block execution
  }
}
