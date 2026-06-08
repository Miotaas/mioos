"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import type { AgentRun, ParsedAgentOutput } from "@/types";
import { Activity, CheckCircle2, XCircle, Clock, Zap, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  completed: { label: "Completed", color: "#10b981", bg: "#10b98115" },
  running:   { label: "Running",   color: "#06b6d4", bg: "#06b6d415" },
  pending:   { label: "Pending",   color: "#f59e0b", bg: "#f59e0b15" },
  failed:    { label: "Failed",    color: "#ef4444", bg: "#ef444415" },
  cancelled: { label: "Cancelled", color: "#475569", bg: "#47556915" },
};

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="w-3.5 h-3.5 text-accent-green flex-shrink-0" />;
  if (status === "failed") return <XCircle className="w-3.5 h-3.5 text-accent-red flex-shrink-0" />;
  if (status === "running") return <Zap className="w-3.5 h-3.5 text-accent-cyan flex-shrink-0" />;
  if (status === "cancelled") return <AlertCircle className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />;
  return <Clock className="w-3.5 h-3.5 text-accent-amber flex-shrink-0" />;
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60000)}m`;
}

function RunCard({ run }: { run: AgentRun }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.pending;

  let parsedOutput: ParsedAgentOutput | null = null;
  if (run.output) {
    try { parsedOutput = JSON.parse(run.output) as ParsedAgentOutput; } catch { /* ignore */ }
  }

  return (
    <div className="border border-white/[0.06] rounded-xl bg-surface-1 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors text-left"
      >
        <StatusIcon status={run.status} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-primary truncate">
            {run.agent?.name ?? "Unknown Agent"}
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">{fmtDate(run.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {(run.approvals?.length ?? 0) > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-amber/15 text-accent-amber font-medium">
              {run.approvals?.length} action{(run.approvals?.length ?? 0) !== 1 ? "s" : ""}
            </span>
          )}
          <span className="text-[10px] text-text-ghost">{fmtDuration(run.startedAt, run.completedAt)}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-text-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-text-muted" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/[0.06] px-4 py-4 space-y-4">
          {run.error && (
            <div className="bg-accent-red/5 border border-accent-red/20 rounded-xl p-3">
              <p className="text-[10px] text-accent-red uppercase tracking-wider font-medium mb-1">Error</p>
              <p className="text-xs text-text-secondary font-mono">{run.error}</p>
            </div>
          )}

          {parsedOutput && (
            <div className="space-y-3">
              {parsedOutput.summary && (
                <div className="bg-surface-2 border border-white/[0.06] rounded-xl p-3">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-1.5">Summary</p>
                  <p className="text-xs text-text-secondary leading-relaxed">{parsedOutput.summary}</p>
                </div>
              )}

              {parsedOutput.recommendations.length > 0 && (
                <div className="bg-surface-2 border border-white/[0.06] rounded-xl p-3">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-2">Recommendations</p>
                  <ul className="space-y-1.5">
                    {parsedOutput.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                        <span className="text-accent-cyan mt-0.5 flex-shrink-0">→</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {parsedOutput.insights.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {parsedOutput.insights.map((ins, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 rounded-lg bg-surface-3 border border-white/[0.06] text-text-muted">{ins}</span>
                  ))}
                </div>
              )}

              {parsedOutput.proposedActions.length > 0 && (
                <div className="bg-surface-2 border border-white/[0.06] rounded-xl p-3">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-2">Proposed Actions ({parsedOutput.proposedActions.length})</p>
                  <div className="space-y-2">
                    {parsedOutput.proposedActions.map((action, i) => (
                      <div key={i} className="px-3 py-2 bg-surface-3 border border-accent-amber/15 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-amber/15 text-accent-amber font-medium font-mono">{action.actionType}</span>
                          {action.targetEntity && (
                            <span className="text-[9px] text-text-ghost">{action.targetEntity}</span>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary">{action.description}</p>
                        <p className="text-[10px] text-text-muted mt-0.5">{action.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!parsedOutput && !run.error && run.status === "completed" && (
            <p className="text-xs text-text-muted text-center py-2">No output available.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function AgentRunsView() {
  const { setActiveView } = useAppStore();
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => {
        const agentList = Array.isArray(data) ? data : [];
        setAgents(agentList);
        const allRuns: AgentRun[] = agentList.flatMap((a: AgentRun & { runs?: AgentRun[] }) =>
          (a.runs ?? []).map((r: AgentRun) => ({ ...r, agent: { id: a.id, name: (a as unknown as { name: string }).name, slug: (a as unknown as { slug: string }).slug } }))
        );
        allRuns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRuns(allRuns);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = runs.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (agentFilter !== "all" && r.agentId !== agentFilter) return false;
    return true;
  });

  const counts = {
    completed: runs.filter((r) => r.status === "completed").length,
    failed: runs.filter((r) => r.status === "failed").length,
    running: runs.filter((r) => r.status === "running").length,
  };

  return (
    <div className="h-full overflow-y-auto bg-void">
      <div className="max-w-[900px] mx-auto px-6 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium text-text-ghost uppercase tracking-widest mb-1">Agent OS</p>
            <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">
              Run <span className="text-accent-cyan">History</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-xs text-text-muted">
              <span><span className="text-accent-green font-semibold">{counts.completed}</span> completed</span>
              <span><span className="text-accent-red font-semibold">{counts.failed}</span> failed</span>
              <span><span className="text-accent-cyan font-semibold">{counts.running}</span> running</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}
            className="text-xs bg-surface-2 border border-white/[0.08] rounded-lg px-3 py-2 text-text-secondary focus:outline-none focus:border-accent-cyan/50">
            <option value="all">All agents</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <div className="flex gap-1">
            {["all", "completed", "failed", "running", "pending", "cancelled"].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn("text-xs px-2.5 py-1.5 rounded-lg capitalize border transition-all",
                  statusFilter === s
                    ? "bg-accent-cyan/15 border-accent-cyan/25 text-accent-cyan"
                    : "bg-surface-2 border-white/[0.06] text-text-muted hover:text-text-secondary")}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Run List */}
        {loading && <p className="text-xs text-text-muted text-center py-8">Loading runs...</p>}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <Activity className="w-8 h-8 mx-auto mb-3 text-text-ghost" />
            <p className="text-sm text-text-muted">No runs found.</p>
            <button onClick={() => setActiveView("agents")} className="text-xs text-accent-cyan mt-2 hover:underline">
              Go to Agent Registry to run an agent
            </button>
          </div>
        )}
        <div className="space-y-2">
          {filtered.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      </div>
    </div>
  );
}
