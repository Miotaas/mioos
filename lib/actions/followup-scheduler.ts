/**
 * Follow-up scheduler (Acquire Customer Loop). B2B deals are won in follow-up.
 *
 * For sent outreach with no reply after N days, auto-generate a follow-up draft
 * and queue a founder approval. Capped per prospect.
 *
 * Autonomy split:
 *   - drafting + queuing the follow-up = 🟢 Autonomous (no external impact)
 *   - SENDING the follow-up            = 🟠 Founder-only (temporary) — external
 *     contact, gated via approve_outreach. Becomes autonomous once reply/complaint
 *     rates over N sends justify raising the autonomy level (decision autonomy).
 *
 * Idempotent: a followed-up draft is marked "followed_up" and excluded next scan.
 */
import { prisma } from "@/lib/db";

export async function scheduleFollowups(): Promise<{ scanned: number; queued: number; closed: number }> {
  const out = { scanned: 0, queued: 0, closed: 0 };
  const afterDays = Number(process.env.FOLLOWUP_AFTER_DAYS ?? "3");
  const maxFollowups = Number(process.env.MAX_FOLLOWUPS ?? "2");
  const cutoff = new Date(Date.now() - afterDays * 86_400_000);

  const stale = await prisma.emailDraft.findMany({
    where: { status: "sent", recipientEmail: { not: null }, updatedAt: { lt: cutoff } },
    take: 20,
  });
  out.scanned = stale.length;
  if (stale.length === 0) return out;

  const bu = await prisma.businessUnit.findUnique({ where: { slug: "ai-ventures" } }).catch(() => null);
  const team = await prisma.workforceTeam.findFirst({ where: { slug: { in: ["automation-revenue", "website-revenue", "sales"] } }, select: { id: true } });

  for (const draft of stale) {
    const email = draft.recipientEmail as string;
    // Cap total touches per prospect.
    const touches = await prisma.emailDraft.count({ where: { recipientEmail: email } });
    if (touches > maxFollowups) {
      await prisma.emailDraft.update({ where: { id: draft.id }, data: { status: "closed_no_reply" } });
      out.closed++;
      continue;
    }

    const prospect = await prisma.prospect.findFirst({ where: { email } });
    const body = prospect?.followupDraft
      ?? `Hi ${prospect?.companyName ?? "there"},\n\nFollowing up on my note — still happy to show a quick before/after. Worth 15 minutes this week?\n\nBest,\nMio`;

    // New sendable follow-up draft (recipient-bearing) + founder approval to send.
    const approval = await prisma.approval.create({
      data: {
        title: `Approve follow-up — ${prospect?.companyName ?? email}`,
        description: `Send a follow-up to ${email} (${touches} prior touch(es)).`,
        reason: "No reply to prior outreach — follow-up.",
        status: "pending", decisionType: "approve_outreach", riskLevel: "low",
        businessUnitId: bu?.id ?? null,
        relatedOutputId: team ? (await prisma.workforceOutput.create({ data: { teamId: team.id, businessUnitId: bu?.id ?? null, title: `Follow-up: ${prospect?.companyName ?? email}`, content: body, outputType: "prospect", status: "in_review" } })).id : null,
      },
    });
    await prisma.emailDraft.create({
      data: { title: `Follow-up: ${prospect?.companyName ?? email}`, subject: `Following up — ${prospect?.companyName ?? "quick idea"}`, body, recipientName: prospect?.companyName ?? null, recipientEmail: email, status: "draft", sourceApprovalId: approval.id },
    });
    // Mark the original so we don't re-schedule it.
    await prisma.emailDraft.update({ where: { id: draft.id }, data: { status: "followed_up" } });
    out.queued++;
  }
  return out;
}
