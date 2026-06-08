"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import type { Agent, AgentRun, ApprovalQueueItem, ParsedAgentOutput } from "@/types";
import {
  Cpu, Bot, Activity, ShieldCheck, CheckCircle2, XCircle,
  Clock, AlertCircle, ArrowRight, Play, Zap,
} from "lucide-react";

function fmtDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60000)}m`;
}

function fmtRelative(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  completed: { label: "Completed", color: "#10b981", bg: "#10b98115" },
  running:   { label: "Running",   color: "#06b6d4", bg: "#06b6d415" },
  pending:   { label: "Pending",   color: "#f59e0b", bg: "#f59e0b15" },
  failed:    { label: "Failed",    color: "#ef4444", bg: "#ef444415" },
  cancelled: { label: "Cancelled", color: "#475569", bg: "#47556915" },
};

const AGENT_STATUS_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  active:   { color: "#10b981", bg: "#10b98115", dot: "bg-accent-green" },
  paused:   { color: "#f59e0b", bg: "#f59e0b15", dot: "bg-accent-amber" },
  disabled: { color: "#475569", bg: "#47556915", dot: "bg-text-muted" },
};

export function AgentDashboard() {
  const { setActiveView, showToast } = useAppStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [approvals, setApprovals] = useState<ApprovalQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/agents").then((r) => r.json()).catch(() => []),
      fetch("/api/approvals").then((r) => r.json()).catch(() => []),
    ]).then(([a, ap]) => {
      const agentList: Agent[] = Array.isArray(a) ? a : [];
      setAgents(agentList);
      setApprovals(Array.isArray(ap) ? ap : []);
      // collect all runs from agents
      const allRuns: AgentRun[] = agentList.flatMap((ag) => ag.runs ?? []);
      allRuns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRuns(allRuns.slice(0, 20));
      setLoading(false);
    });
  }, []);

  async function runAgent(agentId: string, agentName: string) {
    showToast(`Starting ${agentName}...`);
    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      if (!res.ok) throw new Error();
      showToast(`${agentName} completed`);
      // refresh
      const [a, ap] = await Promise.all([
        fetch("/api/agents").then((r) => r.json()).catch(() => []),
        fetch("/api/approvals").then((r) => r.json()).catch(() => []),
      ]);
      const agentList: Agent[] = Array.isArray(a) ? a : [];
      setAgents(agentList);
      setApprovals(Array.isArray(ap) ? ap : []);
      const allRuns = agentList.flatMap((ag) => ag.runs ?? []);
      allRuns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRuns(allRuns.slice(0, 20));
    } catch {
      showToast("Run failed", "error");
    }
  }

  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.status === "active").length;
  const runningRuns = runs.filter((r) => r.status === "running").length;
  const completedRuns = runs.filter((r) => r.status === "completed").length;
  const failedRuns = runs.filter((r) => r.status === "failed").length;
  const pendingApprovals = approvals.filter((a) => a.status === "pending").length;
  const recentRuns = runs.slice(0, 6);

  // latest run output for the first completed run
  const latestCompleted = runs.find((r) => r.status === "completed");
  let latestOutput: ParsedAgentOutput | null = null;
  if (latestCompleted?.output) {
    try { latestOutput = JSON.parse(latestCompleted.output) as ParsedAgentOutput; } catch { /* ignore */ }
  }
  const latestAgent = agents.find((a) => a.id === latestCompleted?.agentId);

  return (
    <div className="h-full overflow-y-auto bg-void">
      <div className="max-w-[1080px] mx-auto px-6 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium text-text-ghost uppercase tracking-widest mb-1">
              MioOS · Agent OS
            </p>
            <h1 className="text-[22px] font-semibold text-text-primary tracking-tight leading-none">
              Agent <span className="text-accent-cyan">Dashboard</span>
            </h1>
            <p className="text-sm text-text-secondary mt-1.5">
              {loading ? "Loading..." : (
                pendingApprovals > 0
                  ? <span><span className="text-accent-amber font-medium">{pendingApprovals} approval{pendingApprovals !== 1 ? "s" : ""}</span> waiting for review.</span>
                  : <span className="text-text-muted">All agents nominal. No pending approvals.</span>
              )}
            </p>
          </div>
          {pendingApprovals > 0 && (
            <button
              onClick={() => setActiveView("activity")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-amber/10 border border-accent-amber/20 text-accent-amber text-xs font-medium hover:bg-accent-amber/15 transition-all flex-shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {pendingApprovals} pending
            </button>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-6 gap-3">
          {[
            { label: "Total Agents", value: totalAgents, color: "#06b6d4", view: "agents" as const },
            { label: "Active", value: activeAgents, color: "#10b981", view: "agents" as const },
            { label: "Running", value: runningRuns, color: "#3b82f6", view: "activity" as const },
            { label: "Completed", value: completedRuns, color: "#10b981", view: "activity" as const },
            { label: "Failed", value: failedRuns, color: failedRuns > 0 ? "#ef4444" : "#475569", view: "activity" as const },
            { label: "Pending Approvals", value: pendingApprovals, color: pendingApprovals > 0 ? "#f59e0b" : "#475569", view: "activity" as const },
          ].map(({ label, value, color, view }) => (
            <button
              key={label}
              onClick={() => setActiveView(view)}
              className="p-3 rounded-xl border border-white/[0.06] bg-surface-1 text-left hover:border-white/[0.1] transition-all"
              style={{ background: `linear-gradient(135deg, #12121c 0%, ${color}08 100%)` }}
            >
              <p className="text-xl font-bold font-mono leading-none mb-1" style={{ color }}>{value}</p>
              <p className="text-[10px] text-text-muted leading-tight">{label}</p>
            </button>
          ))}
        </div>

        {/* Two-col: Agent List + Recent Runs */}
        <div className="grid grid-cols-2 gap-4">

          {/* Active Agents */}
          <div className="rounded-xl border border-white/[0.06] bg-surface-1 overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3.5 pb-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <Bot className="w-3.5 h-3.5 text-accent-cyan" />
                <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Agents</span>
              </div>
              <button onClick={() => setActiveView("agents")} className="text-[10px] text-text-muted hover:text-text-secondary flex items-center gap-1 transition-colors">
                Registry <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="p-3 space-y-1.5">
              {loading && <p className="text-xs text-text-muted py-4 text-center">Loading...</p>}
              {!loading && agents.length === 0 && (
                <div className="py-6 text-center">
                  <Bot className="w-6 h-6 mx-auto mb-2 text-text-ghost" />
                  <p className="text-xs text-text-muted">No agents configured yet.</p>
                  <button onClick={() => setActiveView("agents")} className="text-xs text-accent-cyan mt-1 hover:underline">Create your first agent</button>
                </div>
              )}
              {agents.map((agent) => {
                const cfg = AGENT_STATUS_CONFIG[agent.status] ?? AGENT_STATUS_CONFIG.disabled;
                const lastRun = agent.runs?.[0];
                return (
                  <div key={agent.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-2 border border-white/[0.04] group">
                    <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">{agent.name}</p>
                      <p className="text-[10px] text-text-muted capitalize">{agent.agentType.replace("_", " ")}</p>
                    </div>
                    {lastRun && (
                      <span className="text-[10px] text-text-ghost flex-shrink-0">{fmtRelative(lastRun.createdAt)}</span>
                    )}
                    {agent.status === "active" && (
                      <button
                        onClick={() => runAgent(agent.id, agent.name)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/20 transition-all flex-shrink-0"
                        title="Run now"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Runs */}
          <div className="rounded-xl border border-white/[0.06] bg-surface-1 overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3.5 pb-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-accent-cyan" />
                <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Recent Runs</span>
              </div>
              <button onClick={() => setActiveView("activity")} className="text-[10px] text-text-muted hover:text-text-secondary flex items-center gap-1 transition-colors">
                All runs <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="p-3 space-y-1">
              {!loading && recentRuns.length === 0 && (
                <div className="py-6 text-center">
                  <Activity className="w-6 h-6 mx-auto mb-2 text-text-ghost" />
                  <p className="text-xs text-text-muted">No runs yet.</p>
                </div>
              )}
              {recentRuns.map((run) => {
                const cfg = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.pending;
                const agentName = agents.find((a) => a.id === run.agentId)?.name ?? "Unknown Agent";
                return (
                  <div key={run.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                    {run.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5 text-accent-green flex-shrink-0" />}
                    {run.status === "failed" && <XCircle className="w-3.5 h-3.5 text-accent-red flex-shrink-0" />}
                    {run.status === "running" && <Zap className="w-3.5 h-3.5 text-accent-cyan flex-shrink-0" />}
                    {run.status === "pending" && <Clock className="w-3.5 h-3.5 text-accent-amber flex-shrink-0" />}
                    {run.status === "cancelled" && <AlertCircle className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text-primary truncate">{agentName}</p>
                      <p className="text-[10px] text-text-muted">{fmtRelative(run.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-text-ghost">{fmtDuration(run.startedAt, run.completedAt)}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Latest Output */}
        {latestOutput && latestCompleted && (
          <div className="rounded-xl border border-white/[0.06] bg-surface-1 overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3.5 pb-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-accent-cyan" />
                <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Latest Output</span>
                {latestAgent && (
                  <span className="text-[10px] text-text-ghost">— {latestAgent.name}</span>
                )}
              </div>
              <span className="text-[10px] text-text-ghost">{fmtRelative(latestCompleted.createdAt)}</span>
            </div>
            <div className="p-4 space-y-4">
              {latestOutput.summary && (
                <p className="text-sm text-text-secondary leading-relaxed">{latestOutput.summary}</p>
              )}
              {latestOutput.recommendations.length > 0 && (
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-2">Recommendations</p>
                  <ul className="space-y-1.5">
                    {latestOutput.recommendations.slice(0, 4).map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                        <span className="text-accent-cyan mt-0.5 flex-shrink-0">→</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {latestOutput.insights.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {latestOutput.insights.map((ins, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 rounded-lg bg-surface-3 border border-white/[0.06] text-text-muted">{ins}</span>
                  ))}
                </div>
              )}
              {(latestCompleted.approvals?.length ?? 0) > 0 && (
                <button
                  onClick={() => setActiveView("activity")}
                  className="flex items-center gap-2 text-xs text-accent-amber bg-accent-amber/10 border border-accent-amber/20 rounded-lg px-3 py-2 hover:bg-accent-amber/15 transition-all"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {latestCompleted.approvals?.length} proposed action{(latestCompleted.approvals?.length ?? 0) !== 1 ? "s" : ""} waiting for approval
                  <ArrowRight className="w-3 h-3 ml-auto" />
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
