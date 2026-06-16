"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { normalizeTask } from "@/lib/normalize";
import {
  WorkforceApproval, ApprovalQueueItem, MioProject, MioTask,
  RevenueEntry, UnifiedDraft, Assignment, WorkforceTeam, MioGoal, WorkforceOutput,
} from "@/types";
import {
  Sun, AlertCircle, ChevronRight, Calendar,
  TrendingUp, Zap, ArrowRight, RefreshCw,
  X, Users2,
  CheckSquare,
} from "lucide-react";

// ── helpers ─────────────────────────────────────────────────────────

function isToday(s: string | null | undefined): boolean {
  if (!s) return false;
  const d = new Date(s), t = new Date();
  return d.getFullYear() === t.getFullYear() &&
         d.getMonth() === t.getMonth() &&
         d.getDate() === t.getDate();
}

function fmtEuro(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `€${(n / 1_000).toFixed(0)}k`;
  return `€${Math.round(n)}`;
}

function fmtTime(s: string): string {
  return new Date(s).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(s: string): string {
  const mins = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (mins < 60)   return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

// ── morning brief ────────────────────────────────────────────────────

function buildBrief(
  pendingCount: number,
  blockedProjects: string[],
  liveMRR: number,
  topFocus: string,
): string {
  const parts: string[] = [];

  if (pendingCount > 0)
    parts.push(`${pendingCount} approval${pendingCount > 1 ? "s are" : " is"} waiting for your review`);

  if (blockedProjects.length > 0) {
    const names = blockedProjects.slice(0, 2).join(" and ");
    parts.push(`${names} ${blockedProjects.length > 1 ? "are" : "is"} blocked and need${blockedProjects.length > 1 ? "" : "s"} your attention`);
  }

  if (liveMRR > 0)
    parts.push(`Revenue is tracking at ${fmtEuro(liveMRR)} MRR`);

  if (topFocus)
    parts.push(`Your highest-leverage action today is ${topFocus.toLowerCase()}`);

  if (parts.length === 0)
    return "Nothing urgent today. A clean slate — use it to push something important forward.";

  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1) + ".").join(" ");
}

function buildCatchUpBrief(
  pendingCount: number,
  allProjects: MioProject[],
  allRevEntries: RevenueEntry[],
  allDrafts: UnifiedDraft[],
  allAssignments: Assignment[],
): string {
  const parts: string[] = [];

  if (pendingCount > 0)
    parts.push(`${pendingCount} item${pendingCount > 1 ? "s are" : " is"} waiting for your decision`);

  const newOutputs = allDrafts.filter(d => d.status === "review_needed").length;
  if (newOutputs > 0)
    parts.push(`${newOutputs} draft${newOutputs > 1 ? "s" : ""} ready for review`);

  const reviewWork = allAssignments.filter(a => a.status === "review").length;
  if (reviewWork > 0)
    parts.push(`${reviewWork} assignment${reviewWork > 1 ? "s" : ""} awaiting your approval`);

  const blocked = allProjects.filter(p => p.status === "blocked");
  if (blocked.length > 0)
    parts.push(`${blocked.length === 1 ? blocked[0].name + " is" : `${blocked.length} projects are`} still blocked`);

  const totalRev = allRevEntries.filter(e => e.revenueType === "live" && e.status === "active").reduce((s, e) => s + e.amount, 0);
  if (totalRev > 0)
    parts.push(`revenue is at ${totalRev >= 1000 ? `€${Math.round(totalRev / 1000)}k` : `€${Math.round(totalRev)}`} MRR`);

  if (parts.length === 0)
    return "Nothing changed while you were away. You have a clean slate.";

  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1) + ".").join(" ");
}

// ── types ────────────────────────────────────────────────────────────

interface CalEvent {
  id: string;
  title: string;
  start: string;
  allDay?: boolean;
  source: "calendar" | "task";
}

type AttnType = "wf_approval" | "agent_approval" | "blocker";

interface AttnItem {
  id: string;
  type: AttnType;
  title: string;
  sub: string;
  urgency: number;
}

// ── main ─────────────────────────────────────────────────────────────

