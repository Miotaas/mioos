"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import {
  AlertTriangle, RefreshCw, TrendingUp, Target, CheckSquare,
  ArrowRight, Clock, Users2, Zap, BarChart2, ChevronRight, Loader2, Sparkles,
  ShieldAlert, XCircle, ListChecks,
} from "lucide-react";

// ── types ─────────────────────────────────────────────────────────

interface AIBriefData {
  greeting?: string;
  situation?: string;
  needsAttention?: string[];
  biggestOpportunity?: string;
  biggestRisk?: string;
  recommendedFocus?: string;
  nextAction?: string;
}
interface AttentionItem {
  type: "approval" | "agent_approval" | "blocked_project" | "overdue_task";
  id: string;
  title: string;
  source: string;
  priority: string;
  time: string;
  reason?: string;
}

interface OutputItem {
  id: string;
  title: string;
  team: string;
  outputType: string;
  status: string;
  time: string;
}

interface HandoffItem {
  id: string;
  title: string;
  from: string;
  to: string;
  status: string;
  priority: string;
  time: string;
}

interface GoalItem {
  id: string;
  title: string;
  progress: number;
  goalType: string;
  targetDate: string | null;
  milestoneCount: number;
  milestonesCompleted: number;
}

interface RevenueEntry {
  id: string;
  title: string;
  amount: number;
  currency: string;
  revenueType: string;
  status: string;
}

interface ProjectItem {
  id: string;
  name: string;
  status: string;
  priority: string;
  nextAction: string | null;
  blocker: string | null;
  revenueImpact: number | null;
}

type ExecRecPriority = "critical" | "high" | "medium" | "low";
type ExecRecNav = "dashboard" | "briefing" | "inbox" | "tasks" | "projects" | "goals" | "calendar" | "revenue" | "workforce" | "requests" | "settings";

interface ExecRec {
  id: string;
  title: string;
  reason: string;
  priority: ExecRecPriority;
  source: string;
  action: string;
  viewTarget?: ExecRecNav;
}

interface WeeklyReviewData {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  summary: string;
  revenueSnapshot: string;
  goalsStatus: string;
  wins: string[];
  blockers: string[];
  nextWeekFocus: string[];
}

interface MonthlyReviewData {
  generatedAt: string;
  month: string;
  summary: string;
  revenueSnapshot: string;
  topAchievements: string[];
  missedTargets: string[];
  keyLearnings: string[];
  nextMonthPriorities: string[];
}

interface BriefingData {
  generatedAt: string;
  stats: {
    pendingApprovals: number;
    activeProjects: number;
    blockedProjects: number;
    activeGoals: number;
    avgGoalProgress: number;
    overdueTasks: number;
    recentOutputs: number;
    liveRevenue: number;
    pipelineRevenue: number;
    potentialRevenue: number;
  };
  needsAttention: AttentionItem[];
  recentOutputs: OutputItem[];
  handoffs: HandoffItem[];
  goals: GoalItem[];
  revenue: {
    live: number;
    pipeline: number;
    potential: number;
    topEntries: RevenueEntry[];
  };
  projects: ProjectItem[];
}

// ── helpers ───────────────────────────────────────────────────────

