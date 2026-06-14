"use client";

import { useEffect, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { normalizeTask, normalizeGoal, isOverdue } from "@/lib/normalize";
import { useAppStore } from "@/store/appStore";
import { MioTask, MioGoal, Agent, ApprovalQueueItem, CommerceOpportunity, AgentRun, RevenueEntry, MioProject, WorkforceTeam, WorkforceApproval, Assignment } from "@/types";
import {
  ChevronRight, ArrowRight, Bot, CheckCircle2,
  Calendar, TrendingUp, Target, FolderOpen,
  CheckSquare, AlertCircle, Plus, Plug, Zap,
  Activity, Server,
} from "lucide-react";

// ── types ─────────────────────────────────────────────────────────
interface LiveDashboardData {
  todayPriority: string;
  runtimeStatus: {
    status: "running" | "stale" | "offline";
    lastHeartbeat: string | null;
    loopCount: number;
    queueDepth: number;
    queueRunning: number;
    queueCompleted24h: number;
    queueFailed24h: number;
  };
  actionRequired: { id: string; title: string; priority: string; reason?: string; viewTarget?: string }[];
  workforceActivity: {
    queued: number;
    running: number;
    completedToday: number;
    outputsToday: number;
  };
  projectRisks: {
    name: string;
    status: string;
    health: string;
    score: number;
    blocker: string | null;
    nextAction: string | null;
    reasons: string[];
  }[];
  revenueMovement: {
    live: number;
    pipeline: number;
    potential: number;
    atRisk: { title: string; amount: number; reason: string }[];
    fastestPath: { title: string; amount: number; action: string } | null;
  };
  lastUpdated: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  source: "calendar" | "task" | "goal";
  view?: ReturnType<typeof useAppStore.getState>["activeView"];
}

type RunWithAgent = AgentRun & { agentName: string; agentType?: string };

// ── helpers ──────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function fmtEuro(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `€${(n / 1_000).toFixed(0)}k`;
  return `€${Math.round(n)}`;
}

