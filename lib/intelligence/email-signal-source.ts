/**
 * Email Signal Source
 *
 * Reads recent IMAP email headers and stores important ones as IntelligenceSignals.
 * Rate control: EMAIL_INTERVAL_HOURS (default 1).
 * Safety: read-only, stores only sender+subject+date metadata.
 */

import type { ISignalSource, IntelligenceSignalData } from "./provider";
import { prisma } from "@/lib/db";
import { isEmailConfigured, fetchRecentEmailHeaders, classifyImportance } from "@/lib/connectors/email";

const EMAIL_INTERVAL_H = Number(process.env.EMAIL_INTERVAL_HOURS ?? "1");
const STATE_KEY        = "runtime:emailLastRun";

export function createEmailSignalSource(): ISignalSource {
  return {
    name:         "email",
    signalType:   "email",
    isConfigured: isEmailConfigured,

    fetch: async (): Promise<IntelligenceSignalData[]> => {
      // Rate limiting check
      const lastRunRec = await prisma.runtimeState.findUnique({
        where: { key: STATE_KEY },
      }).catch(() => null);
      if (lastRunRec) {
        const hoursSince = (Date.now() - new Date(lastRunRec.value).getTime()) / 3_600_000;
        if (hoursSince < EMAIL_INTERVAL_H) return [];
      }

      await prisma.runtimeState.upsert({
        where:  { key: STATE_KEY },
        create: { key: STATE_KEY, value: new Date().toISOString() },
        update: { value: new Date().toISOString() },
      });

      const headers = await fetchRecentEmailHeaders(20);
      if (headers.length === 0) return [];

      const signals: IntelligenceSignalData[] = [];

      // Group into: important and normal summary
      const important = headers.filter(h => classifyImportance(h.subject, h.from) === "important");
      const total      = headers.length;

      if (important.length > 0) {
        const list = important.slice(0, 5).map(h =>
          `• ${h.from.split("<")[0].trim()}: ${h.subject.slice(0, 60)}`
        ).join("\n");

        signals.push({
          signalType: "email",
          source:     "imap",
          title:      `${important.length} important email(s) requiring attention`,
          content:    list,
          metadata:   { importantCount: important.length, totalCount: total },
        });
      }

      if (total > 0) {
        signals.push({
          signalType: "email",
          source:     "imap",
          title:      `${total} recent email(s) in the last 24h`,
          content:    headers.slice(0, 5).map(h =>
            `• ${h.receivedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} — ${h.from.split("<")[0].trim()}: ${h.subject.slice(0, 50)}`
          ).join("\n"),
          metadata:   { totalCount: total },
        });
      }

      return signals;
    },
  };
}
