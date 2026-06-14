import { prisma } from "@/lib/db";
import type { ProjectHealth } from "./executive-analysis";

interface ProjectInput {
  id: string;
  name: string;
  status: string;
  blocker: string | null;
  nextAction: string | null;
  revenueImpact: number | null;
  updatedAt: Date;
}

export function scoreProjectHealth(
  project: ProjectInput,
  pendingApprovals = 0,
): ProjectHealth {
  let score = 100;
  const reasons: string[] = [];

  if (project.blocker) {
    score -= 30;
    reasons.push(`Blocker: ${project.blocker}`);
  }

  if (project.status === "blocked" && !project.blocker) {
    score -= 20;
    reasons.push("Status is blocked");
  }

  if (!project.nextAction) {
    score -= 10;
    reasons.push("No next action defined");
  }

  const daysSinceUpdate = Math.floor((Date.now() - project.updatedAt.getTime()) / 86400000);
  if (daysSinceUpdate >= 14) {
    score -= 25;
    reasons.push(`No activity for ${daysSinceUpdate} days`);
  } else if (daysSinceUpdate >= 7) {
    score -= 15;
    reasons.push(`Quiet for ${daysSinceUpdate} days`);
  }

  if (pendingApprovals > 0) {
    const penalty = Math.min(pendingApprovals, 3) * 10;
    score -= penalty;
    reasons.push(`${pendingApprovals} pending approval${pendingApprovals !== 1 ? "s" : ""}`);
  }

  if (project.revenueImpact && project.revenueImpact > 0) score += 10;
  if (project.status === "active") score += 5;

  score = Math.max(0, Math.min(100, score));

  let status: ProjectHealth["status"];
  if (score >= 85)      status = "excellent";
  else if (score >= 70) status = "good";
  else if (score >= 50) status = "warning";
  else                  status = "critical";

  if (reasons.length === 0) {
    if (project.nextAction) reasons.push("Next action defined");
    if (daysSinceUpdate < 3) reasons.push("Recently updated");
    reasons.push("No active blockers");
  }

  return { status, score, reasons };
}

export async function getAllProjectHealth(): Promise<
  Array<ProjectInput & { health: ProjectHealth }>
> {
  const [projects, approvals] = await Promise.all([
    prisma.project.findMany({ where: { status: { not: "archived" } }, orderBy: { updatedAt: "desc" } }),
    prisma.approval.findMany({ where: { status: "pending" }, select: { projectId: true } }),
  ]);

  const approvalsByProject = new Map<string, number>();
  for (const a of approvals) {
    if (a.projectId) {
      approvalsByProject.set(a.projectId, (approvalsByProject.get(a.projectId) ?? 0) + 1);
    }
  }

  return projects.map(p => ({
    ...p,
    health: scoreProjectHealth(p, approvalsByProject.get(p.id) ?? 0),
  }));
}