function isToday(date: string | null | undefined): boolean {
  if (!date) return false;
  const d = new Date(date), t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

function isTomorrow(date: string): boolean {
  const d = new Date(date), t = new Date();
  t.setDate(t.getDate() + 1);
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

function isThisWeek(date: string): boolean {
  const d = new Date(date);
  const now = new Date();
  const weekOut = new Date(now);
  weekOut.setDate(weekOut.getDate() + 7);
  return d >= now && d <= weekOut;
}

function fmtEventTime(date: string): string {
  return new Date(date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function fmtFeedTime(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMins < 1)    return "just now";
  if (diffMins < 60)   return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function buildNarrativeSummary(
  dueTodayCount: number,
  overdueCount: number,
  pendingApprovals: number,
  openOpp: number,
): string {
  const parts: string[] = [];
  if (overdueCount > 0)
    parts.push(`${overdueCount} overdue task${overdueCount > 1 ? "s" : ""}`);
  if (dueTodayCount > 0)
    parts.push(`${dueTodayCount} task${dueTodayCount > 1 ? "s" : ""} due today`);
  if (openOpp > 0)
    parts.push(`${openOpp} open opportunit${openOpp > 1 ? "ies" : "y"}`);
  if (pendingApprovals > 0)
    parts.push(`${pendingApprovals} approval${pendingApprovals > 1 ? "s" : ""} waiting`);

  if (parts.length === 0)
    return "Nothing urgent. A good day to push things forward.";
  if (parts.length === 1)
    return `You have ${parts[0]}.`;
  const last = parts.pop()!;
  return `You have ${parts.join(", ")}, and ${last}.`;
}

function describeRun(r: RunWithAgent): string {
  const t = r.agentType ?? "";
  if (r.status === "running") {
    if (t === "sales")     return "is actively scanning for prospects";
    if (t === "research")  return "is conducting market research";
    if (t === "strategy")  return "is updating your strategic brief";
    return "is working";
  }
  if (r.status === "failed") return "encountered an error — may need attention";
  if (r.status === "completed") {
    if (t === "sales")       return "found new prospects";
    if (t === "research")    return "completed a research task";
    if (t === "strategy")    return "updated the strategic brief";
    if (t === "executive")   return "reviewed active goals";
    if (t === "fulfillment") return "completed a delivery task";
    if (t === "outreach")    return "drafted outreach campaign";
    return "completed a task";
  }
  return "was scheduled";
}

// ── main ─────────────────────────────────────────────────────────
export function DashboardHome() {
  const { setActiveView } = useAppStore();

  const [tasks, setTasks]           = useState<MioTask[]>([]);
  const [goals, setGoals]           = useState<MioGoal[]>([]);
  const [agents, setAgents]         = useState<Agent[]>([]);
  const [approvals, setApprovals]   = useState<ApprovalQueueItem[]>([]);
  const [opportunities, setOpp]     = useState<CommerceOpportunity[]>([]);
  const [revenueEntries, setRevEntries]   = useState<RevenueEntry[]>([]);
  const [realProjects, setRealProjects]   = useState<MioProject[]>([]);
  const [teams, setTeams]                 = useState<WorkforceTeam[]>([]);
  const [wfApprovals, setWfApprovals]     = useState<WorkforceApproval[]>([]);
  const [assignments, setAssignments]     = useState<Assignment[]>([]);
  const [calEvents, setCalEvents]         = useState<CalendarEvent[]>([]);
  const [calConnected, setCalConn]        = useState<boolean | null>(null);
  const [execRecs, setExecRecs]           = useState<{ id: string; title: string; priority: string; viewTarget?: string }[]>([]);
  const [liveData, setLiveData]           = useState<LiveDashboardData | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/tasks").then(r => r.json()).catch(() => []),
      fetch("/api/goals").then(r => r.json()).catch(() => []),
      fetch("/api/projects").then(r => r.json()).catch(() => []),
    ]).then(([t, g, p]) => {
      setTasks((Array.isArray(t) ? t : []).map(normalizeTask));
      setGoals((Array.isArray(g) ? g : []).map(normalizeGoal));
      setRealProjects(Array.isArray(p) ? p : []);
    });
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/agents").then(r => r.json()).catch(() => []),
      fetch("/api/approvals").then(r => r.json()).catch(() => []),
      fetch("/api/commerce/opportunities").then(r => r.json()).catch(() => []),
      fetch("/api/revenue-entries").then(r => r.json()).catch(() => []),
      fetch("/api/workforce/teams").then(r => r.json()).catch(() => []),
      fetch("/api/workforce-approvals").then(r => r.json()).catch(() => []),
      fetch("/api/assignments").then(r => r.json()).catch(() => []),
    ]).then(([ag, ap, opp, rev, tm, wap, ass]) => {
      setAgents(Array.isArray(ag) ? ag : []);
      setApprovals(Array.isArray(ap) ? ap : []);
      setOpp(Array.isArray(opp) ? opp : []);
      setRevEntries(Array.isArray(rev) ? rev : []);
      setTeams(Array.isArray(tm) ? tm : []);
      setWfApprovals(Array.isArray(wap) ? wap : []);
      setAssignments(Array.isArray(ass) ? ass : []);
    });
  }, []);

  useEffect(() => {
    fetch("/api/executive/recommendations")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setExecRecs(d.slice(0, 5)); })
      .catch(() => {});
  }, []);

  // Live dashboard polling — every 12 seconds
  useEffect(() => {
    const fetchLive = () => {
      fetch("/api/dashboard/live")
        .then(r => r.json())
        .then((d: LiveDashboardData) => {
          if (d && !("error" in d)) {
            setLiveData(d);
            // Keep exec recs in sync with live action required
            if (Array.isArray(d.actionRequired)) {
              setExecRecs(d.actionRequired.slice(0, 5));
            }
          }
        })
        .catch(() => {});
    };
    fetchLive();
    const id = setInterval(fetchLive, 12_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/connectors/calendar")
      .then(r => r.json())
      .then(data => {
        if (data?.status === "connected" || data?.status === "configured") {
          setCalConn(true);
          const events: CalendarEvent[] = (data.events ?? []).map((e: {
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
          setCalConn(false);
        }
      })
      .catch(() => setCalConn(false));
  }, []);

  // ── derived data ─────────────────────────────────────────────
  const now              = new Date();
  const openTasks        = tasks.filter(t => t.status !== "done" && t.status !== "cancelled");
  const overdueTasks     = openTasks.filter(t => isOverdue(t.dueDate));
  const dueTodayTasks    = openTasks.filter(t => isToday(t.dueDate) && !isOverdue(t.dueDate));
  const completedToday   = tasks.filter(t => t.status === "done" && isToday(t.completedAt));
  const activeGoals      = goals.filter(g => g.status === "active");
  const activeProjects      = realProjects.filter(p => p.status === "active" || p.status === "paused");
  const pendingApprovals    = approvals.filter(a => a.status === "pending");
  const pendingWfApprovals  = wfApprovals.filter(a => a.status === "pending");
  const totalPending        = pendingApprovals.length + pendingWfApprovals.length;
  const activeAgents        = agents.filter(a => a.status === "active");
  const activeTeams         = teams.filter(t => t.status === "active");
  const activeOpp           = opportunities.filter(o => !["archived", "rejected"].includes(o.status));

  // Revenue — primary source: RevenueEntry (Phase 2); fallback: CommerceOpportunity
  const liveRevEntries      = revenueEntries.filter(e => e.revenueType === "live" && e.status === "active");
  const pipelineRevEntries  = revenueEntries.filter(e => e.revenueType === "pipeline" && e.status === "active");
  const potentialRevEntries = revenueEntries.filter(e => e.revenueType === "potential" && e.status === "active");
  const liveMRR             = liveRevEntries.reduce((s, e) => s + e.amount, 0);
  const pipelineValue       = pipelineRevEntries.reduce((s, e) => s + e.amount * ((e.probability ?? 100) / 100), 0)
                            + potentialRevEntries.reduce((s, e) => s + e.amount * ((e.probability ?? 50) / 100), 0);
  const oppPipelineValue    = opportunities
    .filter(o => ["approved", "testing", "live"].includes(o.status))
    .reduce((s, o) => s + (o.estimatedRevenue ?? 0), 0);
  const displayPipeline     = revenueEntries.length > 0 ? pipelineValue : oppPipelineValue;
  const openRevenueCount    = revenueEntries.length > 0
    ? liveRevEntries.length + pipelineRevEntries.length + potentialRevEntries.length
    : activeOpp.length;

  // agent feed
  const recentRuns: RunWithAgent[] = agents
    .flatMap(a => (a.runs ?? []).map(r => ({ ...r, agentName: a.name, agentType: a.agentType })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  type FeedItem = {
    id: string; agentName: string; action: string;
    status: string; time: string; urgent?: boolean; approvalId?: string;
  };

  // Assignment activity for feed
  const assignmentFeedItems: FeedItem[] = assignments
    .filter(a => !["archived", "pending"].includes(a.status))
    .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())
    .slice(0, 8)
    .map(a => ({
      id:        `ass_${a.id}`,
      agentName: a.team?.name ?? "AI Team",
      action:    a.status === "completed" ? `completed "${a.title}"` :
                 a.status === "active"    ? `is working on "${a.title}"` :
                 a.status === "review"    ? `submitted "${a.title}" for review` :
                 `started "${a.title}"`,
      status:    a.status === "completed" ? "completed" :
                 a.status === "active"    ? "running" :
                 a.status === "review"    ? "pending" : "pending",
      time:      a.completedAt ?? a.startedAt ?? a.createdAt,
      urgent:    a.status === "review",
    }));

  const feedItems: FeedItem[] = [
    ...pendingApprovals.map(a => ({
      id:        a.id,
      agentName: a.agentRun?.agent?.name ?? "Agent",
      action:    "is requesting approval",
      status:    "pending",
      time:      a.createdAt,
      urgent:    true,
      approvalId: a.id,
    })),
    ...pendingWfApprovals.map(a => ({
      id:        `wf_${a.id}`,
      agentName: a.sourceTeam?.name ?? "Team",
      action:    `needs approval: ${a.title}`,
      status:    "pending",
      time:      a.createdAt,
      urgent:    true,
    })),
    ...assignmentFeedItems,
    ...recentRuns.map(r => ({
      id:        r.id,
      agentName: r.agentName,
      action:    describeRun(r),
      status:    r.status,
      time:      r.completedAt ?? r.startedAt ?? r.createdAt,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

  // focus items (max 3)
  type ViewId = Parameters<typeof setActiveView>[0];
  type FocusItem = { label: string; sub: string; view: ViewId; urgent: boolean; score: number };
  const focusCandidates: FocusItem[] = [];

  if (totalPending > 0)
    focusCandidates.push({ label: `Review ${totalPending} approval${totalPending > 1 ? "s" : ""}`, sub: "Your workforce is waiting on a decision", view: "inbox", urgent: true, score: 100 });
  if (overdueTasks.length > 0)
    focusCandidates.push({ label: `Clear ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}`, sub: overdueTasks[0]?.title ?? "Past their deadline", view: "tasks", urgent: true, score: 90 });
  if (dueTodayTasks.length > 0)
    focusCandidates.push({ label: `${dueTodayTasks.length} task${dueTodayTasks.length > 1 ? "s" : ""} due today`, sub: dueTodayTasks[0]?.title ?? "Due before midnight", view: "tasks", urgent: false, score: 75 });
  if (openRevenueCount > 0)
    focusCandidates.push({ label: `${openRevenueCount} revenue source${openRevenueCount > 1 ? "s" : ""} in pipeline`, sub: displayPipeline > 0 ? `${fmtEuro(displayPipeline)} weighted pipeline` : "Review and move forward", view: "revenue", urgent: false, score: 60 });
  if (activeGoals.length > 0) {
    const stalled = activeGoals.filter(g => g.progress < 20);
    if (stalled.length > 0)
      focusCandidates.push({ label: `${stalled.length} goal${stalled.length > 1 ? "s" : ""} below 20% progress`, sub: stalled[0]?.title ?? "Push forward today", view: "goals", urgent: false, score: 50 });
  }
  if (openTasks.length > 0 && overdueTasks.length === 0 && dueTodayTasks.length === 0)
    focusCandidates.push({ label: `${openTasks.length} open task${openTasks.length > 1 ? "s" : ""}`, sub: "Keep the momentum going", view: "tasks", urgent: false, score: 35 });

  const topFocus = focusCandidates.sort((a, b) => b.score - a.score).slice(0, 3);

  // calendar agenda items — merge calendar events + tasks with due dates
  const taskAgendaItems: CalendarEvent[] = tasks
    .filter(t => t.dueDate && isThisWeek(t.dueDate) && t.status !== "done")
    .map(t => ({ id: `task-${t.id}`, title: t.title, start: t.dueDate!, source: "task" as const, view: "tasks" as const }));

  const allAgendaItems = [...calEvents, ...taskAgendaItems]
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const todayEvents   = allAgendaItems.filter(e => isToday(e.start));
  const tomorrowEvents = allAgendaItems.filter(e => isTomorrow(e.start));
  const laterEvents   = allAgendaItems.filter(e => !isToday(e.start) && !isTomorrow(e.start) && isThisWeek(e.start));

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const currentTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const hasAlert = overdueTasks.length > 0 || totalPending > 0;

  // ── render ───────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-5 md:px-10 py-8 md:py-12 pb-28 md:pb-12">

        {/* ── HERO ─────────────────────────────────────────────── */}
        <div className="mb-10 md:mb-12">
          <p className="text-[11px] text-text-ghost font-medium tracking-[0.12em] uppercase mb-3">
            {today} · {currentTime}
          </p>
          <h1 className="text-[36px] md:text-[48px] font-semibold text-text-primary tracking-tight leading-[1.1] mb-4">
            {getGreeting()}, <span className="text-[#00D4FF]">Mio</span>
          </h1>
          <p className="text-[15px] md:text-[17px] text-text-secondary leading-relaxed max-w-2xl">
            {buildNarrativeSummary(dueTodayTasks.length, overdueTasks.length, totalPending, openRevenueCount)}
          </p>

          {/* Alert strip — only when blockers exist */}
          {hasAlert && (
            <div className="flex items-center gap-3 mt-5 p-3.5 rounded-2xl bg-accent-amber/[0.06] border border-accent-amber/15 max-w-xl">
              <AlertCircle className="w-4 h-4 text-accent-amber flex-shrink-0" />
              <p className="text-[13px] text-text-secondary flex-1">
                {totalPending > 0 && `${totalPending} approval${totalPending > 1 ? "s" : ""} need your decision`}
                {totalPending > 0 && overdueTasks.length > 0 && " · "}
                {overdueTasks.length > 0 && `${overdueTasks.length} task${overdueTasks.length > 1 ? "s" : ""} overdue`}
              </p>
              <button
                onClick={() => setActiveView(totalPending > 0 ? "inbox" : "tasks")}
                className="text-[12px] text-accent-amber font-medium hover:opacity-80 transition-opacity whitespace-nowrap flex items-center gap-1"
              >
                Review <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* ── KPI CARDS ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-10 md:mb-12">
          <KpiCard
            label="Revenue Pipeline"
            value={displayPipeline > 0 ? fmtEuro(displayPipeline) : "—"}
            sub={liveMRR > 0 ? `${fmtEuro(liveMRR)} live MRR` : `${openRevenueCount} active source${openRevenueCount === 1 ? "" : "s"}`}
            color="#10b981"
            onClick={() => setActiveView("revenue")}
          />
          <KpiCard
            label="Live MRR"
            value={liveMRR > 0 ? fmtEuro(liveMRR) : "—"}
            sub={liveMRR > 0 ? `${liveRevEntries.length} contract${liveRevEntries.length !== 1 ? "s" : ""}` : openRevenueCount > 0 ? `${openRevenueCount} in pipeline` : "No revenue yet"}
            color="#00D4FF"
            onClick={() => setActiveView("revenue")}
          />
          <KpiCard
            label="Active Projects"
            value={String(activeProjects.length)}
            sub={`${activeGoals.length} active goal${activeGoals.length === 1 ? "" : "s"}`}
            color="#8b5cf6"
            onClick={() => setActiveView("projects")}
          />
          <KpiCard
            label="Tasks Due Today"
            value={String(dueTodayTasks.length + overdueTasks.length)}
            sub={overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : completedToday.length > 0 ? `${completedToday.length} done today` : "Due before midnight"}
            color={overdueTasks.length > 0 ? "#f59e0b" : "#6366f1"}
            alert={overdueTasks.length > 0}
            onClick={() => setActiveView("tasks")}
          />
        </div>

        {/* ── RUNTIME STATUS BAR ───────────────────────────────── */}
        {liveData && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-5 px-1">
            {/* Runtime dot + label */}
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full flex-shrink-0",
                liveData.runtimeStatus.status === "running"
                  ? "bg-accent-green animate-pulse-slow"
                  : liveData.runtimeStatus.status === "stale"
                  ? "bg-accent-amber"
                  : "bg-text-ghost"
              )} />
              <Server className="w-3 h-3 text-text-ghost" />
              <span className="text-[12px] text-text-ghost capitalize">
                Runtime {liveData.runtimeStatus.status}
              </span>
            </div>

            {/* Workforce activity */}
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-text-ghost" />
              <span className="text-[12px] text-text-ghost">
                {liveData.workforceActivity.running > 0 && (
                  <span className="text-accent-cyan mr-2">{liveData.workforceActivity.running} running</span>
                )}
                {liveData.workforceActivity.queued > 0 && (
                  <span className="mr-2">{liveData.workforceActivity.queued} queued</span>
                )}
                <span className="text-accent-green">{liveData.workforceActivity.completedToday} done today</span>
                {liveData.workforceActivity.outputsToday > 0 && (
                  <span className="ml-2">· {liveData.workforceActivity.outputsToday} output{liveData.workforceActivity.outputsToday !== 1 ? "s" : ""}</span>
                )}
              </span>
            </div>

            {/* Last updated */}
            <span className="ml-auto text-[10px] text-text-ghost tabular-nums">
              Updated {new Date(liveData.lastUpdated).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
        )}

        {/* ── RECOMMENDED ACTIONS STRIP ────────────────────────── */}
        {execRecs.length > 0 && (
          <div className="mb-5">
            <div className="rounded-2xl bg-[#0d1220] border border-white/[0.05] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-accent-amber" />
                  <span className="text-[12px] font-semibold text-text-primary">
                    {execRecs.length} recommended action{execRecs.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <button
                  onClick={() => setActiveView("briefing")}
                  className="text-[11px] text-text-ghost hover:text-[#00D4FF] transition-colors flex items-center gap-1"
                >
                  View all <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {execRecs.map(rec => {
                  const dotCls =
                    rec.priority === "critical" ? "bg-accent-red" :
                    rec.priority === "high"     ? "bg-accent-amber" :
                    rec.priority === "medium"   ? "bg-[#00D4FF]" : "bg-text-ghost";
                  const targetView = rec.viewTarget as Parameters<typeof setActiveView>[0] | undefined;
                  return (
                    <div key={rec.id} className="flex items-center gap-3 px-5 py-3">
                      <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotCls)} />
                      <p className="text-[13px] text-text-secondary flex-1 truncate">{rec.title}</p>
                      {targetView && (
                        <button
                          onClick={() => setActiveView(targetView)}
                          className="flex-shrink-0 text-[11px] text-text-ghost hover:text-[#00D4FF] transition-colors flex items-center gap-0.5"
                        >
                          Open <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── PROJECT RISKS ─────────────────────────────────────── */}
        {liveData && liveData.projectRisks.length > 0 && (
          <div className="mb-5">
            <div className="rounded-2xl bg-[#0d1220] border border-accent-red/10 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-accent-red" />
                  <span className="text-[12px] font-semibold text-text-primary">
                    Project Risks
                  </span>
                  <span className="text-[11px] text-text-ghost">· live data</span>
                </div>
                <button
                  onClick={() => setActiveView("projects")}
                  className="text-[11px] text-text-ghost hover:text-[#00D4FF] transition-colors flex items-center gap-1"
                >
                  All projects <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {liveData.projectRisks.map((risk, i) => (
                  <div
                    key={i}
                    className="px-5 py-4 hover:bg-white/[0.015] transition-colors cursor-pointer"
                    onClick={() => setActiveView("projects")}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full mt-[5px] flex-shrink-0",
                        risk.health === "critical" ? "bg-accent-red" : "bg-accent-amber"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[13px] text-text-primary font-medium leading-tight">
                            {risk.name}
                          </p>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0",
                            risk.health === "critical"
                              ? "bg-accent-red/10 text-accent-red border border-accent-red/20"
                              : "bg-accent-amber/10 text-accent-amber border border-accent-amber/20"
                          )}>
                            {risk.score}/100
                          </span>
                        </div>
                        {risk.blocker && (
                          <p className="text-[12px] text-accent-amber leading-snug">
                            Blocker: {risk.blocker}
                          </p>
                        )}
                        {risk.reasons.slice(0, 2).map((r, j) => (
                          <p key={j} className="text-[12px] text-text-ghost leading-snug mt-0.5">{r}</p>
                        ))}
                        {risk.nextAction && (
                          <p className="text-[12px] text-text-secondary mt-1">
                            → {risk.nextAction}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MAIN GRID ─────────────────────────────────────────── */}
        {/* Desktop: Calendar left (3/5), Focus right (2/5) */}
        {/* Mobile: Focus first, then Calendar */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-5">

          {/* Focus Today — order-first on mobile */}
          <div className="order-first md:order-last md:col-span-2">
            <div className="rounded-2xl bg-[#0d1220] border border-white/[0.05] overflow-hidden">
              <div className="px-6 py-5 border-b border-white/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]" />
                  <span className="text-[13px] font-semibold text-text-primary">Focus Today</span>
                </div>
                <button
                  onClick={() => setActiveView("tasks")}
                  className="text-[11px] text-text-ghost hover:text-text-muted transition-colors flex items-center gap-1"
                >
                  All tasks <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="p-4 space-y-2.5">
                {topFocus.length === 0 ? (
                  <div className="py-8 text-center">
                    <CheckCircle2 className="w-5 h-5 text-accent-green mx-auto mb-2 opacity-40" />
                    <p className="text-[13px] text-text-muted">All clear.</p>
                    <p className="text-[11px] text-text-ghost mt-0.5">Choose what to push forward</p>
                  </div>
                ) : topFocus.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveView(item.view)}
                    className="w-full flex items-start gap-3.5 px-4 py-3.5 rounded-xl hover:bg-white/[0.03] transition-colors text-left group border border-white/[0.04] hover:border-white/[0.07]"
                  >
                    <span className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 font-mono mt-0.5",
                      item.urgent ? "bg-accent-amber/15 text-accent-amber" : "bg-white/[0.05] text-text-ghost"
                    )}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-text-primary font-medium leading-snug">{item.label}</p>
                      <p className="text-[11px] text-text-muted mt-0.5 leading-snug">{item.sub}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-text-ghost group-hover:text-text-muted transition-colors flex-shrink-0 mt-1" />
                  </button>
                ))}

                {completedToday.length > 0 && (
                  <div className="pt-1 flex items-center gap-2 px-4">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent-green flex-shrink-0" />
                    <p className="text-[11px] text-text-muted">
                      {completedToday.length} completed today
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Calendar / Agenda — order-last on mobile */}
          <div className="order-last md:order-first md:col-span-3">
            <CalendarWidget
              todayEvents={todayEvents}
              tomorrowEvents={tomorrowEvents}
              laterEvents={laterEvents}
              calConnected={calConnected}
              onNavigate={setActiveView}
              onConnectCalendar={() => setActiveView("settings")}
            />
          </div>
        </div>

        {/* ── COMPANY ACTIVITY FEED ─────────────────────────────── */}
        <div className="rounded-2xl bg-[#0d1220] border border-white/[0.05] overflow-hidden">
          <div className="px-6 py-5 border-b border-white/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bot className="w-4 h-4 text-[#00D4FF]" />
              <span className="text-[13px] font-semibold text-text-primary">Company Activity</span>
              {activeTeams.length > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-accent-green font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse-slow inline-block" />
                  {activeTeams.length} team{activeTeams.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveView("requests")}
                className="flex items-center gap-1.5 text-[11px] text-[#00D4FF] hover:opacity-80 transition-opacity font-medium"
              >
                <Zap className="w-3 h-3" /> Send request
              </button>
              <button
                onClick={() => setActiveView("inbox")}
                className="text-[11px] text-text-ghost hover:text-text-muted transition-colors flex items-center gap-1"
              >
                History <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {feedItems.length === 0 ? (
            <div className="py-10 text-center">
              <Bot className="w-6 h-6 text-text-ghost mx-auto mb-2 opacity-20" />
              <p className="text-[13px] text-text-muted">Your workforce hasn&apos;t started yet.</p>
              <div className="flex items-center justify-center gap-3 mt-2">
                <button
                  onClick={() => setActiveView("requests")}
                  className="text-[12px] text-[#00D4FF] hover:opacity-80 transition-opacity flex items-center gap-1"
                >
                  <Zap className="w-3 h-3" /> Send first request
                </button>
                <span className="text-text-ghost text-[11px]">·</span>
                <button
                  onClick={() => setActiveView("workforce")}
                  className="text-[12px] text-text-ghost hover:text-text-muted transition-colors"
                >
                  View workforce →
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {feedItems.map(item => (
                <div
                  key={`feed-${item.id}`}
                  className={cn(
                    "flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-white/[0.015]",
                    item.urgent && "bg-accent-amber/[0.025]"
                  )}
                >
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                    item.status === "completed" ? "bg-accent-green" :
                    item.status === "running"   ? "bg-[#00D4FF] animate-pulse-slow" :
                    item.status === "failed"    ? "bg-accent-red" :
                    item.status === "pending"   ? "bg-accent-amber" :
                    "bg-text-ghost"
                  )} />
                  <p className="text-[13px] text-text-secondary flex-1 leading-snug">
                    <span className="text-text-primary font-medium">{item.agentName}</span>
                    {" "}{item.action}
                  </p>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {item.urgent && (
                      <button
                        onClick={() => setActiveView("inbox")}
                        className="px-3 py-1 rounded-lg bg-accent-amber/10 border border-accent-amber/20 text-accent-amber text-[11px] font-medium hover:bg-accent-amber/15 transition-all"
                      >
                        Review
                      </button>
                    )}
                    <span className="text-[11px] text-text-ghost tabular-nums whitespace-nowrap hidden sm:block">
                      {fmtFeedTime(item.time)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 6H: ASSIGNMENTS WIDGET ─────────────────────────────── */}
        {(() => {
          const reviewAssignments  = assignments.filter(a => a.status === "review");
          const urgentAssignments  = assignments.filter(a => a.status === "active" && (a.priority === "urgent" || a.priority === "high"));
          const surfaced = [...reviewAssignments, ...urgentAssignments].slice(0, 5);
          if (surfaced.length === 0) return null;
          const STATUS_DOT_C: Record<string, string> = { pending: "#64748b", active: "#10b981", review: "#f59e0b", completed: "#6366f1" };
          return (
            <div className="rounded-2xl bg-[#0d1220] border border-white/[0.05] overflow-hidden">
              <div className="px-6 py-5 border-b border-white/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckSquare className="w-4 h-4 text-accent-cyan" />
                  <span className="text-[13px] font-semibold text-text-primary">Assignments</span>
                  {reviewAssignments.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-amber/10 text-accent-amber border border-accent-amber/20">
                      {reviewAssignments.length} need review
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setActiveView("workforce")}
                  className="text-[11px] text-text-ghost hover:text-text-muted transition-colors flex items-center gap-1"
                >
                  View all <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {surfaced.map(a => (
                  <div
                    key={a.id}
                    className={cn(
                      "flex items-center gap-4 px-6 py-3.5 hover:bg-white/[0.015] transition-colors cursor-pointer",
                      a.status === "review" && "bg-accent-amber/[0.02]"
                    )}
                    onClick={() => setActiveView("workforce")}
                  >
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_DOT_C[a.status] ?? "#64748b" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-text-secondary truncate">
                        <span className="text-text-primary font-medium">{a.team?.name ?? "Team"}</span>
                        {" · "}{a.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {a.status === "review" && (
                        <span className="px-2 py-0.5 rounded bg-accent-amber/10 text-accent-amber text-[10px] border border-accent-amber/20">
                          Review
                        </span>
                      )}
                      {a.priority === "urgent" && (
                        <span className="px-2 py-0.5 rounded bg-accent-red/10 text-accent-red text-[10px] border border-accent-red/20">
                          Urgent
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}

// ── CalendarWidget ───────────────────────────────────────────────
function CalendarWidget({
  todayEvents, tomorrowEvents, laterEvents,
  calConnected, onNavigate, onConnectCalendar,
}: {
  todayEvents: CalendarEvent[];
  tomorrowEvents: CalendarEvent[];
  laterEvents: CalendarEvent[];
  calConnected: boolean | null;
  onNavigate: (view: ReturnType<typeof useAppStore.getState>["activeView"]) => void;
  onConnectCalendar: () => void;
}) {
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const hasAnyEvents = todayEvents.length > 0 || tomorrowEvents.length > 0 || laterEvents.length > 0;

  return (
    <div className="rounded-2xl bg-[#0d1220] border border-white/[0.05] overflow-hidden h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-[#00D4FF]" />
          <span className="text-[13px] font-semibold text-text-primary">Agenda</span>
          <span className="text-[11px] text-text-ghost">{today}</span>
        </div>
        {calConnected === false && (
          <button
            onClick={onConnectCalendar}
            className="flex items-center gap-1.5 text-[11px] text-[#00D4FF] hover:opacity-80 transition-opacity"
          >
            <Plug className="w-3 h-3" />
            Connect calendar
          </button>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Connect calendar CTA */}
        {calConnected === false && !hasAnyEvents && (
          <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-center">
            <Calendar className="w-5 h-5 text-text-ghost mx-auto mb-2 opacity-40" />
            <p className="text-[13px] text-text-secondary font-medium mb-1">Connect your calendar</p>
            <p className="text-[11px] text-text-muted mb-3 max-w-xs mx-auto">
              See your meetings, deadlines and tasks in one place. Supports Google Calendar, iCal, and CalDAV.
            </p>
            <button
              onClick={onConnectCalendar}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] text-[12px] font-medium hover:bg-[#00D4FF]/15 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Connect calendar
            </button>
          </div>
        )}

        {/* Today */}
        {(todayEvents.length > 0 || calConnected) && (
          <AgendaSection
            label="Today"
            events={todayEvents}
            emptyText={calConnected ? "No events scheduled for today" : "No tasks due today"}
            onNavigate={onNavigate}
          />
        )}

        {/* Tomorrow */}
        {tomorrowEvents.length > 0 && (
          <AgendaSection
            label="Tomorrow"
            events={tomorrowEvents}
            onNavigate={onNavigate}
          />
        )}

        {/* This week */}
        {laterEvents.length > 0 && (
          <AgendaSection
            label="This week"
            events={laterEvents.slice(0, 5)}
            onNavigate={onNavigate}
          />
        )}

      </div>
    </div>
  );
}

function AgendaSection({
  label, events, emptyText, onNavigate,
}: {
  label: string;
  events: CalendarEvent[];
  emptyText?: string;
  onNavigate: (view: ReturnType<typeof useAppStore.getState>["activeView"]) => void;
}) {
  return (
    <div>
      <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] font-medium mb-2">{label}</p>
      {events.length === 0 ? (
        emptyText && <p className="text-[12px] text-text-ghost pl-1">{emptyText}</p>
      ) : (
        <div className="space-y-1.5">
          {events.map(event => (
            <button
              key={event.id}
              onClick={() => event.view && onNavigate(event.view)}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-colors group",
                event.view
                  ? "hover:bg-white/[0.03] cursor-pointer"
                  : "cursor-default",
                event.source === "task"
                  ? "border border-white/[0.04]"
                  : "border border-[#00D4FF]/[0.06] bg-[#00D4FF]/[0.02]"
              )}
            >
              {/* Time or icon */}
              <div className="w-10 flex-shrink-0 text-center">
                {event.allDay ? (
                  <span className="text-[10px] text-text-ghost">All day</span>
                ) : event.source === "task" ? (
                  <CheckSquare className="w-3.5 h-3.5 text-text-ghost mx-auto" />
                ) : (
                  <span className="text-[12px] font-mono text-[#00D4FF]/70">
                    {fmtEventTime(event.start)}
                  </span>
                )}
              </div>
              {/* Divider */}
              <div className={cn(
                "w-px h-7 flex-shrink-0",
                event.source === "calendar" ? "bg-[#00D4FF]/20" : "bg-white/[0.06]"
              )} />
              {/* Title */}
              <p className={cn(
                "text-[13px] flex-1 leading-snug",
                event.source === "calendar" ? "text-text-primary" : "text-text-secondary group-hover:text-text-primary transition-colors"
              )}>
                {event.title}
              </p>
              {event.source === "task" && (
                <span className="text-[9px] text-text-ghost uppercase tracking-wide flex-shrink-0">task</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── KpiCard ───────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, color, alert, onClick,
}: {
  label: string; value: string; sub: string;
  color: string; alert?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group rounded-2xl bg-[#0d1220] border border-white/[0.05] p-5 md:p-7 text-left hover:border-white/[0.09] hover:bg-[#101828] transition-all"
    >
      <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] mb-4 font-medium">{label}</p>
      <p
        className="text-[40px] md:text-[48px] font-bold font-mono leading-none mb-2.5 transition-opacity group-hover:opacity-90"
        style={{ color }}
      >
        {value}
      </p>
      <p className={cn(
        "text-[12px] leading-snug",
        alert ? "text-accent-amber" : "text-text-ghost"
      )}>
        {sub}
      </p>
    </button>
  );
}
