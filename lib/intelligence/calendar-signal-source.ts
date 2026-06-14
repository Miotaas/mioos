/**
 * Calendar Signal Source
 *
 * Reads upcoming events from iCal feed and stores them as IntelligenceSignals.
 * Rate control: CALENDAR_INTERVAL_HOURS (default 4) — avoids redundant fetches.
 */

import type { ISignalSource, IntelligenceSignalData } from "./provider";
import { prisma } from "@/lib/db";
import { isCalendarConfigured } from "@/lib/connectors/calendar";

const CALENDAR_INTERVAL_H = Number(process.env.CALENDAR_INTERVAL_HOURS ?? "4");
const STATE_KEY           = "runtime:calendarLastRun";

export function createCalendarSignalSource(): ISignalSource {
  return {
    name:         "calendar",
    signalType:   "calendar",
    isConfigured: isCalendarConfigured,

    fetch: async (): Promise<IntelligenceSignalData[]> => {
      // Rate limiting check
      const lastRunRec = await prisma.runtimeState.findUnique({
        where: { key: STATE_KEY },
      }).catch(() => null);
      if (lastRunRec) {
        const hoursSince = (Date.now() - new Date(lastRunRec.value).getTime()) / 3_600_000;
        if (hoursSince < CALENDAR_INTERVAL_H) return [];
      }

      await prisma.runtimeState.upsert({
        where:  { key: STATE_KEY },
        create: { key: STATE_KEY, value: new Date().toISOString() },
        update: { value: new Date().toISOString() },
      });

      try {
        const events = await fetchUpcomingEvents();
        if (events.length === 0) return [];

        const now = new Date();
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);

        const todayEvents    = events.filter(e => e.start < todayEnd);
        const tomorrowEvents = events.filter(e => e.start >= todayEnd && e.start < tomorrowEnd);

        const signals: IntelligenceSignalData[] = [];

        if (todayEvents.length > 0) {
          signals.push({
            signalType: "calendar",
            source:     "ical",
            title:      `${todayEvents.length} event(s) today`,
            content:    todayEvents.map(e => `• ${formatEventTime(e.start)}: ${e.title}`).join("\n"),
            metadata:   { eventCount: todayEvents.length, period: "today" },
          });
        }

        if (tomorrowEvents.length > 0) {
          signals.push({
            signalType: "calendar",
            source:     "ical",
            title:      `${tomorrowEvents.length} event(s) tomorrow`,
            content:    tomorrowEvents.map(e => `• ${formatEventTime(e.start)}: ${e.title}`).join("\n"),
            metadata:   { eventCount: tomorrowEvents.length, period: "tomorrow" },
          });
        }

        // Surface overdue preparation: meetings in the next 2h with no prep notes
        const urgentMeetings = events.filter(e => {
          const minutesUntil = (e.start.getTime() - now.getTime()) / 60_000;
          return minutesUntil > 0 && minutesUntil < 120;
        });
        if (urgentMeetings.length > 0) {
          signals.push({
            signalType: "calendar",
            source:     "ical",
            title:      `Meeting in < 2h: ${urgentMeetings[0].title}`,
            content:    `Meeting starting at ${formatEventTime(urgentMeetings[0].start)}. Consider preparing notes or agenda.`,
            metadata:   { urgent: true },
          });
        }

        return signals;
      } catch (err) {
        console.error("[calendar-signals] Failed to fetch:", err);
        return [];
      }
    },
  };
}

interface CalendarEvent { title: string; start: Date }

async function fetchUpcomingEvents(): Promise<CalendarEvent[]> {
  const url = process.env.CALENDAR_ICAL_URL!;
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!res.ok) throw new Error(`iCal fetch failed: ${res.status}`);

    const text   = await res.text();
    const events: CalendarEvent[] = [];
    const now    = new Date();
    const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const block of text.split("BEGIN:VEVENT").slice(1)) {
      const summaryMatch  = block.match(/^SUMMARY[^:]*:(.+)$/m);
      const dtStartMatch  = block.match(/^DTSTART[^:]*:(\d{8}(?:T\d{6}Z?)?)/m);
      if (!summaryMatch || !dtStartMatch) continue;

      const title = summaryMatch[1].trim().replace(/\\,/g, ",").replace(/\\n/g, " ");
      const raw   = dtStartMatch[1];
      const start = raw.length === 8
        ? new Date(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`)
        : new Date(raw.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, "$1-$2-$3T$4:$5:$6Z"));

      if (start >= now && start <= horizon) events.push({ title, start });
    }

    return events.sort((a, b) => a.start.getTime() - b.start.getTime());
  } finally {
    clearTimeout(timeout);
  }
}

function formatEventTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
