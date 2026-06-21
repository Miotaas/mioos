/**
 * Phase A — outbound action executor.
 *
 * Drains approved outreach EmailDrafts and sends them for real. Called once
 * per runtime tick (no new orchestration system). Reuses existing models:
 *   Approval        — the mandatory authorization gate (status must be "approved")
 *   EmailDraft      — the message + the send-once lock (status transition)
 *   ExecutionHistory — append-only audit row per send attempt
 *   ActionResult    — one row per approval (approvalId @unique) = idempotency anchor
 *   Opportunity     — advanced to "selling" when its outreach goes out
 *
 * Safety invariants:
 *   - Nothing sends unless its Approval.status === "approved".
 *   - A draft is claimed atomically (draft|ready -> sending); only the claimer sends.
 *   - SMTP misconfiguration fails loudly and is recorded — never a silent success.
 */
import { prisma } from "@/lib/db";
import { sendEmail, isSmtpConfigured, isValidEmail } from "@/lib/actions/email-send";

const BATCH_SIZE = Math.max(1, Number(process.env.OUTBOUND_EMAIL_BATCH ?? "10"));

// Opportunity statuses at/after "selling" — don't regress them.
const ADVANCED_OPP_STATUSES = [
  "selling", "demo", "pilot", "deployment", "live", "revenue_generating", "rejected", "archived",
];

export interface OutboundSummary {
  scanned: number;
  sent: number;
  failed: number;
  skipped: number;
}

function bodyToText(body: string | null | undefined): string {
  return (body ?? "").replace(/\r\n/g, "\n").trim();
}

export async function processOutboundEmail(): Promise<OutboundSummary> {
  const summary: OutboundSummary = { scanned: 0, sent: 0, failed: 0, skipped: 0 };

  // Candidate drafts: not yet sent, linked to an approval.
  const candidates = await prisma.emailDraft.findMany({
    where: {
      status: { in: ["draft", "ready"] },
      sourceApprovalId: { not: null },
    },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });
  summary.scanned = candidates.length;
  if (candidates.length === 0) return summary;

  // Load linked approvals; only "approved" ones are eligible (mandatory gate).
  const approvalIds = Array.from(
    new Set(candidates.map((d) => d.sourceApprovalId).filter((x): x is string => Boolean(x))),
  );
  const approvals = await prisma.approval.findMany({
    where: { id: { in: approvalIds } },
    select: { id: true, status: true },
  });
  const approvedIds = new Set(approvals.filter((a) => a.status === "approved").map((a) => a.id));

  for (const draft of candidates) {
    const approvalId = draft.sourceApprovalId as string;

    // Gate 1 — approval is mandatory.
    if (!approvedIds.has(approvalId)) { summary.skipped++; continue; }

    // Gate 2 — recipient must be a valid address (executor-only recipient sourcing).
    if (!isValidEmail(draft.recipientEmail)) { summary.skipped++; continue; }

    // Send-once lock: atomically claim the draft. Only one worker wins.
    const claim = await prisma.emailDraft.updateMany({
      where: { id: draft.id, status: { in: ["draft", "ready"] } },
      data: { status: "sending" },
    });
    if (claim.count !== 1) { summary.skipped++; continue; }

    const exec = await prisma.executionHistory.create({
      data: {
        approvalId,
        agentId: "workforce",
        actionType: "email.send",
        actionPayload: JSON.stringify({
          draftId: draft.id,
          to: draft.recipientEmail,
          subject: draft.subject ?? draft.title,
          opportunityId: draft.opportunityId ?? null,
        }),
        status: "pending",
      },
    });

    try {
      if (!isSmtpConfigured()) {
        throw new Error("SMTP not configured — cannot send approved outreach");
      }

      const { messageId } = await sendEmail({
        to: draft.recipientEmail as string,
        subject: (draft.subject?.trim() || draft.title),
        text: bodyToText(draft.body),
      });

      await prisma.emailDraft.update({ where: { id: draft.id }, data: { status: "sent" } });
      await prisma.executionHistory.update({
        where: { id: exec.id },
        data: { status: "executed", executedAt: new Date() },
      });
      await prisma.actionResult.upsert({
        where: { approvalId },
        update: {
          actionType: "email.send",
          status: "sent",
          title: `Outreach sent to ${draft.recipientEmail}`,
          description: `messageId: ${messageId}`,
          targetType: "email_draft",
          targetId: draft.id,
          error: null,
        },
        create: {
          approvalId,
          actionType: "email.send",
          status: "sent",
          title: `Outreach sent to ${draft.recipientEmail}`,
          description: `messageId: ${messageId}`,
          targetType: "email_draft",
          targetId: draft.id,
        },
      });

      if (draft.opportunityId) {
        await prisma.opportunity.updateMany({
          where: { id: draft.opportunityId, status: { notIn: ADVANCED_OPP_STATUSES } },
          data: { status: "selling" },
        });
      }

      summary.sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown send error";

      await prisma.emailDraft.update({ where: { id: draft.id }, data: { status: "failed" } });
      await prisma.executionHistory.update({
        where: { id: exec.id },
        data: { status: "failed", error: message, executedAt: new Date() },
      });
      await prisma.actionResult.upsert({
        where: { approvalId },
        update: {
          actionType: "email.send",
          status: "failed",
          title: "Outreach send failed",
          targetType: "email_draft",
          targetId: draft.id,
          error: message,
        },
        create: {
          approvalId,
          actionType: "email.send",
          status: "failed",
          title: "Outreach send failed",
          targetType: "email_draft",
          targetId: draft.id,
          error: message,
        },
      });

      summary.failed++;
    }
  }

  return summary;
}
