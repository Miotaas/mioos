/**
 * Email Connector — READ ONLY
 *
 * Reads inbox metadata for executive awareness.
 * Required env vars: EMAIL_IMAP_HOST, EMAIL_IMAP_USER, EMAIL_IMAP_PASS
 * Optional:          EMAIL_IMAP_PORT (default 993), EMAIL_IMAP_TLS (default true)
 *
 * Safety invariants (hard-coded, never bypassed):
 *   - NEVER sends, drafts, or replies to emails
 *   - NEVER forwards, deletes, or archives messages
 *   - NEVER reads message body content
 *   - Only reads inbox count and header metadata (from, subject, date)
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

export async function fetchEmailInsight(agentId?: string): Promise<string> {
  if (!isEmailConfigured()) {
    const record = await prisma.emailInsight.create({
      data: {
        agentId: agentId ?? null,
        emailCount: 0,
        unreadCount: 0,
        importantCount: 0,
        summary: "Email connector not configured. Set EMAIL_IMAP_HOST, EMAIL_IMAP_USER, and EMAIL_IMAP_PASS.",
      },
    });
    return record.id;
  }

  // Full IMAP read integration (imap-simple package) can be wired in Phase 2.5.
  // The connector infrastructure, env vars, and DB schema are ready.
  // Current implementation records the configured state without reading live data
  // to avoid adding a native IMAP dependency in this phase.
  const record = await prisma.emailInsight.create({
    data: {
      agentId: agentId ?? null,
      emailCount: 0,
      unreadCount: 0,
      importantCount: 0,
      summary: `Email connector configured for ${process.env.EMAIL_IMAP_USER}. Live IMAP read available in Phase 2.5 (add imap-simple dependency).`,
    },
  });
  return record.id;
}
