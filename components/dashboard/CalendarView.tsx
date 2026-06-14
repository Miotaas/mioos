"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { Calendar, CheckSquare, Clock, Plus, Plug } from "lucide-react";

interface CalEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  source: "calendar" | "task";
}

function isToday(date: string): boolean {
  const d = new Date(date), t = new Date();
  return d.getFullYear() === t.getFullYear()
    && d.getMonth() === t.getMonth()
    && d.getDate() === t.getDate();
}

function isTomorrow(date: string): boolean {
  const d = new Date(date), t = new Date();
  t.setDate(t.getDate() + 1);
  return d.getFullYear() === t.getFullYear()
    && d.getMonth() === t.getMonth()
    && d.getDate() === t.getDate();
}

function isThisWeek(date: string): boolean {
  const d = new Date(date), now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  return d >= now && d <= end;
}

function fmtTime(date: string): string {
  return new Date(date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function fmtDay(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function CalendarView() {
  const { setActiveView } = useAppStore();
  const [calEvents, setCalEvents] = useState<CalEvent[]>([]);
  const [taskEvents, setTaskEvents] = useState<CalEvent[]>([]);
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/connectors/calendar")
      .then(r => r.json())
      .then(data => {
        if (data?.status === "connected" || data?.status === "configured") {
          setConnected(true);
          const events: CalEvent[] = (data.events ?? []).map((e: {
            id?: string; title?: string; summary?: string;
            start?: string; dtstart?: string; end?: string; dtend?: string; allDay?: boolean;
          }) => ({
            id:     e.id ?? String(Math.random()),
            title:  e.title ?? e.summary ?? "Event",
            start:  e.start ?? e.dtstart ?? new Date().toISOString(),
            end:    e.end ?? e.dtend,
            allDay: e.allDay,
            source: "calendar" as const,
          }));
          setCalEvents(events);
        } else {
          setConnected(false);
        }
      })
      .catch(() => setConnected(false));
  }, []);

  useEffect(() => {
    fetch("/api/tasks")
      .then(r => r.json())
      .catch(() => [])
      .then(data => {
        const tasks = Array.isArray(data) ? data : [];
        const events: CalEvent[] = tasks
          .filter((t: { dueDate?: string; status?: string }) => t.dueDate && t.status !== "done")
          .map((t: { id: string; title: string; dueDate: string }) => ({
            id:     `task-${t.id}`,
            title:  t.title,
            start:  t.dueDate,
            source: "task" as const,
          }));
        setTaskEvents(events);
      });
  }, []);

  const allEvents = [...calEvents, ...taskEvents].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  const todayEvents    = allEvents.filter(e => isToday(e.start));
  const tomorrowEvents = allEvents.filter(e => isTomorrow(e.start));
  const laterEvents    = allEvents.filter(e => !isToday(e.start) && !isTomorrow(e.start) && isThisWeek(e.start));

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[900px] mx-auto px-5 md:px-10 py-8 md:py-12 pb-28 md:pb-12">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] text-text-ghost font-medium tracking-[0.12em] uppercase mb-2">
            Calendar
          </p>
          <h1 className="text-[32px] md:text-[40px] font-semibold text-text-primary tracking-tight leading-tight mb-1">
            Agenda
          </h1>
          <p className="text-[14px] text-text-muted">{today}</p>
        </div>

        {/* Connect CTA */}
        {connected === false && (
          <div className="rounded-2xl border border-dashed border-white/[0.08] p-8 text-center mb-8">
            <Calendar className="w-6 h-6 text-text-ghost mx-auto mb-3 opacity-30" />
            <p className="text-[14px] text-text-secondary font-medium mb-1">Connect your calendar</p>
            <p className="text-[12px] text-text-muted mb-4 max-w-sm mx-auto">
              See meetings, deadlines, and tasks in one place. Supports Google Calendar, iCal, and CalDAV.
            </p>
            <button
              onClick={() => setActiveView("settings")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] text-[12px] font-medium hover:bg-[#00D4FF]/15 transition-all"
            >
              <Plug className="w-3.5 h-3.5" />
              Connect in Settings
            </button>
          </div>
        )}

        {/* Today */}
        <Section label="Today" events={todayEvents} emptyText={connected ? "No events today" : "No tasks due today"} />

        {/* Tomorrow */}
        {tomorrowEvents.length > 0 && (
          <Section label="Tomorrow" events={tomorrowEvents} />
        )}

        {/* This week */}
        {laterEvents.length > 0 && (
          <Section label="Later this week" events={laterEvents} />
        )}

        {/* No events at all */}
        {todayEvents.length === 0 && tomorrowEvents.length === 0 && laterEvents.length === 0 && connected !== false && (
          <div className="py-16 text-center">
            <Calendar className="w-7 h-7 text-text-ghost mx-auto mb-3 opacity-20" />
            <p className="text-[13px] text-text-muted">No upcoming events or tasks.</p>
          </div>
        )}

        {/* Add tasks CTA */}
        <div className="mt-8 flex items-center justify-between py-4 px-5 rounded-2xl border border-white/[0.04] bg-[#0d1220]">
          <div>
            <p className="text-[13px] text-text-secondary font-medium">Add to your schedule</p>
            <p className="text-[11px] text-text-muted mt-0.5">Tasks with due dates appear here automatically</p>
          </div>
          <button
            onClick={() => setActiveView("tasks")}
            className="flex items-center gap-2 text-[12px] text-[#00D4FF] hover:opacity-80 transition-opacity font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Add task
          </button>
        </div>

      </div>
    </div>
  );
}

function Section({
  label, events, emptyText,
}: {
  label: string;
  events: CalEvent[];
  emptyText?: string;
}) {
  return (
    <div className="mb-7">
      <p className="text-[10px] text-text-ghost uppercase tracking-[0.12em] font-medium mb-3">{label}</p>
      {events.length === 0 ? (
        emptyText ? <p className="text-[12px] text-text-ghost pl-1">{emptyText}</p> : null
      ) : (
        <div className="space-y-2">
          {events.map(ev => (
            <div
              key={ev.id}
              className={cn(
                "flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-colors",
                ev.source === "calendar"
                  ? "border-[#00D4FF]/[0.08] bg-[#00D4FF]/[0.02]"
                  : "border-white/[0.05] bg-[#0d1220]"
              )}
            >
              <div className="w-12 flex-shrink-0 text-center">
                {ev.allDay ? (
                  <span className="text-[10px] text-text-ghost">All day</span>
                ) : ev.source === "task" ? (
                  <CheckSquare className="w-3.5 h-3.5 text-text-ghost mx-auto" />
                ) : (
                  <span className="text-[12px] font-mono text-[#00D4FF]/70">{fmtTime(ev.start)}</span>
                )}
              </div>
              <div className={cn("w-px h-7 flex-shrink-0", ev.source === "calendar" ? "bg-[#00D4FF]/20" : "bg-white/[0.06]")} />
              <p className={cn("text-[13px] flex-1 leading-snug", ev.source === "calendar" ? "text-text-primary" : "text-text-secondary")}>
                {ev.title}
              </p>
              {ev.source === "task" && (
                <span className="text-[9px] text-text-ghost uppercase tracking-wide flex-shrink-0">task</span>
              )}
              {ev.source === "calendar" && !isToday(ev.start) && (
                <span className="text-[10px] text-text-ghost flex-shrink-0">{fmtDay(ev.start)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
