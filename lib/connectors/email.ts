/**
 * Email Connector — READ ONLY
 *
 * Reads inbox metadata for executive awareness via IMAP.
 * Required env vars: EMAIL_IMAP_HOST, EMAIL_IMAP_USER, EMAIL_IMAP_PASS
 * Optional:          EMAIL_IMAP_PORT (default 993), EMAIL_IMAP_TLS (default "true")
 *
 * Safety invariants (hard-coded, never bypassed):
 *   - NEVER sends, drafts, or replies to emails
 *   - NEVER forwards, deletes, moves, or archives messages
 *   - NEVER marks messages as read (uses PEEK)
 *   - Only reads envelope metadata (from, subject, date) — no message body
 */

import { prisma } from "@/lib/db";

export function isEmailConfigured(): boolean {
  return !!(
    process.env.EMAIL_IMAP_HOST &&
    process.env.EMAIL_IMAP_USER &&
    process.env.EMAIL_IMAP_PASS
  );
}

export function getEmailConnectorStatus(): { connected: boolean; message: string } {
  if (!isEmailConfigured()) {
    return {
      connected: false,
      message: "Not configured. Set EMAIL_IMAP_HOST, EMAIL_IMAP_USER, EMAIL_IMAP_PASS.",
    };
  }
  return {
    connected: true,
    message: `Configured for ${process.env.EMAIL_IMAP_USER}`,
  };
}

export interface EmailHeader {
  from:       string;
  subject:    string;
  receivedAt: Date;
  uid:        number;
}

export async function fetchRecentEmailHeaders(maxMessages = 20): Promise<EmailHeader[]> {
  if (!isEmailConfigured()) return [];

  try {
    // Dynamic import — imapflow is a server-side-only dependency
    const { ImapFlow } = await import("imapflow") as { ImapFlow: new (config: unknown) => {
      connect(): Promise<void>;
      logout(): Promise<void>;
      getMailboxLock(mailbox: string): Promise<{ release: () => void }>;
      search(criteria: unknown, options?: unknown): Promise<number[]>;
      fetchOne(uid: number, fields: unknown, options?: unknown): Promise<{
        envelope?: {
          from?: Array<{ name?: string; address?: string }>;
          subject?: string;
          date?: Date;
        };
      } | null>;
    }};

    const client = new ImapFlow({
      host:   process.env.EMAIL_IMAP_HOST!,
      port:   Number(process.env.EMAIL_IMAP_PORT ?? "993"),
      secure: process.env.EMAIL_IMAP_TLS !== "false",
      auth: {
        user: process.env.EMAIL_IMAP_USER!,
        pass: process.env.EMAIL_IMAP_PASS!,
      },
      logger: false,
    });

    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      // Search for messages received in the last 24h
      const since = new Date(Date.now() - 86_400_000);
      const uids  = await client.search({ since }, { uid: true });

      const recent = uids.slice(-maxMessages); // last N messages
      const headers: EmailHeader[] = [];

      for (const uid of recent) {
        const msg = await client.fetchOne(uid, { envelope: true }, { uid: true });
        if (!msg?.envelope) continue;

        const fromField = msg.envelope.from?.[0];
        const from = fromField
          ? (fromField.name ? `${fromField.name} <${fromField.address ?? ""}>` : (fromField.address ?? "unknown"))
          : "unknown";

        headers.push({
          from,
          subject:    msg.envelope.subject ?? "(no subject)",
          receivedAt: msg.envelope.date ?? new Date(),
          uid,
        });
      }

      return headers.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
    } finally {
      lock.release();
      await client.logout();
    }
  } catch (err) {
    console.error("[email-connector] IMAP fetch failed:", err);
    return [];
  }
}

// ── Keywords that flag an email as important ─────────────────────────

const IMPORTANCE_KEYWORDS = [
  "urgent", "action required", "invoice", "payment", "contract",
  "proposal", "meeting", "deadline", "demo", "pilot", "renewal",
  "issue", "problem", "error", "failed",
];

export function classifyImportance(subject: string, from: string): "normal" | "important" {
  const text = `${subject} ${from}`.toLowerCase();
  return IMPORTANCE_KEYWORDS.some(kw => text.includes(kw)) ? "important" : "normal";
}

export async function fetchEmailInsight(agentId?: string): Promise<string> {
  if (!isEmailConfigured()) {
    const record = await prisma.emailInsight.create({
      data: {
        agentId:        agentId ?? null,
        emailCount:     0,
        unreadCount:    0,
        importantCount: 0,
        summary: "Email connector not configured. Set EMAIL_IMAP_HOST, EMAIL_IMAP_USER, and EMAIL_IMAP_PASS.",
      },
    });
    return record.id;
  }

  try {
    const headers        = await fetchRecentEmailHeaders(20);
    const emailCount     = headers.length;
    const importantCount = headers.filter(h => classifyImportance(h.subject, h.from) === "important").length;

    const topSubjects = headers.slice(0, 5).map(h =>
      `• ${h.from.split("<")[0].trim()}: ${h.subject.slice(0, 60)}`
    ).join("\n");

    const summary = emailCount > 0
      ? `${emailCount} recent email(s) in the last 24h. ${importantCount} flagged as important.\n${topSubjects}`
      : "No recent emails in the last 24h.";

    const record = await prisma.emailInsight.create({
      data: {
        agentId:        agentId ?? null,
        emailCount,
        unreadCount:    emailCount,
        importantCount,
        summary,
      },
    });
    return record.id;
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    const record = await prisma.emailInsight.create({
      data: {
        agentId:        agentId ?? null,
        emailCount:     0,
        unreadCount:    0,
        importantCount: 0,
        summary:        `Email fetch failed: ${error}`,
      },
    });
    return record.id;
  }
}
