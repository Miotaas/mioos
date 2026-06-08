"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { Agent, AgentRun, ApprovalQueueItem } from "@/types";
import {
  Activity, CheckCircle2, XCircle, Clock, Zap,
  Filter, CheckSquare, ChevronDown,
} from "lucide-react";

type Filter = "all" | "approvals" | "runs" | "completed" | "failed";

interface TimelineItem {
  id: string;
  kind: "approval" | "run";
  agentName: string;
  title: string;
  detail?: string;
  status: string;
  time: string;
  urgent?: boolean;
  approvalId?: string;
  actionType?: string;
}

function fmtTime(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMins < 1)    return "just now";
  if (diffMins < 60)   return `${diffMins}m ago`;
  if (diffMins < 1440) {
    const hhmm = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    return `Today ${hhmm}`;
  }
  const yest = new Date(now); yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString())
    return `Yesterday ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function describeRun(run: AgentRun, agentType?: string): string {
  if (run.status === "running")   return "Currently running";
  if (run.status === "failed")    return "Run failed";
  if (run.status === "completed") {
    if (agentType === "sales")     return "Found new prospects";
    if (agentType === "research")  return "Research completed";
    if (agentType === "strategy")  return "Strategic brief updated";
    if (agentType === "executive") return "Goal review completed";
    if (agentType === "fulfillment") return "Delivery task completed";
    return "Task completed";
  }
  return "Run queued";
}

export function ActivityView() {
  const { setActiveView } = useAppStore();

  const [agents, setAgents]         = useState<Agent[]>([]);
  const [approvals, setApprovals]   = useState<ApprovalQueueItem[]>([]);
  const [filter, setFilter]         = useState<Filter>("all");
  const [approving, setApproving]   = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/agents").then(r => r.json()).catch(() => []),
      fetch("/api/approvals").then(r => r.json()).catch(() => []),
    ]).then(([ag, ap]) => {
      setAgents(Array.isArray(ag) ? ag : []);
      setApprovals(Array.isArray(ap) ? ap : []);
    });
  }, []);

  async function handleApproval(id: string, decision: "approved" | "rejected") {
    setApproving(prev => ({ ...prev, [id]: true }));
    try {
      await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: decision }),
      });
      setApprovals(prev => prev.filter(a => a.id !== id));
    } finally {
      setApproving(prev => ({ ...prev, [id]: false }));
    }
  }

  // Build unified timeline
  const runItems: TimelineItem[] = agents.flatMap(agent =>
    (agent.runs ?? []).map(run => ({
      id:        run.id,
      kind:      "run" as const,
      agentName: agent.name,
      title:     describeRun(run, agent.agentType),
      status:    run.status,
      time:      run.completedAt ?? run.startedAt ?? run.createdAt,
    }))
  );

  const approvalItems: TimelineItem[] = approvals.map(ap => ({
    id:          ap.id,
    kind:        "approval" as const,
    agentName:   ap.agentRun?.agent?.name ?? "Agent",
    title:       "Approval requested",
    detail:      ap.actionType,
    status:      ap.status,
    time:        ap.createdAt,
    urgent:      ap.status === "pending",
    approvalId:  ap.id,
    actionType:  ap.actionType,
  }));

  const allItems = [...approvalItems, ...runItems]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const filtered = allItems.filter(item => {
    if (filter === "all")        return true;
    if (filter === "approvals")  return item.kind === "approval";
    if (filter === "runs")       return item.kind === "run";
    if (filter === "completed")  return item.status === "completed";
    if (filter === "failed")     return item.status === "failed";
    return true;
  });

  const pendingCount = approvals.filter(a => a.status === "pending").length;

  const filters: { id: Filter; label: string; count?: number }[] = [
    { id: "all",       label: "All" },
    { id: "approvals", label: "Approvals", count: pendingCount || undefined },
    { id: "runs",      label: "Runs" },
    { id: "completed", label: "Completed" },
    { id: "failed",    label: "Failed" },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[860px] mx-auto px-4 md:px-8 py-6 md:py-10 pb-28 md:pb-10 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] text-text-ghost uppercase tracking-[0.1em] mb-1">Agent OS</p>
            <h1 className="text-2xl md:text-3xl font-semibold text-text-primary tracking-tight">Activity</h1>
            <p className="text-[12px] text-text-muted mt-1">Company event stream — approvals, runs, completions</p>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-amber/10 border border-accent-amber/20 text-accent-amber text-[12px] font-medium flex-shrink-0">
              <Clock className="w-3.5 h-3.5" />
              {pendingCount} pending
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all border",
                filter === f.id
                  ? "bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/20"
                  : "text-text-muted border-white/[0.05] hover:text-text-secondary hover:bg-white/[0.03]"
              )}
            >
              {f.label}
              {f.count != null && (
                <span className={cn(
                  "w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center",
                  filter === f.id ? "bg-[#00D4FF]/20 text-[#00D4FF]" : "bg-accent-amber/20 text-accent-amber"
                )}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-[#0e1324] py-12 text-center">
              <Activity className="w-6 h-6 text-text-ghost mx-auto mb-3 opacity-30" />
              <p className="text-[13px] text-text-muted">No activity to show</p>
              <button
                onClick={() => setActiveView("agents")}
                className="text-[12px] text-[#00D4FF] mt-1 hover:opacity-80 transition-opacity"
              >
                Trigger an agent →
              </button>
            </div>
          ) : filtered.map(item => (
            <div
              key={`${item.kind}-${item.id}`}
              className={cn(
                "rounded-2xl border bg-[#0e1324] overflow-hidden transition-colors",
                item.urgent
                  ? "border-accent-amber/20 bg-accent-amber/[0.03]"
                  : "border-white/[0.06] hover:border-white/[0.09]"
              )}
            >
              <div className="flex items-start gap-4 px-5 py-4">
                {/* Status icon */}
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
                  item.status === "completed" ? "bg-accent-green/10" :
                  item.status === "running"   ? "bg-[#00D4FF]/10" :
                  item.status === "failed"    ? "bg-accent-red/10" :
                  item.status === "pending"   ? "bg-accent-amber/10" :
                  "bg-white/[0.04]"
                )}>
                  {item.status === "completed" ? <CheckCircle2 className="w-4 h-4 text-accent-green" /> :
                   item.status === "running"   ? <Zap className="w-4 h-4 text-[#00D4FF]" /> :
                   item.status === "failed"    ? <XCircle className="w-4 h-4 text-accent-red" /> :
                   item.status === "pending"   ? <Clock className="w-4 h-4 text-accent-amber" /> :
                   <Activity className="w-4 h-4 text-text-ghost" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[13px] font-medium text-text-primary">{item.agentName}</p>
                    {item.kind === "approval" && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent-amber/10 text-accent-amber uppercase tracking-wide">
                        Approval
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-text-secondary">{item.title}</p>
                  {item.detail && (
                    <p className="text-[11px] text-text-muted mt-0.5 font-mono">{item.detail}</p>
                  )}
                </div>

                {/* Time + actions */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="text-[11px] text-text-ghost tabular-nums whitespace-nowrap">{fmtTime(item.time)}</span>
                  {item.kind === "approval" && item.status === "pending" && item.approvalId && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproval(item.approvalId!, "rejected")}
                        disabled={approving[item.approvalId!]}
                        className="px-3 py-1 rounded-lg border border-accent-red/20 text-accent-red text-[11px] font-medium hover:bg-accent-red/10 transition-all disabled:opacity-50"
                      >
                        Deny
                      </button>
                      <button
                        onClick={() => handleApproval(item.approvalId!, "approved")}
                        disabled={approving[item.approvalId!]}
                        className="px-3 py-1 rounded-lg bg-accent-green/10 border border-accent-green/20 text-accent-green text-[11px] font-medium hover:bg-accent-green/15 transition-all disabled:opacity-50"
                      >
                        {approving[item.approvalId!] ? "..." : "Approve"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
