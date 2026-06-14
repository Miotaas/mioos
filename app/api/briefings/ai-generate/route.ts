import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAIProvider, isAIEnabled } from "@/lib/ai/provider";
import { getApprovalTriageSummary } from "@/lib/governance/approval-triage";
import { getRecentSignals } from "@/lib/intelligence/signal-store";

export async function POST() {
  try {
    if (!isAIEnabled()) {
      return NextResponse.json({
        ok: false,
        message: "AI provider not configured. Set AI_PROVIDER and the corresponding API key.",
      }, { status: 422 });
    }

    const since48h = new Date(Date.now() - 48 * 3_600_000);

    // Gather all briefing data in parallel
    const [
      approvalSummary,
      recentSignals,
      overdueGoals,
      blockedProjects,
      recentOutputs,
      activeAssignments,
      latestCalendar,
      latestEmail,
      runtimeHealth,
      recentAlerts,
    ] = await Promise.all([
      getApprovalTriageSummary(),
      getRecentSignals(["web", "calendar", "email", "internal"], 8),
      prisma.goal.findMany({
        where:   { status: { in: ["active", "at_risk"] } },
        select:  { title: true, progress: true, status: true, goalType: true },
        orderBy: { progress: "asc" },
        take:    5,
      }),
      prisma.project.findMany({
        where:  { status: "active", blocker: { not: null } },
        select: { name: true, blocker: true, nextAction: true },
        take:   5,
      }),
      prisma.workforceOutput.findMany({
        where:   { status: "draft", createdAt: { gte: since48h } },
        select:  { title: true, outputType: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take:    5,
      }),
      prisma.assignment.count({ where: { status: { in: ["pending", "active", "review"] } } }),
      prisma.calendarInsight.findFirst({
        orderBy: { createdAt: "desc" },
        select:  { summary: true, todayEvents: true, upcomingEvents: true, nextDeadline: true },
      }).catch(() => null),
      prisma.emailInsight.findFirst({
        orderBy: { createdAt: "desc" },
        select:  { summary: true, emailCount: true, importantCount: true },
      }).catch(() => null),
      prisma.runtimeState.findUnique({ where: { key: "runtime:heartbeat" } }).catch(() => null),
      prisma.alertLog.findMany({
        where:   { sentAt: { gte: since48h } },
        select:  { alertType: true, severity: true, message: true, sentAt: true },
        orderBy: { sentAt: "desc" },
        take:    5,
      }).catch(() => []),
    ]);

    // Build runtime status string
    let runtimeStatus = "unknown";
    if (runtimeHealth) {
      const ageMin = (Date.now() - new Date(runtimeHealth.value).getTime()) / 60_000;
      if (ageMin < 2)   runtimeStatus = "running normally";
      else if (ageMin < 10) runtimeStatus = `stale (last heartbeat ${Math.round(ageMin)} min ago)`;
      else              runtimeStatus = `OFFLINE (last heartbeat ${Math.round(ageMin)} min ago)`;
    }

    // Build signal summaries
    const webSignals      = recentSignals.filter(s => s.signalType === "web");
    const calendarSignals = recentSignals.filter(s => s.signalType === "calendar");
    const emailSignals    = recentSignals.filter(s => s.signalType === "email");
    const internalSignals = recentSignals.filter(s => s.signalType === "internal");

    const context = `
You are the Executive AI advisor inside MioOS, an autonomous company operating system.
Produce a comprehensive founder briefing answering: "What happened while I was away?"
Today is ${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.

═══ RUNTIME STATUS ═══
Runtime worker: ${runtimeStatus}
Active assignments in progress: ${activeAssignments}
${recentAlerts.length > 0 ? `Recent alerts (${recentAlerts.length}): ${recentAlerts.map(a => `[${a.severity.toUpperCase()}] ${a.message.slice(0, 80)}`).join(" | ")}` : "No recent alerts."}

═══ APPROVAL QUEUE ═══
Total pending approvals: ${approvalSummary.totalPending}
- Critical: ${approvalSummary.critical}
- High: ${approvalSummary.high}
- Medium: ${approvalSummary.medium}
- Low: ${approvalSummary.low}
Auto-approved today (low-risk): ${approvalSummary.autoApprovedToday}
${approvalSummary.oldestAgeDays !== null ? `Oldest pending approval: ${approvalSummary.oldestAgeDays} days old` : ""}

═══ GOALS & PROJECTS ═══
Goals: ${JSON.stringify(overdueGoals)}
Blocked projects: ${JSON.stringify(blockedProjects)}
Recent AI outputs (last 48h): ${JSON.stringify(recentOutputs)}

═══ CALENDAR ═══
${latestCalendar ? latestCalendar.summary : "Calendar not configured."}
${calendarSignals.map(s => s.title + ": " + s.content.slice(0, 150)).join("\n") || ""}

═══ EMAIL ═══
${latestEmail ? latestEmail.summary : "Email not configured."}
${emailSignals.map(s => s.title + ": " + s.content.slice(0, 150)).join("\n") || ""}

═══ EXTERNAL INTELLIGENCE ═══
${webSignals.length > 0 ? webSignals.map(s => `[WEB] ${s.title}: ${s.content.slice(0, 200)}`).join("\n") : "No web intelligence signals yet."}

═══ INTERNAL SIGNALS ═══
${internalSignals.length > 0 ? internalSignals.map(s => `[INTERNAL] ${s.title}: ${s.content.slice(0, 150)}`).join("\n") : "No internal signals."}
`.trim();

    const prompt = `Based on all the company data above, produce a comprehensive morning briefing in this exact JSON format (respond ONLY with valid JSON, no markdown fences):
{
  "greeting": "Good [morning/afternoon]. Here is your briefing for [date].",
  "situation": "2-3 sentence executive summary of business state right now.",
  "runtimeStatus": "One sentence on runtime worker health.",
  "approvalsRequiringAction": ["List only critical/high risk approvals — describe what needs decision"],
  "calendarToday": "Summary of today's schedule and any urgent meetings.",
  "emailHighlights": "Summary of important emails requiring attention.",
  "externalIntelligence": "Key insights from web research signals.",
  "needsAttention": ["item 1 requiring founder action today", "item 2", "item 3"],
  "biggestOpportunity": "One sentence on most promising visible opportunity.",
  "biggestRisk": "One sentence on most critical risk or blocker.",
  "top3Actions": ["Action 1 — specific and concrete", "Action 2", "Action 3"],
  "nextAction": "One specific, concrete first action to take right now."
}`;

    const ai = getAIProvider();
    const rawResponse = await ai.generate(prompt, context);

    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ ok: false, message: "AI returned invalid format" }, { status: 422 });
    }

    const briefing = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    return NextResponse.json({
      ok: true,
      briefing,
      approvalSummary,
      signalCounts: {
        web:      webSignals.length,
        calendar: calendarSignals.length,
        email:    emailSignals.length,
        internal: internalSignals.length,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[briefings/ai-generate POST]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
