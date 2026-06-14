/**
 * Approval Triage — scores risk, auto-approves safe internal actions,
 * escalates stale high-risk approvals.
 *
 * Risk levels:
 *   low      — internal reviews with no external impact (auto-approves after delay)
 *   medium   — draft content/outreach awaiting review (manual, surfaces in digest)
 *   high     — external commitments, proposals, deployments (manual only)
 *   critical — urgent + high-value actions (immediate alert)
 *
 * Auto-approval rules:
 *   Only "low" risk approvals may be auto-approved.
 *   Only after APPROVAL_AUTO_APPROVE_HOURS have elapsed (default: 48h).
 *   Never if the title/description contains keywords suggesting external action.
 *
 * Audit: every auto-approval is recorded in SystemExecutionLog.
 */

import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/auditLog";

const AUTO_APPROVE_HOURS = Number(process.env.APPROVAL_AUTO_APPROVE_HOURS ?? "48");

// ── Risk scoring ─────────────────────────────────────────────────────

type RiskLevel = "low" | "medium" | "high" | "critical";

// Keywords that indicate external, irreversible, or financial actions.
// If found in title or description, auto-approval is blocked regardless of risk level.
const EXTERNAL_KEYWORDS = [
  "send", "publish", "deploy", "launch", "post", "email", "outreach",
  "payment", "charge", "invoice", "contract", "proposal", "budget",
  "external", "client", "customer", "prospect",
];

export function scoreApprovalRisk(approval: {
  decisionType: string;
  priority: string;
  title: string;
  description?: string | null;
  sourceTeam?: { departmentType: string } | null;
}): RiskLevel {
  const { decisionType, priority, title, description, sourceTeam } = approval;
  const dept = sourceTeam?.departmentType ?? "";

  // Urgent priority → always critical
  if (priority === "urgent") return "critical";

  // Explicit high-risk decision types
  if (["approve_proposal", "approve_deployment", "approve_budget"].includes(decisionType)) {
    return priority === "high" ? "critical" : "high";
  }

  // Medium-risk decision types
  if (["approve_outreach", "approve_campaign", "approve_content"].includes(decisionType)) {
    return "medium";
  }

  // Product validation — medium by default
  if (decisionType === "approve_product") {
    return "medium";
  }

  // Internal review types — low risk by default
  if (["review_research"].includes(decisionType)) {
    return "low";
  }

  // Generic "founder_decision" — risk based on team
  if (decisionType === "founder_decision") {
    if (["research", "executive", "operations", "support"].includes(dept)) return "low";
    if (["sales", "marketing", "content", "commerce"].includes(dept)) return "medium";
    if (["development"].includes(dept)) return "high";
  }

  // Default based on priority
  if (priority === "high") return "high";
  if (priority === "low") return "low";
  return "medium";
}

function containsExternalKeyword(title: string, description?: string | null): boolean {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  return EXTERNAL_KEYWORDS.some(kw => text.includes(kw));
}

// ── Main triage processor ────────────────────────────────────────────

export async function processApprovalTriage(): Promise<{
  scored: number;
  autoApproved: number;
  escalated: number;
}> {
  const now = new Date();
  let scored = 0;
  let autoApproved = 0;
  let escalated = 0;

  // 1. Score all unscored pending approvals
  const unscoredApprovals = await prisma.approval.findMany({
    where: { status: "pending", riskLevel: "medium" }, // default is "medium" — all unscored approvals
    include: { sourceTeam: { select: { departmentType: true } } },
    orderBy: { createdAt: "asc" },
  });

  for (const approval of unscoredApprovals) {
    const riskLevel = scoreApprovalRisk({
      decisionType: approval.decisionType,
      priority:     approval.priority,
      title:        approval.title,
      description:  approval.description,
      sourceTeam:   approval.sourceTeam,
    });

    if (riskLevel !== (approval.riskLevel as RiskLevel)) {
      await prisma.approval.update({
        where: { id: approval.id },
        data:  { riskLevel },
      });
      scored++;
    }
  }

  // 2. Re-fetch all pending approvals for triage
  const pendingApprovals = await prisma.approval.findMany({
    where: { status: "pending" },
    include: { sourceTeam: { select: { departmentType: true } } },
    orderBy: { createdAt: "asc" },
  });

  for (const approval of pendingApprovals) {
    const ageHours = (now.getTime() - approval.createdAt.getTime()) / 3_600_000;
    const risk = approval.riskLevel as RiskLevel;

    // 3. Auto-approve low-risk internal approvals past delay threshold
    if (
      risk === "low" &&
      ageHours >= AUTO_APPROVE_HOURS &&
      !containsExternalKeyword(approval.title, approval.description)
    ) {
      await prisma.approval.update({
        where: { id: approval.id },
        data:  {
          status:        "auto_approved",
          autoApprovedAt: now,
          approvedAt:    now,
        },
      });

      await auditLog("approval", approval.id, "auto_approved", {
        riskLevel:        risk,
        ageHours:         Math.round(ageHours),
        title:            approval.title,
        autoApproveHours: AUTO_APPROVE_HOURS,
      });

      autoApproved++;
      continue;
    }

    // 4. Escalate high-risk approvals sitting for > 3 days without escalation
    if (
      (risk === "high" || risk === "critical") &&
      ageHours > 72 &&
      !approval.escalatedAt
    ) {
      await prisma.approval.update({
        where: { id: approval.id },
        data:  { escalatedAt: now },
      });

      await auditLog("approval", approval.id, "approval_escalated", {
        riskLevel: risk,
        ageHours:  Math.round(ageHours),
        title:     approval.title,
      });

      escalated++;
    }
  }

  return { scored, autoApproved, escalated };
}

// ── Summary for briefing ─────────────────────────────────────────────

export async function getApprovalTriageSummary(): Promise<{
  totalPending:    number;
  critical:        number;
  high:            number;
  medium:          number;
  low:             number;
  autoApprovedToday: number;
  oldestAgeDays:   number | null;
}> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [byCounts, autoApprovedToday, oldest] = await Promise.all([
    prisma.approval.groupBy({
      by: ["riskLevel"],
      where: { status: "pending" },
      _count: { id: true },
    }).catch(() => [] as Array<{ riskLevel: string; _count: { id: number } }>),
    prisma.approval.count({
      where: { status: "auto_approved", autoApprovedAt: { gte: startOfDay } },
    }).catch(() => 0),
    prisma.approval.findFirst({
      where:   { status: "pending" },
      orderBy: { createdAt: "asc" },
      select:  { createdAt: true },
    }).catch(() => null),
  ]);

  const countByLevel = Object.fromEntries(byCounts.map(r => [r.riskLevel, r._count.id]));
  const totalPending = Object.values(countByLevel).reduce((s, c) => s + c, 0);
  const oldestAgeDays = oldest
    ? Math.floor((Date.now() - oldest.createdAt.getTime()) / 86_400_000)
    : null;

  return {
    totalPending,
    critical:          countByLevel["critical"] ?? 0,
    high:              countByLevel["high"]     ?? 0,
    medium:            countByLevel["medium"]   ?? 0,
    low:               countByLevel["low"]      ?? 0,
    autoApprovedToday,
    oldestAgeDays,
  };
}
