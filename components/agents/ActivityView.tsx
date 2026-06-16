"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { Agent, AgentRun, ApprovalQueueItem, WorkforceApproval, TeamHandoff, WorkforceOutput, Assignment, ActionResult } from "@/types";
import {
  Activity, CheckCircle2, XCircle, Clock, Zap, ArrowRight,
} from "lucide-react";

type Filter = "all" | "approvals" | "handoffs" | "activity" | "done";

interface TimelineItem {
  id: string;
  kind: "approval" | "workforce_approval" | "run" | "handoff" | "output" | "assignment";
  agentName: string;
  title: string;
  status: string;
  time: string;
  urgent?: boolean;
  approvalId?: string;
  workforceApprovalId?: string;
  handoffId?: string;
  teamName?: string;
  reason?: string;
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
    if (agentType === "sales")       return "Found new prospects";
    if (agentType === "research")    return "Research completed";
    if (agentType === "strategy")    return "Strategic brief updated";
    if (agentType === "executive")   return "Goal review completed";
    if (agentType === "fulfillment") return "Delivery task completed";
    return "Task completed";
  }
  return "Run queued";
}

export function ActivityView() {
  const { setActiveView, showToast } = useAppStore();

  const [agents, setAgents]                 = useState<Agent[]>([]);
  const [approvals, setApprovals]           = useState<ApprovalQueueItem[]>([]);
  const [workforceApprovals, setWApprovals] = useState<WorkforceApproval[]>([]);
  const [handoffs, setHandoffs]             = useState<TeamHandoff[]>([]);
  const [outputs, setOutputs]               = useState<WorkforceOutput[]>([]);
  const [assignments, setAssignments]       = useState<Assignment[]>([]);
  const [filter, setFilter]                 = useState<Filter>("all");
  const [approving, setApproving]           = useState<Record<string, boolean>>({});
  const [actionResults, setActionResults]   = useState<Record<string, ActionResult>>({});

  function humanizeAction(actionType?: string): string {
    if (!actionType) return "";
    const map: Record<string, string> = {
      create_memory:      "Store a memory",
      create_task:        "Create a task",
      create_note:        "Create a note",
      send_email:         "Send an email",
      update_lead:        "Update a lead",
      create_lead:        "Add a new lead",
      create_opportunity: "Add an opportunity",
      update_opportunity: "Update an opportunity",
      run_search:         "Run a web search",
      create_campaign:    "Start a campaign",
      update_memory:      "Update a memory",
      delete_memory:      "Remove a memory",
      create_prospect:    "Add a prospect",
    };
    return map[actionType] ?? actionType.replace(/_/g, " ");
  }

  function loadData() {
    Promise.all([
      fetch("/api/agents").then(r => r.json()).catch(() => []),
      fetch("/api/approvals").then(r => r.json()).catch(() => []),
      fetch("/api/workforce-approvals").then(r => r.json()).catch(() => []),
      fetch("/api/workforce/handoffs").then(r => r.json()).catch(() => []),
      fetch("/api/workforce/outputs").then(r => r.json()).catch(() => []),
      fetch("/api/assignments").then(r => r.json()).catch(() => []),
    ]).then(([ag, ap, wap, hf, out, ass]) => {
      setAgents(Array.isArray(ag) ? ag : []);
      setApprovals(Array.isArray(ap) ? ap : []);
      setWApprovals(Array.isArray(wap) ? wap : []);
      setHandoffs(Array.isArray(hf) ? hf : []);
      setOutputs(Array.isArray(out) ? out : []);
      setAssignments(Array.isArray(ass) ? ass : []);
    });
  }

  useEffect(() => { loadData(); }, []);

  async function handleApproval(id: string, decision: "approved" | "rejected") {
    setApproving(prev => ({ ...prev, [id]: true }));
    try {
      await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: decision }),
      });
      setApprovals(prev => prev.filter(a => a.id !== id));
      showToast(decision === "approved" ? "Approved" : "Rejected");
    } finally {
      setApproving(prev => ({ ...prev, [id]: false }));
    }
  }

  async function handleWorkforceApproval(id: string, decision: "approved" | "rejected") {
    setApproving(prev => ({ ...prev, [`w_${id}`]: true }));
    try {
      const res = await fetch(`/api/workforce-approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: decision }),
      });
      if (res.ok) {
        const data = await res.json();
        // Update approval in-place so the ActionResult status is visible
        if (data.approval) {
          setWApprovals(prev => prev.map(a => a.id === id ? { ...a, ...data.approval } : a));
        }
        if (data.actionResult) {
          setActionResults(prev => ({ ...prev, [id]: data.actionResult }));
        }
        const label = data.actionResult?.title ? ` — ${data.actionResult.title}` : "";
        showToast(decision === "approved" ? `Approved${label}` : "Rejected");
      } else {
        setWApprovals(prev => prev.filter(a => a.id !== id));
        showToast(decision === "approved" ? "Approved" : "Rejected");
      }
    } finally {
      setApproving(prev => ({ ...prev, [`w_${id}`]: false }));
    }
  }

  async function handleHandoff(id: string, newStatus: "accepted" | "in_progress" | "completed" | "rejected") {
    setApproving(prev => ({ ...prev, [`h_${id}`]: true }));
    try {
      const res = await fetch(`/api/workforce/handoffs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated: TeamHandoff = await res.json();
      setHandoffs(prev => prev.map(h => h.id === id ? updated : h));
      // Reload outputs to reflect any ownership/status changes
      fetch("/api/workforce/outputs").then(r => r.json()).then(out => {
        if (Array.isArray(out)) setOutputs(out);
      });
      showToast(
        newStatus === "accepted"   ? "Handoff accepted" :
        newStatus === "completed"  ? "Handoff completed" :
        newStatus === "rejected"   ? "Handoff rejected" :
        "Handoff updated"
      );
    } catch {
      showToast("Failed to update handoff");
    } finally {
      setApproving(prev => ({ ...prev, [`h_${id}`]: false }));
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
    id:         ap.id,
    kind:       "approval" as const,
    agentName:  ap.agentRun?.agent?.name ?? "Agent",
    title:      ap.actionType
                  ? `Wants to ${humanizeAction(ap.actionType).toLowerCase()}`
                  : "Requesting approval",
    status:     ap.status,
    time:       ap.createdAt,
    urgent:     ap.status === "pending",
    approvalId: ap.id,
  }));

  const workforceApprovalItems: TimelineItem[] = workforceApprovals.map(ap => ({
    id:                  ap.id,
    kind:                "workforce_approval" as const,
    agentName:           ap.sourceTeam?.name ?? "Team",
    teamName:            ap.sourceTeam?.name,
    title:               ap.title,
    status:              ap.status,
    time:                ap.createdAt,
    urgent:              ap.status === "pending" && ap.priority !== "low",
    workforceApprovalId: ap.id,
    reason:              ap.reason ?? undefined,
  }));

  const handoffItems: TimelineItem[] = handoffs.map(h => ({
    id:        h.id,
    kind:      "handoff" as const,
    agentName: h.fromTeam?.name ?? "Team",
    title:     `→ ${h.toTeam?.name ?? "team"}: ${h.title}`,
    status:    h.status,
    time:      h.acceptedAt ?? h.createdAt,
    urgent:    h.status === "pending" && h.priority !== "low",
    handoffId: h.id,
    reason:    h.description ?? undefined,
  }));

  // 5I: Output lifecycle events — one entry per meaningful status change
  const outputItems: TimelineItem[] = outputs.flatMap(o => {
    const events: TimelineItem[] = [];
    // Always show the "created" event (draft = just created)
    events.push({
      id:        o.id,
      kind:      "output" as const,
      agentName: o.team?.name ?? "Team",
      title:     o.title,
      status:    o.status,
      time:      o.createdAt,
      urgent:    false,
      reason:    o.outputType.replace(/_/g, " "),
    });
    // Approved event (distinct timestamp)
    if (o.approvedAt && o.approvedAt !== o.createdAt) {
      events.push({
        id:        `${o.id}_approved`,
        kind:      "output" as const,
        agentName: o.team?.name ?? "Team",
        title:     `✓ Approved: ${o.title}`,
        status:    "approved",
        time:      o.approvedAt,
        urgent:    false,
      });
    }
    // Completed event (distinct timestamp)
    if (o.completedAt && o.completedAt !== o.createdAt) {
      events.push({
        id:        `${o.id}_completed`,
        kind:      "output" as const,
        agentName: o.team?.name ?? "Team",
        title:     `Completed: ${o.title}`,
        status:    "completed",
        time:      o.completedAt,
        urgent:    false,
      });
    }
    return events;
  });

  // 6G: Assignment lifecycle events
  const assignmentItems: TimelineItem[] = assignments.flatMap(a => {
    const events: TimelineItem[] = [];
    events.push({
      id:        a.id,
      kind:      "assignment" as const,
      agentName: a.team?.name ?? "Team",
      title:     a.title,
      status:    a.status,
      time:      a.createdAt,
      urgent:    a.status === "review",
      reason:    a.priority,
    });
    if (a.startedAt && a.startedAt !== a.createdAt) {
      events.push({
        id:        `${a.id}_started`,
        kind:      "assignment" as const,
        agentName: a.team?.name ?? "Team",
        title:     `Started: ${a.title}`,
        status:    "active",
        time:      a.startedAt,
        urgent:    false,
      });
    }
    if (a.completedAt && a.completedAt !== a.createdAt) {
      events.push({
        id:        `${a.id}_completed`,
        kind:      "assignment" as const,
        agentName: a.team?.name ?? "Team",
        title:     `Completed: ${a.title}`,
        status:    "completed",
        time:      a.completedAt,
        urgent:    false,
      });
    }
    return events;
  });

  const allItems = [...approvalItems, ...workforceApprovalItems, ...handoffItems, ...runItems, ...outputItems, ...assignmentItems]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const filtered = allItems.filter(item => {
    if (filter === "all")       return true;
    if (filter === "approvals") return item.kind === "approval" || item.kind === "workforce_approval";
    if (filter === "handoffs")  return item.kind === "handoff";
    if (filter === "activity")  return item.kind === "run" || item.kind === "output" || item.kind === "assignment";
    if (filter === "done")      return item.status === "completed" || item.status === "approved";
    return true;
  });

  const pendingApprovals = approvals.filter(a => a.status === "pending").length
                         + workforceApprovals.filter(a => a.status === "pending").length;
  const pendingHandoffs  = handoffs.filter(h => h.status === "pending").length;

  const filters: { id: Filter; label: string; count?: number }[] = [
    { id: "all",       label: "All" },
    { id: "approvals", label: "Approvals", count: pendingApprovals || undefined },
    { id: "handoffs",  label: "Handoffs",  count: pendingHandoffs  || undefined },
    { id: "activity",  label: "Activity" },
    { id: "done",      label: "Done" },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[860px] mx-auto px-4 md:px-8 py-6 md:py-10 pb-28 md:pb-10 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] text-text-ghost font-medium tracking-[0.12em] uppercase mb-2">Cockpit</p>
            <h1 className="text-[32px] md:text-[40px] font-semibold text-text-primary tracking-tight leading-tight">Inbox</h1>
            <p className="text-[12px] text-text-muted mt-1">Decisions, approvals, and handoffs from your workforce</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {pendingApprovals > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-amber/10 border border-accent-amber/20 text-accent-amber text-[12px] font-medium">
                <Clock className="w-3.5 h-3.5" />
                {pendingApprovals} approval{pendingApprovals !== 1 ? "s" : ""}
              </div>
            )}
            {pendingHandoffs > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] text-[12px] font-medium">
                <ArrowRight className="w-3.5 h-3.5" />
                {pendingHandoffs} handoff{pendingHandoffs !== 1 ? "s" : ""}
              </div>
            )}
          </div>
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
                  "min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center",
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
              <p className="text-[13px] text-text-muted">Nothing here yet</p>
              <button
                onClick={() => setActiveView("workforce")}
                className="text-[12px] text-[#00D4FF] mt-1 hover:opacity-80 transition-opacity"
              >
                View your workforce →
              </button>
            </div>
          ) : filtered.map(item => {
            const handoffObj = item.kind === "handoff"
              ? handoffs.find(h => h.id === item.handoffId)
              : null;

            return (
              <div
                key={`${item.kind}-${item.id}`}
                className={cn(
                  "relative rounded-2xl border bg-[#0e1324] overflow-hidden transition-colors",
                  item.urgent
                    ? "border-accent-amber/25 bg-accent-amber/[0.04]"
                    : item.kind === "handoff" && item.status === "pending"
                    ? "border-[#00D4FF]/20 bg-[#00D4FF]/[0.02]"
                    : item.status === "completed" || item.status === "approved"
                    ? "border-white/[0.04] opacity-70 hover:opacity-90"
                    : "border-white/[0.06] hover:border-white/[0.09]"
                )}
              >
                {(item.urgent || (item.kind === "handoff" && item.status === "pending")) && (
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-[3px]",
                    item.urgent ? "bg-accent-amber/70" : "bg-[#00D4FF]/60"
                  )} />
                )}

                <div className={cn(
                  "flex items-start gap-4 py-4 pr-5",
                  (item.urgent || (item.kind === "handoff" && item.status === "pending")) ? "pl-7" : "pl-5"
                )}>
                  {/* Status icon */}
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
                    item.status === "completed" || item.status === "approved" ? "bg-accent-green/10" :
                    item.status === "running"   || item.status === "in_progress" ? "bg-[#00D4FF]/10" :
                    item.status === "failed"    || item.status === "rejected" ? "bg-accent-red/10" :
                    item.status === "pending"   || item.status === "accepted" ? "bg-accent-amber/10" :
                    "bg-white/[0.04]"
                  )}>
                    {(item.status === "completed" || item.status === "approved")
                      ? <CheckCircle2 className="w-4 h-4 text-accent-green" />
                      : (item.status === "running" || item.status === "in_progress")
                      ? <Zap className="w-4 h-4 text-[#00D4FF]" />
                      : (item.status === "failed" || item.status === "rejected")
                      ? <XCircle className="w-4 h-4 text-accent-red" />
                      : item.status === "accepted"
                      ? <ArrowRight className="w-4 h-4 text-accent-amber" />
                      : item.status === "pending"
                      ? <Clock className="w-4 h-4 text-accent-amber" />
                      : <Activity className="w-4 h-4 text-text-ghost" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-[13px] font-medium text-text-primary">{item.agentName}</p>
                      {item.kind === "approval" && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent-amber/10 text-accent-amber uppercase tracking-wide">
                          Approval
                        </span>
                      )}
                      {item.kind === "workforce_approval" && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent-amber/10 text-accent-amber uppercase tracking-wide">
                          Decision needed
                        </span>
                      )}
                      {item.kind === "handoff" && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#00D4FF]/10 text-[#00D4FF] uppercase tracking-wide">
                          Handoff
                        </span>
                      )}
                      {item.kind === "output" && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent-green/10 text-accent-green uppercase tracking-wide">
                          Output
                        </span>
                      )}
                      {item.kind === "assignment" && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent-cyan/10 text-accent-cyan uppercase tracking-wide">
                          Assignment
                        </span>
                      )}
                      {item.status !== "pending" && (
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] capitalize",
                          item.status === "completed" || item.status === "approved" ? "text-accent-green" :
                          item.status === "accepted"  || item.status === "in_progress" ? "text-[#00D4FF]" :
                          item.status === "rejected"  ? "text-accent-red" :
                          "text-text-ghost"
                        )}>
                          {item.status.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-text-secondary">{item.title}</p>
                    {item.reason && (
                      <p className="text-[11px] text-text-ghost mt-0.5 leading-relaxed">{item.reason}</p>
                    )}
                    {/* ActionResult — shown after workforce approval dispatch */}
                    {item.kind === "workforce_approval" && item.workforceApprovalId && actionResults[item.workforceApprovalId] && (
                      <p className={cn(
                        "text-[10px] mt-0.5 font-medium",
                        actionResults[item.workforceApprovalId].status === "failed"
                          ? "text-accent-red"
                          : "text-accent-green"
                      )}>
                        {actionResults[item.workforceApprovalId].status === "failed" ? "⚠ " : "✓ "}
                        {actionResults[item.workforceApprovalId].title}
                      </p>
                    )}
                    {/* Handoff lifecycle info */}
                    {handoffObj?.acceptedAt && (
                      <p className="text-[10px] text-text-ghost mt-0.5">
                        Accepted {fmtTime(handoffObj.acceptedAt)}
                      </p>
                    )}
                  </div>

                  {/* Time + actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-[11px] text-text-ghost tabular-nums whitespace-nowrap">{fmtTime(item.time)}</span>

                    {/* Legacy agent approval */}
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
                          {approving[item.approvalId!] ? "…" : "Approve"}
                        </button>
                      </div>
                    )}

                    {/* Workforce approval */}
                    {item.kind === "workforce_approval" && item.status === "pending" && item.workforceApprovalId && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleWorkforceApproval(item.workforceApprovalId!, "rejected")}
                          disabled={approving[`w_${item.workforceApprovalId!}`]}
                          className="px-3 py-1 rounded-lg border border-accent-red/20 text-accent-red text-[11px] font-medium hover:bg-accent-red/10 transition-all disabled:opacity-50"
                        >
                          Deny
                        </button>
                        <button
                          onClick={() => handleWorkforceApproval(item.workforceApprovalId!, "approved")}
                          disabled={approving[`w_${item.workforceApprovalId!}`]}
                          className="px-3 py-1 rounded-lg bg-accent-green/10 border border-accent-green/20 text-accent-green text-[11px] font-medium hover:bg-accent-green/15 transition-all disabled:opacity-50"
                        >
                          {approving[`w_${item.workforceApprovalId!}`] ? "…" : "Approve"}
                        </button>
                      </div>
                    )}

                    {/* Handoff: pending → accept or reject */}
                    {item.kind === "handoff" && item.status === "pending" && item.handoffId && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleHandoff(item.handoffId!, "rejected")}
                          disabled={approving[`h_${item.handoffId}`]}
                          className="px-3 py-1 rounded-lg border border-accent-red/20 text-accent-red text-[11px] font-medium hover:bg-accent-red/10 transition-all disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleHandoff(item.handoffId!, "accepted")}
                          disabled={approving[`h_${item.handoffId}`]}
                          className="px-3 py-1 rounded-lg bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] text-[11px] font-medium hover:bg-[#00D4FF]/15 transition-all disabled:opacity-50"
                        >
                          {approving[`h_${item.handoffId}`] ? "…" : "Accept"}
                        </button>
                      </div>
                    )}

                    {/* Handoff: accepted → mark complete */}
                    {item.kind === "handoff" && (item.status === "accepted" || item.status === "in_progress") && item.handoffId && (
                      <button
                        onClick={() => handleHandoff(item.handoffId!, "completed")}
                        disabled={approving[`h_${item.handoffId}`]}
                        className="px-3 py-1 rounded-lg bg-accent-green/10 border border-accent-green/20 text-accent-green text-[11px] font-medium hover:bg-accent-green/15 transition-all disabled:opacity-50"
                      >
                        {approving[`h_${item.handoffId}`] ? "…" : "Mark complete"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