function fmtEur(n: number) {
  if (n >= 1000) return `€${(n / 1000).toFixed(1)}k`;
  return `€${n.toFixed(0)}`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function priorityColor(p: string) {
  if (p === "urgent") return "text-accent-red border-accent-red/30 bg-accent-red/5";
  if (p === "high")   return "text-accent-amber border-accent-amber/30 bg-accent-amber/5";
  return "text-text-muted border-white/[0.06] bg-white/[0.02]";
}

function attentionIcon(type: AttentionItem["type"]) {
  if (type === "approval" || type === "agent_approval") return ShieldAlert;
  if (type === "blocked_project") return XCircle;
  return AlertTriangle;
}

function outputTypeLabel(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function statusDot(status: string) {
  if (status === "completed" || status === "approved") return "bg-accent-green";
  if (status === "in_progress" || status === "active") return "bg-[#00D4FF]";
  if (status === "in_review")  return "bg-accent-amber";
  if (status === "blocked")    return "bg-accent-red";
  return "bg-text-ghost";
}

function revTypeBadge(t: string) {
  if (t === "live")     return "text-accent-green border-accent-green/25 bg-accent-green/5";
  if (t === "pipeline") return "text-[#00D4FF] border-[#00D4FF]/25 bg-[#00D4FF]/5";
  return "text-text-muted border-white/[0.06] bg-white/[0.02]";
}

// ── component ─────────────────────────────────────────────────────

export function BriefingView() {
  const { setActiveView } = useAppStore();
  const [data, setData]       = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiBrief, setAiBrief]           = useState<AIBriefData | null>(null);
  const [aiBriefLoading, setAiBriefLoading] = useState(false);
  const [execRecs, setExecRecs]         = useState<ExecRec[]>([]);
  const [execRecsLoading, setExecRecsLoading] = useState(true);
  const [weeklyReview, setWeeklyReview] = useState<WeeklyReviewData | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [monthlyReview, setMonthlyReview] = useState<MonthlyReviewData | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/briefings/daily")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/executive/recommendations")
      .then(r => r.json())
      .then(d => { setExecRecs(Array.isArray(d) ? d : []); setExecRecsLoading(false); })
      .catch(() => setExecRecsLoading(false));
  }, []);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-white/[0.05]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] text-text-ghost uppercase tracking-[0.14em] font-medium mb-1">
              Founder Cockpit
            </p>
            <h1 className="text-xl font-semibold text-text-primary">
              {greeting()}, Michiel
            </h1>
            <p className="text-[13px] text-text-muted mt-0.5">{today}</p>
          </div>
          <button
            onClick={async () => {
              setAiBriefLoading(true);
              try {
                const r = await fetch("/api/briefings/ai-generate", { method: "POST" }).then(d => d.json()) as { ok: boolean; briefing?: AIBriefData; message?: string };
                if (r.ok && r.briefing) setAiBrief(r.briefing as AIBriefData);
              } finally { setAiBriefLoading(false); }
            }}
            disabled={aiBriefLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 hover:bg-accent-cyan/15 disabled:opacity-40 transition-all"
          >
            {aiBriefLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            AI Brief
          </button>
          <button
            onClick={async () => {
              if (weeklyReview) { setWeeklyReview(null); return; }
              setReviewLoading(true);
              try {
                const d = await fetch("/api/executive/review?type=weekly").then(r => r.json());
                if (!d.error) setWeeklyReview(d as WeeklyReviewData);
              } finally { setReviewLoading(false); }
            }}
            disabled={reviewLoading}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all disabled:opacity-40",
              weeklyReview
                ? "bg-accent-violet/10 text-accent-violet border-accent-violet/20"
                : "border-white/[0.06] text-text-ghost hover:text-text-muted"
            )}
          >
            {reviewLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
            Week
          </button>
          <button
            onClick={async () => {
              if (monthlyReview) { setMonthlyReview(null); return; }
              setReviewLoading(true);
              try {
                const d = await fetch("/api/executive/review?type=monthly").then(r => r.json());
                if (!d.error) setMonthlyReview(d as MonthlyReviewData);
              } finally { setReviewLoading(false); }
            }}
            disabled={reviewLoading}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all disabled:opacity-40",
              monthlyReview
                ? "bg-accent-violet/10 text-accent-violet border-accent-violet/20"
                : "border-white/[0.06] text-text-ghost hover:text-text-muted"
            )}
          >
            {reviewLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <BarChart2 className="w-3 h-3" />}
            Month
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.06] text-text-ghost hover:text-text-muted text-[12px] transition-colors"
          >
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
            Refresh
          </button>
        </div>

        {/* Quick stats */}
        {data && (
          <div className="flex flex-wrap gap-2 mt-4">
            <StatPill
              icon={ShieldAlert}
              value={data.stats.pendingApprovals}
              label="pending"
              urgent={data.stats.pendingApprovals > 0}
              color="amber"
            />
            <StatPill
              icon={CheckSquare}
              value={data.stats.overdueTasks}
              label="overdue"
              urgent={data.stats.overdueTasks > 0}
              color="red"
            />
            <StatPill
              icon={BarChart2}
              value={fmtEur(data.stats.liveRevenue)}
              label="live MRR"
              color="green"
            />
            <StatPill
              icon={Target}
              value={`${data.stats.avgGoalProgress}%`}
              label="goal avg"
              color="cyan"
            />
            <StatPill
              icon={Zap}
              value={data.stats.recentOutputs}
              label="outputs 48h"
              color="default"
            />
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {loading && (
          <div className="flex items-center justify-center h-32 text-text-ghost text-sm">
            Loading briefing…
          </div>
        )}

        {!loading && data && (
          <>
            {/* AI Brief panel */}
            {aiBrief && (
              <div className="mb-5 p-4 rounded-2xl bg-accent-cyan/[0.04] border border-accent-cyan/[0.10]">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
                  <p className="text-[11px] text-accent-cyan font-semibold uppercase tracking-[0.1em]">AI Strategic Brief</p>
                </div>
                {aiBrief.situation && (
                  <p className="text-[13px] text-text-secondary leading-relaxed mb-3">{String(aiBrief.situation)}</p>
                )}
                {Array.isArray(aiBrief.needsAttention) && aiBrief.needsAttention.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] mb-1.5">Needs Attention</p>
                    <ul className="space-y-1">
                      {(aiBrief.needsAttention as string[]).map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[12px] text-text-secondary">
                          <span className="text-accent-amber mt-0.5">•</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {aiBrief.biggestOpportunity && (
                    <div className="p-2 rounded-lg bg-accent-green/[0.05] border border-accent-green/10">
                      <p className="text-[9px] text-accent-green uppercase tracking-[0.1em] mb-1">Opportunity</p>
                      <p className="text-[11px] text-text-secondary leading-relaxed">{String(aiBrief.biggestOpportunity)}</p>
                    </div>
                  )}
                  {aiBrief.biggestRisk && (
                    <div className="p-2 rounded-lg bg-accent-red/[0.05] border border-accent-red/10">
                      <p className="text-[9px] text-accent-red uppercase tracking-[0.1em] mb-1">Risk</p>
                      <p className="text-[11px] text-text-secondary leading-relaxed">{String(aiBrief.biggestRisk)}</p>
                    </div>
                  )}
                  {aiBrief.nextAction && (
                    <div className="p-2 rounded-lg bg-accent-cyan/[0.05] border border-accent-cyan/10">
                      <p className="text-[9px] text-accent-cyan uppercase tracking-[0.1em] mb-1">Next Action</p>
                      <p className="text-[11px] text-text-secondary leading-relaxed">{String(aiBrief.nextAction)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recommended Actions (executive intelligence) */}
            {!execRecsLoading && execRecs.length > 0 && (
              <Section
                title="Recommended Actions"
                count={execRecs.length}
                urgent={execRecs.some(r => r.priority === "critical")}
              >
                <div className="space-y-2">
                  {execRecs.map(rec => {
                    const priorityCls =
                      rec.priority === "critical" ? "border-accent-red/25 bg-accent-red/[0.04]" :
                      rec.priority === "high"     ? "border-accent-amber/25 bg-accent-amber/[0.04]" :
                      rec.priority === "medium"   ? "border-[#00D4FF]/20 bg-[#00D4FF]/[0.03]" :
                      "border-white/[0.06] bg-white/[0.02]";
                    const dotCls =
                      rec.priority === "critical" ? "bg-accent-red" :
                      rec.priority === "high"     ? "bg-accent-amber" :
                      rec.priority === "medium"   ? "bg-[#00D4FF]" :
                      "bg-text-ghost";
                    return (
                      <div key={rec.id} className={cn("flex items-start gap-3 px-3 py-2.5 rounded-lg border", priorityCls)}>
                        <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", dotCls)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-text-primary">{rec.title}</p>
                          <p className="text-[11px] text-text-muted mt-0.5">{rec.action}</p>
                        </div>
                        {rec.viewTarget && (
                          <button
                            onClick={() => setActiveView(rec.viewTarget!)}
                            className="flex-shrink-0 text-[10px] text-text-ghost hover:text-[#00D4FF] transition-colors flex items-center gap-0.5 mt-0.5"
                          >
                            Open <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Needs attention */}
            {data.needsAttention.length > 0 && (
              <Section
                title="Needs Your Attention"
                count={data.needsAttention.length}
                urgent
                onNavigate={() => setActiveView("inbox")}
                navigateLabel="Open Inbox"
              >
                <div className="space-y-2">
                  {data.needsAttention.slice(0, 6).map(item => {
                    const Icon = attentionIcon(item.type);
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-start gap-3 px-3 py-2.5 rounded-lg border",
                          priorityColor(item.priority)
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-text-primary truncate capitalize">
                            {item.title}
                          </p>
                          {item.reason && (
                            <p className="text-[11px] text-text-muted mt-0.5 truncate">
                              {item.reason}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-[10px] text-text-ghost">{item.source}</p>
                          <p className="text-[10px] text-text-ghost">{fmtTime(item.time)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Revenue snapshot */}
            <Section
              title="Revenue"
              onNavigate={() => setActiveView("revenue")}
              navigateLabel="Full View"
            >
              <div className="grid grid-cols-3 gap-3 mb-3">
                <RevenueBlock label="Live MRR" value={fmtEur(data.revenue.live)} color="green" />
                <RevenueBlock label="Pipeline" value={fmtEur(data.revenue.pipeline)} color="cyan" />
                <RevenueBlock label="Potential" value={fmtEur(data.revenue.potential)} color="default" />
              </div>
              {data.revenue.topEntries.length > 0 && (
                <div className="space-y-1.5">
                  {data.revenue.topEntries.map(r => (
                    <div key={r.id} className="flex items-center gap-2 py-1">
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase tracking-wide",
                        revTypeBadge(r.revenueType)
                      )}>
                        {r.revenueType}
                      </span>
                      <span className="text-[13px] text-text-secondary flex-1 truncate">{r.title}</span>
                      <span className="text-[13px] font-medium text-text-primary flex-shrink-0">
                        {r.currency} {r.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Goals */}
            {data.goals.length > 0 && (
              <Section
                title="Active Goals"
                count={data.goals.length}
                onNavigate={() => setActiveView("goals")}
                navigateLabel="All Goals"
              >
                <div className="space-y-3">
                  {data.goals.map(g => (
                    <div key={g.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded border font-medium uppercase tracking-wide flex-shrink-0",
                            g.goalType === "business"
                              ? "text-accent-violet border-accent-violet/25 bg-accent-violet/5"
                              : "text-accent-purple border-accent-purple/25 bg-accent-purple/5"
                          )}>
                            {g.goalType}
                          </span>
                          <span className="text-[13px] text-text-secondary truncate">{g.title}</span>
                        </div>
                        <span className="text-[13px] font-semibold text-text-primary flex-shrink-0 ml-2">
                          {g.progress}%
                        </span>
                      </div>
                      <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            g.goalType === "business"
                              ? "bg-accent-violet"
                              : "bg-accent-purple"
                          )}
                          style={{ width: `${g.progress}%` }}
                        />
                      </div>
                      {g.milestoneCount > 0 && (
                        <p className="text-[10px] text-text-ghost mt-1">
                          {g.milestonesCompleted}/{g.milestoneCount} milestones
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Active projects */}
            {data.projects.length > 0 && (
              <Section
                title="Active Projects"
                count={data.projects.length}
                onNavigate={() => setActiveView("projects")}
                navigateLabel="All Projects"
              >
                <div className="space-y-2">
                  {data.projects.map(p => (
                    <div key={p.id} className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0">
                      <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", statusDot(p.status))} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-text-secondary font-medium truncate">{p.name}</span>
                          {p.status === "blocked" && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded border border-accent-red/30 bg-accent-red/5 text-accent-red font-medium uppercase tracking-wide flex-shrink-0">
                              Blocked
                            </span>
                          )}
                        </div>
                        {p.blocker && (
                          <p className="text-[11px] text-accent-red/70 mt-0.5 truncate">⚠ {p.blocker}</p>
                        )}
                        {p.nextAction && !p.blocker && (
                          <p className="text-[11px] text-text-muted mt-0.5 truncate">→ {p.nextAction}</p>
                        )}
                      </div>
                      {p.revenueImpact != null && (
                        <span className="text-[12px] text-accent-green font-medium flex-shrink-0">
                          {fmtEur(p.revenueImpact)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Recent outputs */}
            {data.recentOutputs.length > 0 && (
              <Section
                title="Recent Outputs (48h)"
                count={data.recentOutputs.length}
                onNavigate={() => setActiveView("workforce")}
                navigateLabel="Workforce"
              >
                <div className="space-y-1.5">
                  {data.recentOutputs.slice(0, 8).map(o => (
                    <div key={o.id} className="flex items-center gap-2.5 py-1.5">
                      <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", statusDot(o.status))} />
                      <span className="text-[13px] text-text-secondary flex-1 truncate">{o.title}</span>
                      <span className="text-[10px] text-text-ghost flex-shrink-0">{o.team}</span>
                      <span className="text-[10px] text-text-ghost flex-shrink-0">{fmtTime(o.time)}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Active handoffs */}
            {data.handoffs.length > 0 && (
              <Section
                title="Active Handoffs"
                count={data.handoffs.length}
                onNavigate={() => setActiveView("inbox")}
                navigateLabel="Inbox"
              >
                <div className="space-y-2">
                  {data.handoffs.map(h => (
                    <div key={h.id} className="flex items-center gap-3 py-1.5">
                      <div className="flex items-center gap-1.5 text-[12px] text-text-muted min-w-0 flex-1">
                        <span className="truncate text-text-secondary">{h.from}</span>
                        <ArrowRight className="w-3 h-3 flex-shrink-0 text-[#00D4FF]" />
                        <span className="truncate text-text-secondary">{h.to}</span>
                      </div>
                      <span className="text-[12px] text-text-muted truncate flex-1 text-right">{h.title}</span>
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded border font-medium uppercase tracking-wide flex-shrink-0",
                        h.priority === "high" || h.priority === "urgent"
                          ? "text-accent-amber border-accent-amber/25 bg-accent-amber/5"
                          : "text-text-ghost border-white/[0.06] bg-transparent"
                      )}>
                        {h.status.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Empty state */}
            {data.needsAttention.length === 0 &&
             data.recentOutputs.length === 0 &&
             data.handoffs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-10 h-10 rounded-xl bg-accent-green/10 border border-accent-green/20 flex items-center justify-center mb-3">
                  <CheckSquare className="w-5 h-5 text-accent-green" />
                </div>
                <p className="text-[14px] font-medium text-text-secondary">All clear</p>
                <p className="text-[12px] text-text-ghost mt-1">No pending actions or active operations.</p>
              </div>
            )}

            {/* Weekly Review */}
            {weeklyReview && (
              <div className="p-4 rounded-2xl bg-accent-violet/[0.04] border border-accent-violet/[0.10]">
                <p className="text-[11px] text-accent-violet font-semibold uppercase tracking-[0.1em] mb-3">Weekly Review</p>
                <p className="text-[13px] text-text-secondary leading-relaxed mb-3">{weeklyReview.summary}</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-accent-green/[0.05] border border-accent-green/10">
                    <p className="text-[9px] text-accent-green uppercase tracking-[0.1em] mb-1">Revenue</p>
                    <p className="text-[11px] text-text-secondary">{weeklyReview.revenueSnapshot}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-accent-cyan/[0.05] border border-accent-cyan/10">
                    <p className="text-[9px] text-accent-cyan uppercase tracking-[0.1em] mb-1">Goals</p>
                    <p className="text-[11px] text-text-secondary">{weeklyReview.goalsStatus}</p>
                  </div>
                </div>
                {weeklyReview.wins.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] mb-1">Wins</p>
                    <ul className="space-y-0.5">
                      {weeklyReview.wins.map((w, i) => (
                        <li key={i} className="text-[12px] text-text-secondary flex items-start gap-1.5">
                          <span className="text-accent-green mt-0.5">✓</span> {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {weeklyReview.nextWeekFocus.length > 0 && (
                  <div>
                    <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] mb-1">Next Week Focus</p>
                    <ul className="space-y-0.5">
                      {weeklyReview.nextWeekFocus.map((f, i) => (
                        <li key={i} className="text-[12px] text-text-secondary flex items-start gap-1.5">
                          <span className="text-accent-violet mt-0.5">→</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Monthly Review */}
            {monthlyReview && (
              <div className="p-4 rounded-2xl bg-accent-violet/[0.04] border border-accent-violet/[0.10]">
                <p className="text-[11px] text-accent-violet font-semibold uppercase tracking-[0.1em] mb-3">
                  Monthly Review — {monthlyReview.month}
                </p>
                <p className="text-[13px] text-text-secondary leading-relaxed mb-3">{monthlyReview.summary}</p>
                <div className="p-2 rounded-lg bg-accent-green/[0.05] border border-accent-green/10 mb-3">
                  <p className="text-[9px] text-accent-green uppercase tracking-[0.1em] mb-1">Revenue Snapshot</p>
                  <p className="text-[11px] text-text-secondary">{monthlyReview.revenueSnapshot}</p>
                </div>
                {monthlyReview.topAchievements.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] mb-1">Top Achievements</p>
                    <ul className="space-y-0.5">
                      {monthlyReview.topAchievements.map((a, i) => (
                        <li key={i} className="text-[12px] text-text-secondary flex items-start gap-1.5">
                          <span className="text-accent-green mt-0.5">✓</span> {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {monthlyReview.nextMonthPriorities.length > 0 && (
                  <div>
                    <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] mb-1">Next Month Priorities</p>
                    <ul className="space-y-0.5">
                      {monthlyReview.nextMonthPriorities.slice(0, 4).map((p, i) => (
                        <li key={i} className="text-[12px] text-text-secondary flex items-start gap-1.5">
                          <span className="text-accent-violet mt-0.5">→</span> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {data.generatedAt && (
              <p className="text-[10px] text-text-ghost text-center pb-2">
                Generated at {new Date(data.generatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────

function StatPill({
  icon: Icon,
  value,
  label,
  urgent,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number | string;
  label: string;
  urgent?: boolean;
  color: "amber" | "red" | "green" | "cyan" | "default";
}) {
  const colors = {
    amber:   "border-accent-amber/20 bg-accent-amber/5 text-accent-amber",
    red:     "border-accent-red/20 bg-accent-red/5 text-accent-red",
    green:   "border-accent-green/20 bg-accent-green/5 text-accent-green",
    cyan:    "border-[#00D4FF]/20 bg-[#00D4FF]/5 text-[#00D4FF]",
    default: "border-white/[0.06] bg-white/[0.02] text-text-muted",
  };
  const active = urgent ? colors[color] : colors["default"];
  return (
    <div className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[12px]", active)}>
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span className="font-semibold">{value}</span>
      <span className="text-[11px] opacity-70">{label}</span>
    </div>
  );
}

function RevenueBlock({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "green" | "cyan" | "default";
}) {
  const c = {
    green:   "text-accent-green",
    cyan:    "text-[#00D4FF]",
    default: "text-text-muted",
  }[color];
  return (
    <div className="px-3 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
      <p className="text-[10px] text-text-ghost mb-1">{label}</p>
      <p className={cn("text-[18px] font-semibold", c)}>{value}</p>
    </div>
  );
}

function Section({
  title,
  count,
  urgent,
  onNavigate,
  navigateLabel,
  children,
}: {
  title: string;
  count?: number;
  urgent?: boolean;
  onNavigate?: () => void;
  navigateLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[11px] font-semibold text-text-ghost uppercase tracking-[0.1em]">
            {title}
          </h2>
          {count != null && count > 0 && (
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
              urgent
                ? "bg-accent-amber/15 text-accent-amber"
                : "bg-white/[0.06] text-text-ghost"
            )}>
              {count}
            </span>
          )}
        </div>
        {onNavigate && navigateLabel && (
          <button
            onClick={onNavigate}
            className="flex items-center gap-1 text-[11px] text-text-ghost hover:text-[#00D4FF] transition-colors"
          >
            {navigateLabel}
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
