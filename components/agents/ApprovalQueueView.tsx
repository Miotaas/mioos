"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import type { ApprovalQueueItem, ParsedProposedAction } from "@/types";
import { ShieldCheck, CheckCircle2, XCircle, Clock, AlertCircle, Filter } from "lucide-react";
import { Button } from "@/components/ui/Button";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: "Pending",  color: "#f59e0b", bg: "#f59e0b15" },
  approved: { label: "Approved", color: "#10b981", bg: "#10b98115" },
  rejected: { label: "Rejected", color: "#ef4444", bg: "#ef444415" },
};

const ACTION_TYPE_COLOR: Record<string, string> = {
  create_task:        "#10b981",
  update_lead_status: "#8b5cf6",
  flag_issue:         "#ef4444",
  schedule_followup:  "#3b82f6",
  create_note:        "#06b6d4",
  archive_lead:       "#f59e0b",
};

function fmtDate(d: string): string {
  return new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function ApprovalCard({
  item,
  onApprove,
  onReject,
  processing,
}: {
  item: ApprovalQueueItem;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  processing: string | null;
}) {
  let parsed: ParsedProposedAction | null = null;
  try { parsed = JSON.parse(item.proposedAction) as ParsedProposedAction; } catch { /* ignore */ }

  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
  const actionColor = ACTION_TYPE_COLOR[item.actionType] ?? "#475569";
  const agentName = item.agentRun?.agent?.name ?? "Unknown Agent";
  const isPending = item.status === "pending";

  return (
    <div className={cn(
      "rounded-xl border bg-surface-1 overflow-hidden transition-all",
      isPending ? "border-accent-amber/20" : "border-white/[0.06]",
    )}>
      <div className="px-4 py-3.5 flex flex-col gap-3 md:flex-row md:items-start">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Action type badge */}
          <div className="flex-shrink-0 mt-0.5">
            <span
              className="text-[9px] px-2 py-1 rounded font-medium font-mono block"
              style={{ color: actionColor, background: `${actionColor}18` }}
            >
              {item.actionType}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-semibold text-text-primary">
                {parsed?.description ?? item.actionType}
              </p>
              {/* Status badge — visible on mobile inline */}
              <span className="md:hidden text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ml-auto" style={{ color: cfg.color, background: cfg.bg }}>
                {cfg.label}
              </span>
            </div>
            {(item.reason || parsed?.reason) && (
              <p className="text-[11px] text-text-muted leading-relaxed mb-2">
                {item.reason ?? parsed?.reason}
              </p>
            )}

            {parsed?.targetEntity && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-3 text-text-ghost font-mono">
                  {parsed.targetEntity}{parsed.targetId ? ` · ${parsed.targetId.slice(0, 8)}…` : ""}
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 text-[10px] text-text-ghost">
              <span>Agent: <span className="text-text-muted">{agentName}</span></span>
              <span>{fmtDate(item.createdAt)}</span>
            </div>

            {!isPending && item.approvedBy && (
              <p className="text-[10px] text-text-ghost mt-1">
                {item.status === "approved" ? "Approved" : "Rejected"} by {item.approvedBy}
                {item.approvedAt && ` · ${fmtDate(item.approvedAt)}`}
              </p>
            )}
          </div>
        </div>

        {/* Desktop: status badge + small buttons (right column) */}
        <div className="hidden md:flex flex-shrink-0 flex-col items-end gap-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ color: cfg.color, background: cfg.bg }}>
            {cfg.label}
          </span>
          {isPending && (
            <div className="flex gap-1.5">
              <button
                onClick={() => onReject(item.id)}
                disabled={processing === item.id}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent-red/10 border border-accent-red/20 text-accent-red text-[10px] font-medium hover:bg-accent-red/20 transition-all disabled:opacity-50"
              >
                <XCircle className="w-3 h-3" /> Reject
              </button>
              <button
                onClick={() => onApprove(item.id)}
                disabled={processing === item.id}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent-green/10 border border-accent-green/20 text-accent-green text-[10px] font-medium hover:bg-accent-green/20 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-3 h-3" /> Approve
              </button>
            </div>
          )}
        </div>

        {/* Mobile: full-width action buttons below content */}
        {isPending && (
          <div className="md:hidden flex gap-2">
            <button
              onClick={() => onReject(item.id)}
              disabled={processing === item.id}
              className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] px-3 py-2.5 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-xs font-medium hover:bg-accent-red/20 transition-all disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" /> Reject
            </button>
            <button
              onClick={() => onApprove(item.id)}
              disabled={processing === item.id}
              className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] px-3 py-2.5 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green text-xs font-medium hover:bg-accent-green/20 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" /> Approve
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ApprovalQueueView() {
  const { showToast } = useAppStore();
  const [approvals, setApprovals] = useState<ApprovalQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/approvals")
      .then((r) => r.json())
      .then((data) => { setApprovals(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleDecision(id: string, status: "approved" | "rejected") {
    setProcessing(id);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json() as ApprovalQueueItem;
      setApprovals((prev) => prev.map((a) => (a.id === id ? updated : a)));
      showToast(status === "approved" ? "Action approved" : "Action rejected");
    } catch {
      showToast("Failed to update approval", "error");
    } finally {
      setProcessing(null);
    }
  }

  async function approveAll() {
    const pending = approvals.filter((a) => a.status === "pending");
    for (const item of pending) {
      await handleDecision(item.id, "approved");
    }
  }

  async function rejectAll() {
    const pending = approvals.filter((a) => a.status === "pending");
    for (const item of pending) {
      await handleDecision(item.id, "rejected");
    }
  }

  const filtered = approvals.filter((a) => statusFilter === "all" || a.status === statusFilter);
  const pendingCount = approvals.filter((a) => a.status === "pending").length;
  const approvedCount = approvals.filter((a) => a.status === "approved").length;
  const rejectedCount = approvals.filter((a) => a.status === "rejected").length;

  return (
    <div className="h-full overflow-y-auto bg-void">
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-5 pb-20 md:pb-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium text-text-ghost uppercase tracking-widest mb-1">Agent OS</p>
            <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">
              Approval <span className="text-accent-cyan">Queue</span>
            </h1>
            <p className="text-sm text-text-secondary mt-1.5">
              {loading ? "Loading..." : pendingCount > 0
                ? <span><span className="text-accent-amber font-medium">{pendingCount} action{pendingCount !== 1 ? "s" : ""}</span> waiting for your review.</span>
                : <span className="text-text-muted">No pending approvals.</span>
              }
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="ghost" size="sm" onClick={rejectAll}>
                <XCircle className="w-3.5 h-3.5" /> Reject All
              </Button>
              <Button variant="primary" size="sm" onClick={approveAll}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve All
              </Button>
            </div>
          )}
        </div>

        {/* Stats + Filters */}
        <div className="flex items-center gap-3">
          <Filter className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
          {([
            ["all", `All (${approvals.length})`, "#475569"],
            ["pending", `Pending (${pendingCount})`, "#f59e0b"],
            ["approved", `Approved (${approvedCount})`, "#10b981"],
            ["rejected", `Rejected (${rejectedCount})`, "#ef4444"],
          ] as const).map(([val, label, color]) => (
            <button
              key={val}
              onClick={() => setStatusFilter(val)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg border transition-all",
                statusFilter === val
                  ? "border-white/[0.12] text-text-primary bg-white/[0.05]"
                  : "border-white/[0.04] text-text-muted hover:text-text-secondary",
              )}
              style={statusFilter === val ? { borderColor: `${color}40`, color } : {}}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Security Notice */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-surface-2 border border-white/[0.06]">
          <AlertCircle className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-text-muted leading-relaxed">
            <span className="text-text-secondary font-medium">Approval required.</span> No agent action modifies data until explicitly approved here.
            Approving queues the action for execution. Rejecting discards it permanently. Every decision is logged.
          </p>
        </div>

        {/* List */}
        {loading && <p className="text-xs text-text-muted text-center py-8">Loading approvals...</p>}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <ShieldCheck className="w-8 h-8 mx-auto mb-3 text-text-ghost" />
            <p className="text-sm text-text-muted">
              {statusFilter === "pending" ? "No pending approvals." : "No approvals found."}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((item) => (
            <ApprovalCard
              key={item.id}
              item={item}
              onApprove={(id) => handleDecision(id, "approved")}
              onReject={(id) => handleDecision(id, "rejected")}
              processing={processing}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