export function TodayView() {
  const { setActiveView, showToast } = useAppStore();

  // ── data state ─────────────────────────────────────────────────────
  const [wfApprovals,  setWfApprovals]  = useState<WorkforceApproval[]>([]);
  const [approvals,    setApprovals]    = useState<ApprovalQueueItem[]>([]);
  const [projects,     setProjects]     = useState<MioProject[]>([]);
  const [tasks,        setTasks]        = useState<MioTask[]>([]);
  const [revEntries,   setRevEntries]   = useState<RevenueEntry[]>([]);
  const [drafts,       setDrafts]       = useState<UnifiedDraft[]>([]);
  const [reviewAssignments, setRevAssignments] = useState<Assignment[]>([]);
  const [calEvents,    setCalEvents]    = useState<CalEvent[]>([]);
  const [calConnected, setCalConn]      = useState<boolean | null>(null);
  const [execRecs,     setExecRecs]     = useState<{ id: string; title: string; priority: string }[]>([]);
  const [teams,        setTeams]        = useState<WorkforceTeam[]>([]);

  // catch-up mode (shown when returning after >24h)
  const [catchUpMode, setCatchUpMode] = useState(false);
  // personal goals for life signals in agenda
  const [lifeGoals, setLifeGoals] = useState<MioGoal[]>([]);
  const [teamOutputs, setTeamOutputs] = useState<WorkforceOutput[]>([]);

  // brief refresh key
  const [briefKey, setBriefKey] = useState(0);
  // dispatch modal
  const [dispatchOpen, setDispatchOpen] = useState(false);
  // tracks whether initial data load has completed
  const [loaded, setLoaded] = useState(false);

  // ── fetch ───────────────────────────────────────────────────────────
  const load = useCallback(() => {
    Promise.all([
      fetch("/api/workforce-approvals").then(r => r.json()).catch(() => []),
      fetch("/api/approvals").then(r => r.json()).catch(() => []),
      fetch("/api/projects").then(r => r.json()).catch(() => []),
      fetch("/api/tasks").then(r => r.json()).catch(() => []),
      fetch("/api/revenue-entries").then(r => r.json()).catch(() => []),
      fetch("/api/drafts?limit=8").then(r => r.json()).catch(() => []),
      fetch("/api/assignments?status=review").then(r => r.json()).catch(() => []),
      fetch("/api/workforce/teams").then(r => r.json()).catch(() => []),
      fetch("/api/goals").then(r => r.json()).catch(() => []),
      fetch("/api/workforce/outputs?limit=10").then(r => r.json()).catch(() => []),
    ]).then(([wfa, ap, pr, tk, re, dr, rv, tm, gl, outs]) => {
      setWfApprovals(Array.isArray(wfa) ? wfa.filter((a: WorkforceApproval) => a.status === "pending") : []);
      setApprovals(Array.isArray(ap) ? ap.filter((a: ApprovalQueueItem) => a.status === "pending") : []);
      setProjects(Array.isArray(pr) ? pr.filter((p: MioProject) => ["active","paused","blocked"].includes(p.status)) : []);
      setTasks(Array.isArray(tk) ? tk.map(normalizeTask) : []);
      setRevEntries(Array.isArray(re) ? re : []);
      setDrafts(Array.isArray(dr) ? dr : []);
      setRevAssignments(Array.isArray(rv) ? rv : []);
      setTeams(Array.isArray(tm) ? tm.filter((t: WorkforceTeam) => t.status === "active") : []);
      const personalGoals = Array.isArray(gl) ? gl.filter((g: MioGoal) => g.goalType === "personal" && g.status !== "achieved" && g.status !== "abandoned") : [];
      setLifeGoals(personalGoals);
      const recentOutputs = Array.isArray(outs)
        ? outs
          .filter((o: WorkforceOutput) => ["completed", "approved", "in_review"].includes(o.status))
          .sort((a: WorkforceOutput, b: WorkforceOutput) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
        : [];
      setTeamOutputs(recentOutputs);
      setLoaded(true);

      // Track last visit for catch-up mode
      try {
        const lastVisit = localStorage.getItem("mioos-last-visit");
        const now = Date.now();
        if (lastVisit) {
          const hoursSince = (now - parseInt(lastVisit, 10)) / (1000 * 60 * 60);
          if (hoursSince > 24) {
            setCatchUpMode(true);
          }
        }
        localStorage.setItem("mioos-last-visit", String(now));
      } catch { /* localStorage not available in SSR */ }
    });

    fetch("/api/executive/recommendations")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setExecRecs(d.slice(0, 3)); })
      .catch(() => {});

    fetch("/api/connectors/calendar")
      .then(r => r.json())
      .then(data => {
        if (data?.status === "connected" || data?.status === "configured") {
          setCalConn(true);
          const events: CalEvent[] = (data.events ?? []).map((e: {
            id?: string; title?: string; summary?: string;
            start?: string; dtstart?: string; allDay?: boolean;
          }) => ({
            id:     e.id ?? String(Math.random()),
            title:  e.title ?? e.summary ?? "Event",
            start:  e.start ?? e.dtstart ?? new Date().toISOString(),
            allDay: e.allDay,
            source: "calendar" as const,
          }));
          setCalEvents(events);
        } else {
          setCalConn(false);
        }
      })
      .catch(() => setCalConn(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── derived data ────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  // Attention items — merge wf approvals + agent approvals + blocked projects
  const attnItems: AttnItem[] = [
    ...wfApprovals.map(a => ({
      id:      a.id,
      type:    "wf_approval" as AttnType,
      title:   a.title,
      sub:     `${a.sourceTeam?.name ?? "Team"} · ${a.decisionType.replace(/_/g, " ")}`,
      urgency: a.priority === "urgent" ? 100 : a.priority === "high" ? 80 : 60,
    })),
    ...approvals.map(a => ({
      id:      a.id,
      type:    "agent_approval" as AttnType,
      title:   a.proposedAction.length > 80 ? a.proposedAction.slice(0, 80) + "…" : a.proposedAction,
      sub:     `${a.agentRun?.agent?.name ?? "Agent"} · awaiting decision`,
      urgency: 70,
    })),
    ...projects
      .filter(p => p.status === "blocked")
      .map(p => ({
        id:      `blocker_${p.id}`,
        type:    "blocker" as AttnType,
        title:   `${p.name} is blocked`,
        sub:     p.blocker ?? "Needs your attention",
        urgency: 90,
      })),
  ]
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, 3);

  const totalPending = wfApprovals.length + approvals.length;

  // Personal agenda — calendar events + tasks due today
  const todayTasks = tasks.filter(t => isToday(t.dueDate) && t.status !== "done" && t.status !== "cancelled");
  const todayCalEvents = calEvents.filter(e => isToday(e.start));
  const now48h = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const lifeSignals: CalEvent[] = lifeGoals
    .filter(g => g.targetDate && new Date(g.targetDate) <= now48h)
    .map(g => ({
      id: `life_${g.id}`,
      title: `Goal: ${g.title}`,
      start: g.targetDate!,
      source: "task" as const,
    }));

  const agendaItems: CalEvent[] = [
    ...todayCalEvents,
    ...todayTasks.map(t => ({
      id: `task_${t.id}`, title: t.title,
      start: t.dueDate!, source: "task" as const,
    })),
    ...lifeSignals,
  ].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  // Focus — top executive recommendation or derived
  const topRec = execRecs[0];

  // Revenue signal
  const liveEntries     = revEntries.filter(e => e.revenueType === "live" && e.status === "active");
  const pipelineEntries = revEntries.filter(e => e.revenueType === "pipeline" && e.status === "active");
  const closedEntries   = revEntries.filter(e => e.status === "closed_won").sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const liveMRR         = liveEntries.reduce((s, e) => s + e.amount, 0);
  const pipeline        = pipelineEntries.reduce((s, e) => s + e.amount * ((e.probability ?? 100) / 100), 0);
  const latestClose     = closedEntries[0] ?? null;

  // AI outputs — review-needed drafts + assignments in review
  const aiOutputs: { id: string; team: string; type: string; title: string; source: "draft" | "assignment" }[] = [
    ...drafts
      .filter(d => d.status === "review_needed")
      .slice(0, 5)
      .map(d => ({
        id:     d.id,
        team:   d.sourceTeamName ?? "AI Team",
        type:   d.draftType,
        title:  d.title,
        source: "draft" as const,
      })),
    ...reviewAssignments
      .slice(0, 3)
      .map(a => ({
        id:     a.id,
        team:   a.team?.name ?? "AI Team",
        type:   "assignment",
        title:  a.title,
        source: "assignment" as const,
      })),
  ].slice(0, 7);

  // brief
  const blockedNames = projects.filter(p => p.status === "blocked").map(p => p.name);
  const brief = buildBrief(totalPending, blockedNames, liveMRR, topRec?.title ?? "");

  // ── render ───────────────────────────────────────────────────────────
  const hasRightContent = teamOutputs.length > 0 || revEntries.length > 0 || aiOutputs.length > 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1440px] mx-auto px-5 md:px-8 py-6 pb-24 md:pb-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-7 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sun className="w-4 h-4 text-accent-amber opacity-70" />
              <p className="text-[11px] text-text-ghost font-medium tracking-[0.1em] uppercase">
                Today · {today}
              </p>
            </div>
            <h1 className="text-[28px] md:text-[36px] font-semibold text-text-primary tracking-tight leading-none">
              {new Date().toLocaleDateString("en-GB", { weekday: "long" })}
            </h1>
          </div>
          <button
            onClick={() => setDispatchOpen(true)}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] text-[13px] font-medium hover:bg-[#00D4FF]/15 transition-all"
          >
            <Zap className="w-3.5 h-3.5" />
            Dispatch Work
          </button>
        </div>

        {/* 2-column grid — collapses to single column when right side is empty */}
        <div className={cn(
          "grid grid-cols-1 gap-5",
          hasRightContent && "lg:grid-cols-[42fr_58fr]"
        )}>

          {/* ── LEFT COLUMN ─────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Catch-up mode banner */}
            {catchUpMode && loaded && (
              <div className="rounded-2xl bg-accent-amber/[0.06] border border-accent-amber/20 p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-accent-amber flex-shrink-0" />
                    <p className="text-[13px] font-semibold text-accent-amber">Since you were away</p>
                  </div>
                  <button
                    onClick={() => setCatchUpMode(false)}
                    className="p-1 rounded text-accent-amber/60 hover:text-accent-amber transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[13px] text-text-secondary leading-relaxed">
                  {buildCatchUpBrief(totalPending, projects, revEntries, drafts, reviewAssignments)}
                </p>
              </div>
            )}

            {/* 1. Today Brief + Focus (merged) */}
            <div className="rounded-2xl bg-[#0d1220] border border-white/[0.05] p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <p className="text-[11px] text-text-ghost">
                  {!loaded
                    ? ""
                    : totalPending > 0
                    ? `${totalPending} decision${totalPending > 1 ? "s" : ""} require attention today`
                    : "All clear today"}
                </p>
                <button
                  onClick={() => { load(); setBriefKey(k => k + 1); }}
                  className="p-1.5 rounded-lg text-text-ghost hover:text-text-muted transition-colors flex-shrink-0"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <p key={briefKey} className="text-[15px] md:text-[16px] text-text-secondary leading-relaxed">
                {brief}
              </p>

              {/* Recommended action */}
              <div className="mt-5 pt-4 border-t border-white/[0.04]">
                {topRec ? (
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] text-text-ghost uppercase tracking-[0.08em] mb-1">Focus</p>
                      <p className="text-[13px] text-text-primary font-medium leading-snug truncate">{topRec.title}</p>
                    </div>
                    <button
                      onClick={() => setActiveView("drafts")}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] text-[12px] font-medium hover:bg-[#00D4FF]/15 transition-all"
                    >
                      Start <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ) : attnItems.length > 0 ? (
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] text-text-ghost uppercase tracking-[0.08em] mb-1">Focus</p>
                      <p className="text-[13px] text-text-primary font-medium leading-snug truncate">{attnItems[0].title}</p>
                    </div>
                    <button
                      onClick={() => setActiveView("drafts")}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-amber/10 border border-accent-amber/20 text-accent-amber text-[12px] font-medium hover:bg-accent-amber/15 transition-all"
                    >
                      Review <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveView("projects")}
                    className="flex items-center gap-1.5 text-[12px] text-text-ghost hover:text-text-muted transition-colors"
                  >
                    Open Projects <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Attention — max 3 items, Review-only, no inline decisions */}
            {attnItems.length > 0 && (
              <div className="rounded-2xl bg-[#0d1220] border border-white/[0.05] overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.04] flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-accent-amber" />
                  <span className="text-[13px] font-semibold text-text-primary">Attention</span>
                  {totalPending > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-accent-amber/15 text-accent-amber text-[10px] font-bold">
                      {totalPending}
                    </span>
                  )}
                </div>
                <div className="divide-y divide-white/[0.03]">
                  {attnItems.map(item => (
                    <div key={item.id} className="flex items-center gap-4 px-6 py-4">
                      <div className={cn(
                        "w-[3px] h-8 rounded-full flex-shrink-0",
                        item.type === "blocker" ? "bg-accent-red" : "bg-accent-amber"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-text-primary font-medium leading-snug truncate">{item.title}</p>
                        <p className="text-[11px] text-text-ghost mt-0.5">{item.sub}</p>
                      </div>
                      <button
                        onClick={() => setActiveView("drafts")}
                        className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-text-secondary text-[11px] font-medium hover:bg-white/[0.07] hover:text-text-primary transition-all"
                      >
                        Review <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                {totalPending > 3 && (
                  <div className="px-6 py-3 border-t border-white/[0.04]">
                    <button
                      onClick={() => setActiveView("drafts")}
                      className="text-[12px] text-text-ghost hover:text-text-muted transition-colors flex items-center gap-1"
                    >
                      View all {totalPending} pending items <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 3. Personal Agenda */}
            <div className="rounded-2xl bg-[#0d1220] border border-white/[0.05] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-accent-cyan" />
                  <span className="text-[13px] font-semibold text-text-primary">Personal Agenda</span>
                </div>
                <button
                  onClick={() => setActiveView("calendar")}
                  className="text-[11px] text-text-ghost hover:text-text-muted transition-colors flex items-center gap-1"
                >
                  Open Calendar <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="p-5">
                {calConnected === false && agendaItems.length === 0 ? (
                  <button
                    onClick={() => setActiveView("settings")}
                    className="flex items-center gap-1.5 text-[12px] text-text-ghost hover:text-text-muted transition-colors py-1"
                  >
                    Connect your calendar <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : agendaItems.length === 0 ? (
                  <p className="text-[13px] text-text-muted py-2">No events or tasks due today.</p>
                ) : (
                  <div className="space-y-2">
                    {agendaItems.slice(0, 6).map(item => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center gap-3 px-3.5 py-2.5 rounded-xl border",
                          item.source === "calendar"
                            ? "border-[#00D4FF]/[0.08] bg-[#00D4FF]/[0.02]"
                            : "border-white/[0.04]"
                        )}
                      >
                        <div className="w-9 flex-shrink-0 text-center">
                          {item.source === "task" ? (
                            <CheckSquare className="w-3.5 h-3.5 text-text-ghost mx-auto" />
                          ) : item.allDay ? (
                            <span className="text-[9px] text-text-ghost">All day</span>
                          ) : (
                            <span className="text-[11px] font-mono text-[#00D4FF]/70">{fmtTime(item.start)}</span>
                          )}
                        </div>
                        <div className={cn("w-px h-5 flex-shrink-0", item.source === "calendar" ? "bg-[#00D4FF]/20" : "bg-white/[0.06]")} />
                        <p className={cn(
                          "text-[13px] flex-1 leading-snug truncate",
                          item.source === "calendar" ? "text-text-primary" : "text-text-secondary"
                        )}>
                          {item.title}
                        </p>
                        {item.source === "task" && (
                          <span className="text-[9px] text-text-ghost uppercase tracking-wide flex-shrink-0">task</span>
                        )}
                      </div>
                    ))}
                    {agendaItems.length > 6 && (
                      <button
                        onClick={() => setActiveView("calendar")}
                        className="text-[11px] text-text-ghost hover:text-text-muted transition-colors pl-1 flex items-center gap-1"
                      >
                        +{agendaItems.length - 6} more <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>


          </div>

          {/* ── RIGHT COLUMN ─────────────────────────────────────── */}
          <div className="space-y-5">

            {/* 5. Team Activity — shown when teams have recent outputs */}
            {teamOutputs.length > 0 && (
              <div className="rounded-2xl bg-[#0d1220] border border-white/[0.05] overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users2 className="w-3.5 h-3.5 text-accent-cyan" />
                    <span className="text-[13px] font-semibold text-text-primary">Team Activity</span>
                  </div>
                  <button
                    onClick={() => setActiveView("teams")}
                    className="text-[11px] text-text-ghost hover:text-text-muted transition-colors flex items-center gap-1"
                  >
                    All teams <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="divide-y divide-white/[0.03]">
                  {teamOutputs.map(o => {
                    const statusCls =
                      o.status === "completed" || o.status === "approved" ? "bg-accent-green" :
                      o.status === "in_review" ? "bg-accent-amber" : "bg-text-ghost";
                    return (
                      <div key={o.id} className="flex items-center gap-4 px-6 py-3.5">
                        <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", statusCls)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-text-ghost mb-0.5">
                            {o.team?.name ?? "AI Team"} · {o.outputType.replace(/_/g, " ")}
                          </p>
                          <p className="text-[13px] text-text-secondary font-medium leading-snug truncate">{o.title}</p>
                        </div>
                        <span className="text-[10px] text-text-ghost flex-shrink-0 tabular-nums">
                          {timeAgo(o.createdAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 6. Revenue Insight — only shown when there is data */}
            {revEntries.length > 0 && (
              <div className="rounded-2xl bg-[#0d1220] border border-white/[0.05] p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-accent-green" />
                    <span className="text-[13px] font-semibold text-text-primary">Revenue Insight</span>
                  </div>
                  <button
                    onClick={() => setActiveView("revenue")}
                    className="text-[11px] text-text-ghost hover:text-text-muted transition-colors flex items-center gap-1"
                  >
                    Details <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Direction narrative */}
                <p className="text-[13px] text-text-secondary leading-relaxed mb-5">
                  {liveMRR > 0 && pipeline > 0
                    ? `${fmtEuro(liveMRR)} running monthly with ${fmtEuro(pipeline)} in qualified pipeline. ${latestClose ? `Most recent close: ${latestClose.title}.` : ""}`
                    : liveMRR > 0
                    ? `${fmtEuro(liveMRR)} in active monthly revenue across ${liveEntries.length} contract${liveEntries.length !== 1 ? "s" : ""}. No pipeline staged yet.`
                    : pipeline > 0
                    ? `${fmtEuro(pipeline)} in pipeline — no live revenue yet. Close one to start compounding.`
                    : "Revenue tracked but no active contracts or pipeline. Add entries to see your position."}
                </p>

                {/* Numbers */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.04]">
                  <div>
                    <p className="text-[10px] text-text-ghost uppercase tracking-[0.08em] mb-1">Monthly Revenue</p>
                    <p className="text-[22px] font-bold font-mono text-accent-green leading-none">
                      {liveMRR > 0 ? fmtEuro(liveMRR) : "€0"}
                    </p>
                    {liveEntries.length > 0 && (
                      <p className="text-[11px] text-text-ghost mt-0.5">{liveEntries.length} active</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] text-text-ghost uppercase tracking-[0.08em] mb-1">Pipeline</p>
                    <p className="text-[22px] font-semibold font-mono text-text-primary leading-none">
                      {pipeline > 0 ? fmtEuro(pipeline) : "—"}
                    </p>
                    {pipelineEntries.length > 0 && (
                      <p className="text-[11px] text-text-ghost mt-0.5">{pipelineEntries.length} open</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 7. Ready for Review — only shown when team work is waiting */}
            {aiOutputs.length > 0 && (
              <div className="rounded-2xl bg-[#0d1220] border border-white/[0.05] overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users2 className="w-3.5 h-3.5 text-accent-cyan" />
                    <span className="text-[13px] font-semibold text-text-primary">Ready for Review</span>
                    <span className="px-1.5 py-0.5 rounded bg-accent-cyan/10 text-accent-cyan text-[10px] font-bold">
                      {aiOutputs.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveView("drafts")}
                    className="text-[11px] text-text-ghost hover:text-text-muted transition-colors flex items-center gap-1"
                  >
                    Review all <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="divide-y divide-white/[0.03]">
                  {aiOutputs.map(item => (
                    <div key={item.id} className="flex items-start gap-3 px-6 py-3.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan flex-shrink-0 mt-[5px]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-text-ghost mb-0.5">
                          {item.team} · {item.type.replace(/_/g, " ")}
                        </p>
                        <p className="text-[13px] text-text-secondary leading-snug truncate">{item.title}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                        <button
                          onClick={() => setActiveView("drafts")}
                          className="px-2.5 py-1 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-[11px] font-medium hover:bg-accent-cyan/15 transition-all"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Quick Dispatch Modal */}
      {dispatchOpen && (
        <QuickDispatchModal
          teams={teams}
          projects={projects}
          onClose={() => setDispatchOpen(false)}
          onDispatched={() => {
            setDispatchOpen(false);
            showToast("Work dispatched", "success");
            load();
          }}
        />
      )}
    </div>
  );
}

// ── QuickDispatchModal ───────────────────────────────────────────────

function QuickDispatchModal({
  teams, projects, onClose, onDispatched,
}: {
  teams: WorkforceTeam[];
  projects: MioProject[];
  onClose: () => void;
  onDispatched: () => void;
}) {
  const [prompt,    setPrompt]    = useState("");
  const [teamId,    setTeamId]    = useState("");
  const [projectId, setProjectId] = useState("");
  const [loading,   setLoading]   = useState(false);

  async function dispatch() {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const body: Record<string, string> = { title: prompt.trim() };
      if (teamId)    body.teamId    = teamId;
      if (projectId) body.projectId = projectId;

      const r = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, priority: "medium", senderType: "operator" }),
      });

      if (r.ok) {
        onDispatched();
      } else {
        const err = await r.json().catch(() => ({}));
        console.error("[dispatch]", err);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-[#0d1220] border border-white/[0.08] rounded-2xl shadow-2xl p-6">

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#00D4FF]" />
            <h2 className="text-[15px] font-semibold text-text-primary">Dispatch Work</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-ghost hover:text-text-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] text-text-ghost uppercase tracking-[0.08em] mb-2">
              What do you need?
            </label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. Find 3 competitors to Mail Co-Pilot with pricing and positioning analysis"
              rows={4}
              className="w-full bg-[#080d1a] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-text-primary placeholder:text-text-ghost resize-none focus:outline-none focus:border-[#00D4FF]/30 transition-colors leading-relaxed"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-text-ghost uppercase tracking-[0.08em] mb-2">
                Team (optional)
              </label>
              <select
                value={teamId}
                onChange={e => setTeamId(e.target.value)}
                className="w-full bg-[#080d1a] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[13px] text-text-secondary focus:outline-none focus:border-[#00D4FF]/30 transition-colors"
              >
                <option value="">Auto-route</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-text-ghost uppercase tracking-[0.08em] mb-2">
                Project (optional)
              </label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full bg-[#080d1a] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[13px] text-text-secondary focus:outline-none focus:border-[#00D4FF]/30 transition-colors"
              >
                <option value="">None</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={dispatch}
              disabled={!prompt.trim() || loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00D4FF]/15 border border-[#00D4FF]/25 text-[#00D4FF] text-[13px] font-medium hover:bg-[#00D4FF]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Zap className="w-3.5 h-3.5" />
              {loading ? "Dispatching…" : "Dispatch"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/[0.07] text-text-ghost text-[13px] hover:bg-white/[0.03] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
