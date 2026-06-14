import { prisma } from "@/lib/db";
import { getAllProjectHealth } from "@/lib/executive/executive-health";
import { getRevenueIntelligence } from "@/lib/executive/executive-analysis";

// Signals that the request is about the founder's own MioOS data, not external research.
export function isInternalRequest(text: string): boolean {
  const lower = text.toLowerCase();

  const dutch = [
    "mijn project", "mijn doel", "mijn taak", "mijn omzet", "mijn bedrijf",
    "mijn pipeline", "mijn status", "mijn werk", "mijn team",
    "huidige project", "huidige situatie", "huidige doelen",
    "analyseer mijn", "analyse van mijn", "analyseer de",
    "risico", "prioriteit", "prioriteiten", "voortgang",
    "wat moet ik", "wat loopt er", "wat zijn de",
    "hoe staat het", "geef de", "geef een overzicht",
  ];

  const english = [
    "my project", "my goal", "my task", "my revenue", "my business",
    "my current", "my pipeline", "my status", "my team",
    "analyze my", "analyse my", "current projects", "current goals",
    "what should i", "what are my", "my priorities", "my risks",
    "my blockers", "how is my", "status of my", "give me an overview",
    "show me my", "what needs attention",
  ];

  return dutch.some(k => lower.includes(k)) || english.some(k => lower.includes(k));
}

export async function buildInternalContextPack(): Promise<string> {
  const now = new Date();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000);

  const [projectHealth, revenueIntel, pendingApprovals, overdueTasks, recentOutputs, activeHandoffs, goals] =
    await Promise.all([
      getAllProjectHealth(),
      getRevenueIntelligence(),
      prisma.approval.count({ where: { status: "pending" } }),
      prisma.task.findMany({
        where: { status: { notIn: ["done", "cancelled"] }, dueDate: { lt: now } },
        orderBy: { dueDate: "asc" },
        take: 8,
      }),
      prisma.workforceOutput.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
        include: { team: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.teamHandoff.findMany({
        where: { status: { notIn: ["completed", "rejected"] } },
        include: {
          fromTeam: { select: { name: true } },
          toTeam: { select: { name: true } },
        },
        take: 5,
      }),
      prisma.goal.findMany({
        where: { status: "active" },
        orderBy: { progress: "asc" },
        take: 10,
      }),
    ]);

  const lines: string[] = ["## Live MioOS Context (current state)", ""];

  // Projects
  lines.push("### Projects");
  if (projectHealth.length === 0) {
    lines.push("No projects found in the database.");
  } else {
    for (const p of projectHealth) {
      const h = p.health;
      lines.push(`**${p.name}** — status: ${p.status}, health: ${h.status} (score ${h.score}/100)`);
      if (p.blocker) lines.push(`  Blocker: ${p.blocker}`);
      if (p.nextAction) lines.push(`  Next action: ${p.nextAction}`);
      if (h.reasons.length > 0) lines.push(`  Issues: ${h.reasons.join("; ")}`);
    }
  }
  lines.push("");

  // Goals
  lines.push("### Active Goals");
  if (goals.length === 0) {
    lines.push("No active goals.");
  } else {
    for (const g of goals) {
      const stalled = g.progress <= 20 && g.updatedAt < fourteenDaysAgo;
      const daysToDeadline = g.targetDate
        ? Math.ceil((g.targetDate.getTime() - now.getTime()) / 86_400_000)
        : null;
      const stallNote = stalled ? " [STALLED — no progress in 14+ days]" : "";
      const deadlineNote = daysToDeadline !== null
        ? daysToDeadline < 0
          ? ` [OVERDUE by ${Math.abs(daysToDeadline)} day${Math.abs(daysToDeadline) !== 1 ? "s" : ""}]`
          : ` [${daysToDeadline} day${daysToDeadline !== 1 ? "s" : ""} to deadline]`
        : "";
      lines.push(`**${g.title}** — ${g.progress}% complete${stallNote}${deadlineNote}`);
    }
  }
  lines.push("");

  // Revenue
  lines.push("### Revenue Position");
  lines.push(`Live MRR: €${Math.round(revenueIntel.live).toLocaleString("nl-NL")}`);
  lines.push(`Pipeline (weighted): €${Math.round(revenueIntel.pipeline).toLocaleString("nl-NL")}`);
  lines.push(`Potential: €${Math.round(revenueIntel.potential).toLocaleString("nl-NL")}`);
  if (revenueIntel.atRisk.length > 0) {
    for (const r of revenueIntel.atRisk) {
      lines.push(`At risk: "${r.title}" €${r.amount} — ${r.reason}`);
    }
  }
  if (revenueIntel.fastestPath) {
    const fp = revenueIntel.fastestPath;
    lines.push(`Fastest path to revenue: "${fp.title}" — €${fp.amount} at ${fp.probability}% probability — recommended action: ${fp.action}`);
  }
  lines.push("");

  // Pending approvals
  if (pendingApprovals > 0) {
    lines.push(`### Pending Approvals: ${pendingApprovals}`);
    lines.push(`${pendingApprovals} workforce action(s) are blocked waiting for founder approval. This slows execution.`);
    lines.push("");
  }

  // Overdue tasks
  if (overdueTasks.length > 0) {
    lines.push("### Overdue Tasks");
    for (const t of overdueTasks) {
      const daysOverdue = t.dueDate
        ? Math.floor((now.getTime() - t.dueDate.getTime()) / 86_400_000)
        : 0;
      lines.push(`- "${t.title}" — ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue`);
    }
    lines.push("");
  }

  // Recent workforce outputs
  if (recentOutputs.length > 0) {
    lines.push("### Recent Workforce Outputs (last 7 days)");
    for (const o of recentOutputs) {
      lines.push(`- ${o.team?.name ?? "Team"}: "${o.title}" (type: ${o.outputType})`);
    }
    lines.push("");
  }

  // Active handoffs
  if (activeHandoffs.length > 0) {
    lines.push("### Active Handoffs");
    for (const h of activeHandoffs) {
      lines.push(`- "${h.title}" — from ${h.fromTeam?.name ?? "?"} to ${h.toTeam?.name ?? "?"} (${h.status})`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
