/**
 * Reply detection (Acquire Customer Loop — the hottest revenue signal).
 *
 * Capability autonomy: 🟢 Autonomous. Read-only inbox match — no external impact,
 * no new decision authority. Matches inbound senders to sent outreach drafts,
 * marks the draft replied, advances the prospect to "interested", and surfaces
 * the reply for the founder to act on. Reuses the existing IMAP reader.
 *
 * Idempotent: a matched draft is set to "replied" and excluded from the next scan.
 */
import { prisma } from "@/lib/db";
import { isEmailConfigured, fetchRecentEmailHeaders } from "@/lib/connectors/email";

// Stages at/after "interested" — don't regress them.
const ADVANCED = ["interested", "demo", "pilot", "proposal_sent", "won", "lost"];

function extractEmail(from: string): string | null {
  const m = from.match(/<([^>]+)>/);
  const addr = (m ? m[1] : from).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr) ? addr : null;
}

export async function detectReplies(): Promise<{ scanned: number; replies: number }> {
  const out = { scanned: 0, replies: 0 };
  if (!isEmailConfigured()) return out;

  const sent = await prisma.emailDraft.findMany({
    where: { status: "sent", recipientEmail: { not: null } },
    select: { id: true, recipientEmail: true },
  });
  if (sent.length === 0) return out;

  // lowercased sender → { draftId, email (original case) }
  const awaiting = new Map<string, { draftId: string; email: string }>();
  for (const d of sent) if (d.recipientEmail) awaiting.set(d.recipientEmail.toLowerCase(), { draftId: d.id, email: d.recipientEmail });

  const headers = await fetchRecentEmailHeaders(30);
  out.scanned = headers.length;
  const handled = new Set<string>();

  for (const h of headers) {
    const sender = extractEmail(h.from);
    if (!sender || handled.has(sender)) continue;
    const hit = awaiting.get(sender);
    if (!hit) continue;
    handled.add(sender);

    await prisma.emailDraft.update({ where: { id: hit.draftId }, data: { status: "replied" } });

    const prospect = await prisma.prospect.findFirst({ where: { email: hit.email } });
    if (prospect && !ADVANCED.includes(prospect.status)) {
      await prisma.prospect.update({ where: { id: prospect.id }, data: { status: "interested" } });
    }

    await prisma.intelligenceSignal.create({
      data: {
        signalType: "email",
        source: "reply",
        title: `Reply from ${prospect?.companyName ?? sender} — respond`,
        content: `${prospect?.companyName ?? sender} replied to your outreach ("${h.subject.slice(0, 80)}"). Prospect moved to "interested". Founder: respond / book a call.`,
        metadata: JSON.stringify({ email: hit.email, prospectId: prospect?.id ?? null, subject: h.subject.slice(0, 120) }),
      },
    });
    out.replies++;
  }
  return out;
}
