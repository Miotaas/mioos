/**
 * Calendar Connector — READ ONLY
 *
 * Reads upcoming events from an iCal feed for executive awareness.
 * Required env var: CALENDAR_ICAL_URL (public or authenticated iCal URL)
 *
 * Safety invariants (hard-coded, never bypassed):
 *   - NEVER creates, edits, or deletes events
 *   - NEVER sends invites or RSVPs
 *   - Only reads upcoming event metadata (title, start time)
 */

import { prisma } from "@/lib/db";

export function isCalendarConfigured(): boolean {
  return !!process.env.CALENDAR_ICAL_URL;
}

export function getCalendarConnectorStatus(): { connected: boolean; message: string } {
  if (!isCalendarConfigured()) {
    return {
      connected: false,
      message: "Not configured. Set CALENDAR_ICAL_URL (iCal feed URL).",
    };
  }
  return { connected: true, message: "iCal feed configured." };
}

interface CalendarEvent {
  title: string;
  start: Date;
}

async function fetchICalEvents(): Promise<CalendarEvent[]> {
  const url = process.env.CALENDAR_ICAL_URL!;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`iCal fetch failed: ${res.status}`);

  const text = await res.text();
  const events: CalendarEvent[] = [];
  const now = new Date();
  const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const blocks = text.split("BEGIN:VEVENT").slice(1);
  for (const block of blocks) {
    const summaryMatch = block.match(/^SUMMARY[^:]*:(.+)$/m);
    const dtStartMatch = block.match(/^DTSTART[^:]*:(\d{8}(?:T\d{6}Z?)?)/m);
    if (!summaryMatch || !dtStartMatch) continue;

    const title = summaryMatch[1].trim().replace(/\\,/g, ",").replace(/\\n/g, " ");
    const raw = dtStartMatch[1];
    let start: Date;
    if (raw.length === 8) {
      start = new Date(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`);
    } else {
      start = new Date(raw.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, "$1-$2-$3T$4:$5:$6Z"));
    }

    if (start >= now && start <= horizon) events.push({ title, start });
  }

  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export async function fetchCalendarInsight(agentId?: string): Promise<string> {
  if (!isCalendarConfigured()) {
    const record = await prisma.calendarInsight.create({
      data: {
        agentId: agentId ?? null,
        todayEvents: 0,
        upcomingEvents: 0,
        summary: "Calendar connector not configured. Set CALENDAR_ICAL_URL.",
      },
    });
    return record.id;
  }

  try {
    const events = await fetchICalEvents();
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const todayEvents = events.filter(e => e.start < todayEnd).length;
    const upcomingEvents = events.length;
    const nextDeadline = events[0]
      ? `${events[0].title} on ${events[0].start.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}`
      : null;
    const summary = upcomingEvents > 0
      ? `${todayEvents} event${todayEvents !== 1 ? "s" : ""} today, ${upcomingEvents} upcoming in 30 days. Next: ${nextDeadline ?? "—"}.`
      : "No upcoming events in the next 30 days.";

    const record = await prisma.calendarInsight.create({
      data: { agentId: agentId ?? null, todayEvents, upcomingEvents, nextDeadline, summary },
    });
    return record.id;
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    const record = await prisma.calendarInsight.create({
      data: {
        agentId: agentId ?? null,
        todayEvents: 0,
        upcomingEvents: 0,
        summary: `Calendar fetch failed: ${error}`,
      },
    });
    return record.id;
  }
}
