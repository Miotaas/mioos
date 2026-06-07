"use client";

import { useEffect, useState } from "react";
import {
  AgentGoal, ExecutiveLoopRun, AgentReviewRequest,
  AgentScorecard, ExecutiveLoopOverview, GoalType,
} from "@/types";
import { cn } from "@/lib/utils";
import {
  Target, Play, RefreshCw, Loader2, CheckCircle2, XCircle,
  Clock, GitFork, MessageSquare, AlertTriangle, Trophy,
  ChevronRight, Plus, Star, TrendingUp, Zap, Brain,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const GOAL_TYPE_COLORS: Record<GoalType, string> = {
  revenue:    "bg-accent-green/10 text-accent-green",
  opportunity:"bg-accent-violet/10 text-accent-violet",
  execution:  "bg-accent-cyan/10 text-accent-cyan",
  research:   "bg-accent-purple/10 text-accent-purple",
  operations: "bg-accent-amber/10 text-accent-amber",
  knowledge:  "bg-blue-500/10 text-blue-400",
  support:    "bg-pink-500/10 text-pink-400",
  custom:     "bg-white/[0.06] text-text-ghost",
};

const STATUS_COLORS: Record<string, string> = {
  running:     "text-accent-violet animate-pulse",
  completed:   "text-accent-green",
  failed:      "text-accent-red",
  pending:     "text-accent-amber",
  in_review:   "text-accent-cyan",
  approved:    "text-accent-green",
  rejected:    "text-accent-red",
  needs_changes:"text-accent-amber",
};

function StatChip({ icon, label, value, alert }: {
  icon: React.ReactNode; label: string; value: number; alert?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-surface-2 border border-white/[0.06]">
      <span className={cn("opacity-60", alert && value > 0 ? "text-accent-amber opacity-100" : "")}>{icon}</span>
      <div>
        <p className={cn("text-lg font-bold font-mono leading-none", alert && value > 0 ? "text-accent-amber" : "text-text-primary")}>
          {value}
        </p>
        <p className="text-[9px] text-text-ghost uppercase tracking-widest mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] text-text-ghost uppercase tracking-wider">{label}</span>
        <span className="text-[10px] font-bold font-mono text-text-secondary">{score.toFixed(1)}</span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.06]">
        <div
          className={cn("h-1 rounded-full transition-all", color)}
          style={{ width: `${(score / 10) * 100}%` }}
        />
      </div>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-8 rounded-xl border border-dashed border-white/[0.06]">
      <p className="text-xs text-text-ghost">{text}</p>
    </div>
  );
}

function SectionHeader({ label, count, color }: { label: string; count?: number; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-widest">{label}</h3>
      {count !== undefined && (
        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded", color ?? "bg-white/[0.06] text-text-ghost")}>
          {count}
        </span>
      )}
    </div>
  );
}

// ── Goal form ─────────────────────────────────────────────────────

function AddGoalForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [agentId, setAgentId] = useState("");
  const [title, setTitle] = useState("");
  const [goalType, setGoalType] = useState("custom");
  const [period, setPeriod] = useState("weekly");
  const [targetMetric, setTargetMetric] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && agents.length === 0) {
      fetch("/api/agents").then(r => r.json()).then(d => {
        setAgents(Array.isArray(d) ? d : []);
        if (d[0]) setAgentId(d[0].id);
      }).catch(() => {});
    }
  }, [open, agents.length]);

  async function save() {
    if (!agentId || !title.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/agent-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, title: title.trim(), goalType, period, targetMetric: targetMetric || null }),
      });
      setOpen(false); setTitle(""); setTargetMetric("");
      onCreated();
    } finally { setSaving(false); }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-medium hover:bg-accent-cyan/15 transition-all"
      >
        <Plus className="w-3.5 h-3.5" /> Add Goal
      </button>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-accent-cyan/20 bg-surface-2 space-y-3">
      <p className="text-xs font-semibold text-text-primary">New Agent Goal</p>
      <select
        value={agentId}
        onChange={e => setAgentId(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-surface-3 border border-white/[0.06] text-xs text-text-primary"
      >
        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Goal title…"
        className="w-full px-3 py-2 rounded-lg bg-surface-3 border border-white/[0.06] text-xs text-text-primary placeholder:text-text-ghost"
      />
      <div className="flex gap-2">
        <select
          value={goalType}
          onChange={e => setGoalType(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-surface-3 border border-white/[0.06] text-xs text-text-primary"
        >
          {["revenue","opportunity","execution","research","operations","knowledge","support","custom"].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-surface-3 border border-white/[0.06] text-xs text-text-primary"
        >
          {["daily","weekly","monthly","quarterly","ongoing"].map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <input
        value={targetMetric}
        onChange={e => setTargetMetric(e.target.value)}
        placeholder="Target metric (optional)…"
        className="w-full px-3 py-2 rounded-lg bg-surface-3 border border-white/[0.06] text-xs text-text-primary placeholder:text-text-ghost"
      />
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving || !title.trim() || !agentId}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan text-xs font-medium hover:bg-accent-cyan/20 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
          Save
        </button>
        <button onClick={() => setOpen(false)} className="px-3 py-2 text-xs text-text-ghost hover:text-text-secondary transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────

export function ExecutiveLoopView() {
  const [overview, setOverview] = useState<ExecutiveLoopOverview | null>(null);
  const [reviews, setReviews] = useState<AgentReviewRequest[]>([]);
  const [scorecards, setScorecards] = useState<AgentScorecard[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [ov, rv, sc] = await Promise.all([
        fetch("/api/executive-loop/overview").then(r => r.json()).catch(() => null),
        fetch("/api/agent-review-requests?take=20").then(r => r.json()).catch(() => []),
        fetch("/api/agent-scorecards?latestOnly=true&take=20").then(r => r.json()).catch(() => []),
      ]);
      if (ov && ov.activeGoals) setOverview(ov);
      if (Array.isArray(rv)) setReviews(rv);
      if (Array.isArray(sc)) setScorecards(sc);
    } finally {
      setLoading(false);
    }
  }

  async function runLoop() {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch("/api/executive-loop/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerType: "manual" }),
      });
      const data = await res.json();
      if (res.ok) {
        setRunResult(data.summary ?? "Loop completed.");
        await loadAll();
      } else {
        setRunResult(`Error: ${data.error}`);
      }
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  const pendingReviews = reviews.filter(r => r.status === "pending" || r.status === "in_review");
  const topScorecards = [...scorecards].sort((a, b) => b.overallScore - a.overallScore);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-text-ghost animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Executive Loop</h1>
            <p className="text-xs text-text-muted mt-0.5">Goal-directed coordination engine</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runLoop}
              disabled={running}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-all",
                running
                  ? "bg-accent-violet/10 border-accent-violet/20 text-accent-violet opacity-70 cursor-not-allowed"
                  : "bg-accent-cyan/10 border-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/15"
              )}
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? "Running…" : "Run Executive Loop"}
            </button>
            <button
              onClick={loadAll}
              className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-text-secondary hover:bg-white/[0.06] transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Run result banner */}
        {runResult && (
          <div className={cn(
            "flex items-start gap-3 px-4 py-3 rounded-xl border text-xs",
            runResult.startsWith("Error")
              ? "bg-accent-red/[0.05] border-accent-red/20 text-accent-red"
              : "bg-accent-green/[0.05] border-accent-green/20 text-accent-green"
          )}>
            {runResult.startsWith("Error")
              ? <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              : <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            }
            <p className="leading-relaxed">{runResult}</p>
          </div>
        )}

        {/* Stats */}
        <div className="flex flex-wrap gap-3">
          <StatChip icon={<Target className="w-4 h-4" />} label="Active Goals" value={overview?.activeGoals.length ?? 0} />
          <StatChip icon={<GitFork className="w-4 h-4" />} label="Open Delegations" value={overview?.openDelegations ?? 0} alert />
          <StatChip icon={<MessageSquare className="w-4 h-4" />} label="Pending Reviews" value={overview?.pendingReviews ?? 0} alert />
          <StatChip icon={<Zap className="w-4 h-4" />} label="Loop Runs" value={overview?.recentRuns.length ?? 0} />
          <StatChip icon={<Trophy className="w-4 h-4" />} label="Scorecards" value={scorecards.length} />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left 2/3 */}
          <div className="lg:col-span-2 space-y-5">

            {/* Active Goals */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <SectionHeader
                  label="Agent Goals"
                  count={overview?.activeGoals.length ?? 0}
                  color="bg-accent-cyan/10 text-accent-cyan"
                />
                <AddGoalForm onCreated={loadAll} />
              </div>
              {!overview?.activeGoals.length ? (
                <EmptyCard text="No active goals. Add a goal to guide agent work." />
              ) : (
                <div className="space-y-2">
                  {overview.activeGoals.map(goal => {
                    const progress = goal.targetValue
                      ? Math.min(100, (goal.currentValue / goal.targetValue) * 100)
                      : null;
                    return (
                      <div key={goal.id} className="rounded-xl border border-white/[0.06] bg-surface-1 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0", GOAL_TYPE_COLORS[goal.goalType as GoalType] ?? "bg-white/[0.06] text-text-ghost")}>
                              {goal.goalType.toUpperCase()}
                            </span>
                            <p className="text-sm font-semibold text-text-primary truncate">{goal.title}</p>
                          </div>
                          <span className="text-[9px] text-text-ghost flex-shrink-0 ml-2">{goal.period}</span>
                        </div>
                        {goal.description && (
                          <p className="text-xs text-text-muted mb-2 leading-relaxed line-clamp-2">{goal.description}</p>
                        )}
                        {goal.targetMetric && (
                          <p className="text-[10px] text-text-ghost mb-2">Metric: {goal.targetMetric}</p>
                        )}
                        {progress !== null && (
                          <div className="mb-1">
                            <div className="flex justify-between text-[9px] text-text-ghost mb-1">
                              <span>Progress</span>
                              <span>{goal.currentValue} / {goal.targetValue}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/[0.06]">
                              <div
                                className="h-1.5 rounded-full bg-accent-cyan transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[9px] text-text-ghost">
                            {goal.agent?.name ?? "Unknown agent"}
                          </span>
                          <span className="text-[9px] text-text-ghost">{fmtDate(goal.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Latest Loop Run */}
            {overview?.latestRun && (
              <div>
                <SectionHeader label="Latest Loop Run" color="bg-accent-violet/10 text-accent-violet" />
                <div className="rounded-xl border border-white/[0.06] bg-surface-1 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-semibold", STATUS_COLORS[overview.latestRun.status] ?? "text-text-secondary")}>
                        {overview.latestRun.status}
                      </span>
                      <span className="text-[9px] text-text-ghost px-1.5 py-0.5 rounded bg-white/[0.04]">
                        {overview.latestRun.triggerType}
                      </span>
                    </div>
                    <span className="text-[9px] text-text-ghost">{timeAgo(overview.latestRun.startedAt)}</span>
                  </div>
                  {overview.latestRun.summary && (
                    <p className="text-xs text-text-secondary mb-3 leading-relaxed">{overview.latestRun.summary}</p>
                  )}
                  <div className="flex items-center gap-4 text-[10px] text-text-muted">
                    <span>{overview.latestRun.createdDelegations} delegations</span>
                    <span>{overview.latestRun.createdMessages} messages</span>
                    <span>{overview.latestRun.createdWorkspaces} workspaces</span>
                  </div>
                  {overview.latestRun.decisions && (() => {
                    try {
                      const decisions: string[] = JSON.parse(overview.latestRun.decisions!);
                      if (decisions.length === 0) return null;
                      return (
                        <div className="mt-3 pt-3 border-t border-white/[0.04] space-y-1.5">
                          <p className="text-[9px] text-text-ghost uppercase tracking-widest mb-2">Decisions</p>
                          {decisions.slice(0, 5).map((d, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <div className="w-1 h-1 rounded-full bg-accent-violet mt-1.5 flex-shrink-0" />
                              <p className="text-[10px] text-text-muted leading-snug">{d}</p>
                            </div>
                          ))}
                        </div>
                      );
                    } catch { return null; }
                  })()}
                </div>
              </div>
            )}

            {/* Loop History */}
            <div>
              <SectionHeader
                label="Loop History"
                count={overview?.recentRuns.length ?? 0}
              />
              {!overview?.recentRuns.length ? (
                <EmptyCard text="No loop runs yet. Click 'Run Executive Loop' to start." />
              ) : (
                <div className="space-y-2">
                  {overview.recentRuns.slice(1).map(run => (
                    <div key={run.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.05] bg-surface-1">
                      <span className={cn("w-2 h-2 rounded-full flex-shrink-0",
                        run.status === "completed" ? "bg-accent-green" :
                        run.status === "failed" ? "bg-accent-red" : "bg-accent-amber"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-secondary truncate">{run.summary ?? "No summary"}</p>
                        <p className="text-[9px] text-text-ghost mt-0.5">
                          {run.createdDelegations}d · {run.createdMessages}m · {run.triggerType}
                        </p>
                      </div>
                      <span className="text-[9px] text-text-ghost flex-shrink-0">{timeAgo(run.startedAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Agent Scorecards */}
            {topScorecards.length > 0 && (
              <div>
                <SectionHeader
                  label="Agent Scorecards"
                  count={topScorecards.length}
                  color="bg-accent-amber/10 text-accent-amber"
                />
                <div className="space-y-2">
                  {topScorecards.map(sc => (
                    <div key={sc.id} className="rounded-xl border border-white/[0.06] bg-surface-1 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{sc.agent?.name ?? sc.agentId}</p>
                          {sc.agent?.role && (
                            <p className="text-[10px] text-text-ghost mt-0.5">{sc.agent.role}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className={cn(
                            "px-2 py-1 rounded-lg text-sm font-bold font-mono",
                            sc.overallScore >= 7 ? "bg-accent-green/10 text-accent-green" :
                            sc.overallScore >= 4 ? "bg-accent-amber/10 text-accent-amber" :
                            "bg-accent-red/10 text-accent-red"
                          )}>
                            {sc.overallScore.toFixed(1)}
                          </div>
                          <span className="text-[9px] text-text-ghost">/ 10</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
                        <ScoreBar label="Reliability" score={sc.reliabilityScore} color="bg-accent-cyan" />
                        <ScoreBar label="Execution" score={sc.executionScore} color="bg-accent-violet" />
                        <ScoreBar label="Quality" score={sc.qualityScore} color="bg-accent-green" />
                        <ScoreBar label="Usefulness" score={sc.usefulnessScore} color="bg-accent-amber" />
                      </div>
                      <div className="flex items-center gap-3 text-[9px] text-text-ghost">
                        <span>{sc.runsCompleted} runs</span>
                        <span>{sc.delegationsCompleted}/{sc.delegationsAssigned} delegations</span>
                        <span>{sc.memoriesCreated} memories</span>
                        {sc.approvalsCreated > 0 && (
                          <span>{sc.approvalsApproved}/{sc.approvalsCreated} approvals</span>
                        )}
                      </div>
                      {sc.summary && (
                        <p className="text-[10px] text-text-ghost mt-2 leading-snug line-clamp-2">{sc.summary}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right 1/3 */}
          <div className="space-y-5">

            {/* Pending Review Requests */}
            <div>
              <SectionHeader
                label="Review Requests"
                count={reviews.length}
                color={pendingReviews.length > 0 ? "bg-accent-amber/10 text-accent-amber" : undefined}
              />
              {reviews.length === 0 ? (
                <EmptyCard text="No review requests yet." />
              ) : (
                <div className="space-y-2">
                  {reviews.map(r => (
                    <div key={r.id} className={cn(
                      "rounded-xl border p-3",
                      r.status === "pending" ? "border-accent-amber/20 bg-accent-amber/[0.03]" : "border-white/[0.05] bg-surface-1"
                    )}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn("text-[9px] font-bold", STATUS_COLORS[r.status] ?? "text-text-ghost")}>
                          {r.status.replace("_", " ").toUpperCase()}
                        </span>
                        <span className="text-[9px] text-text-ghost">{timeAgo(r.createdAt)}</span>
                      </div>
                      <p className="text-xs font-medium text-text-primary leading-snug mb-1 line-clamp-1">{r.subject}</p>
                      <p className="text-[10px] text-text-muted leading-snug line-clamp-2">{r.content}</p>
                      <p className="text-[9px] text-text-ghost mt-1">
                        {(r.requestedByAgent as { name?: string } | null)?.name ?? "Unknown"} → {(r.reviewerAgent as { name?: string } | null)?.name ?? "Unknown"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top performers */}
            {(overview?.topAgent || overview?.weakestAgent) && (
              <div className="space-y-2">
                {overview.topAgent && (
                  <div className="rounded-xl border border-accent-green/20 bg-accent-green/[0.03] p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="w-3.5 h-3.5 text-accent-green" />
                      <p className="text-[9px] font-semibold text-accent-green uppercase tracking-widest">Top Performer</p>
                    </div>
                    <p className="text-xs font-semibold text-text-primary">
                      {(overview.topAgent.agent as { name?: string } | null)?.name ?? "Unknown"}
                    </p>
                    <p className="text-[10px] text-text-muted">Overall: {overview.topAgent.overallScore.toFixed(1)}/10</p>
                  </div>
                )}
                {overview.weakestAgent && overview.weakestAgent.agentId !== overview.topAgent?.agentId && (
                  <div className="rounded-xl border border-accent-amber/20 bg-accent-amber/[0.03] p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-accent-amber" />
                      <p className="text-[9px] font-semibold text-accent-amber uppercase tracking-widest">Needs Attention</p>
                    </div>
                    <p className="text-xs font-semibold text-text-primary">
                      {(overview.weakestAgent.agent as { name?: string } | null)?.name ?? "Unknown"}
                    </p>
                    <p className="text-[10px] text-text-muted">Overall: {overview.weakestAgent.overallScore.toFixed(1)}/10</p>
                  </div>
                )}
              </div>
            )}

            {/* Generate Scorecards button */}
            <button
              onClick={async () => {
                await fetch("/api/agent-scorecards/generate", { method: "POST" });
                await loadAll();
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-text-secondary text-xs font-medium hover:bg-white/[0.06] transition-all"
            >
              <Star className="w-3.5 h-3.5" />
              Generate Scorecards (7-day)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
