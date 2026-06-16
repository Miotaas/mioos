"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import type { WorkforceApproval, UnifiedDraft, DraftType } from "@/types";
import {
  CheckCircle2, XCircle, ChevronLeft, Clock, CheckCheck, Loader2,
} from "lucide-react";

type DecisionSource = "approval" | "draft";

interface DecisionItem {
  id: string;
  source: DecisionSource;
  title: string;
  team: string;
  typeTag: string;
  urgency: "red" | "amber" | "cyan";
  createdAt: string;
  approval?: WorkforceApproval;
  draft?: UnifiedDraft;
}

const DRAFT_TYPE_LABELS: Record<DraftType, string> = {
  email:       "Email draft",
  campaign:    "Campaign draft",
  content:     "Content draft",
  product:     "Product draft",
  proposal:    "Proposal draft",
  development: "Dev draft",
};

const URGENCY_BAR: Record<"red" | "amber" | "cyan", string> = {
  red:   "bg-accent-red",
  amber: "bg-accent-amber",
  cyan:  "bg-accent-cyan",
};

const URGENCY_TEXT: Record<"red" | "amber" | "cyan", string> = {
  red:   "text-accent-red",
  amber: "text-accent-amber",
  cyan:  "text-accent-cyan",
};

function fmtTime(iso: string): string {
  const d = new Date(iso), now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diff < 1)    return "just now";
  if (diff < 60)   return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function approvalUrgency(priority: string): "red" | "amber" | "cyan" {
  return priority === "urgent" ? "red" : "amber";
}

function toDecisionItems(approvals: WorkforceApproval[], drafts: UnifiedDraft[]): DecisionItem[] {
  const approvalItems: DecisionItem[] = approvals.map(a => ({
    id:        a.id,
    source:    "approval",
    title:     a.title,
    team:      a.sourceTeam?.name ?? "Unknown team",
    typeTag:   "workforce approval",
    urgency:   approvalUrgency(a.priority),
    createdAt: a.createdAt,
    approval:  a,
  }));

  const draftItems: DecisionItem[] = drafts
    .filter(d => d.status === "review_needed")
    .map(d => ({
      id:        d.id,
      source:    "draft",
      title:     d.title,
      team:      d.sourceTeamName ?? "Unknown team",
      typeTag:   DRAFT_TYPE_LABELS[d.draftType] ?? d.draftType,
      urgency:   "cyan" as const,
      createdAt: d.createdAt,
      draft:     d,
    }));

  const urgencyOrder: Record<string, number> = { red: 0, amber: 1, cyan: 2 };
  return [...approvalItems, ...draftItems].sort((a, b) => {
    const uDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (uDiff !== 0) return uDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function DecisionsView() {
  const { showToast } = useAppStore();

  const [items, setItems]     = useState<DecisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DecisionItem | null>(null);
  const [acting, setActing]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [approvalRes, draftRes] = await Promise.all([
        fetch("/api/workforce-approvals?status=pending"),
        fetch("/api/drafts?limit=50"),
      ]);
      const approvals: WorkforceApproval[] = approvalRes.ok ? await approvalRes.json() : [];
      const drafts: UnifiedDraft[] = draftRes.ok ? await draftRes.json() : [];
      setItems(toDecisionItems(
        Array.isArray(approvals) ? approvals : [],
        Array.isArray(drafts) ? drafts : [],
      ));
    } catch {
      // empty state shown
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function removeItem(id: string) {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === id);
      const next = prev.filter(i => i.id !== id);
      setSelected(next[Math.min(idx, next.length - 1)] ?? null);
      return next;
    });
  }

  async function handleApproval(item: DecisionItem, action: "approved" | "rejected") {
    setActing(true);
    try {
      const res = await fetch(`/api/workforce-approvals/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      if (!res.ok) throw new Error();
      showToast(action === "approved" ? "Approved" : "Rejected");
      removeItem(item.id);
    } catch {
      showToast("Action failed", "error");
    } finally {
      setActing(false);
    }
  }

  async function handleDraft(item: DecisionItem, action: "approved" | "rejected" | "archived") {
    if (!item.draft) return;
    setActing(true);
    try {
      const res = await fetch(`/api/drafts/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftType: item.draft.draftType, status: action }),
      });
      if (!res.ok) throw new Error();
      showToast(action === "approved" ? "Approved" : action === "rejected" ? "Rejected" : "Archived");
      removeItem(item.id);
    } catch {
      showToast("Action failed", "error");
    } finally {
      setActing(false);
    }
  }

  function handleDefer(item: DecisionItem) {
    removeItem(item.id);
    showToast("Deferred");
  }

  const urgentCount = items.filter(i => i.urgency === "red").length;

  return (
    <div className="h-full flex overflow-hidden">

      {/* ── Left panel: List ── */}
      <div className={cn(
        "flex flex-col overflow-hidden transition-all duration-200",
        selected
          ? "hidden md:flex md:w-[380px] md:flex-shrink-0 border-r border-white/[0.05]"
          : "flex-1"
      )}>
        <div className="px-6 pt-8 pb-4 border-b border-white/[0.05] flex-shrink-0">
          <p className="text-[11px] text-text-ghost font-medium tracking-widest uppercase mb-2">Operations</p>
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] font-semibold text-text-primary tracking-tight leading-tight flex-1">
              Decisions
            </h1>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {urgentCount > 0 && (
                <span className="text-[11px] font-bold text-accent-red bg-accent-red/10 border border-accent-red/20 px-2 py-0.5 rounded-lg">
                  {urgentCount} urgent
                </span>
              )}
              {items.length > 0 && (
                <span className="text-[11px] text-text-muted bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-lg">
                  {items.length}
                </span>
              )}
            </div>
          </div>
          <p className="text-[12px] text-text-muted mt-1">
            Review and approve team requests
          </p>
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <Loader2 className="w-5 h-5 text-text-ghost animate-spin" />
              <p className="text-[12px] text-text-ghost">Loading decisions…</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-center px-6">
              <CheckCheck className="w-8 h-8 text-text-ghost opacity-30" />
              <p className="text-[14px] text-text-muted font-medium">No decisions waiting</p>
              <p className="text-[12px] text-text-ghost">All clear — teams are operating normally</p>
            </div>
          ) : items.map(item => (
            <DecisionListItem
              key={item.id}
              item={item}
              selected={selected?.id === item.id}
              onSelect={() => setSelected(item)}
            />
          ))}
        </div>
      </div>

      {/* ── Right panel: Detail ── */}
      {selected ? (
        <DecisionDetail
          item={selected}
          acting={acting}
          onClose={() => setSelected(null)}
          onApprovalAction={(action) => handleApproval(selected, action)}
          onDraftAction={(action) => handleDraft(selected, action)}
          onDefer={() => handleDefer(selected)}
        />
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-[#08101e] border-l border-white/[0.04]">
          <div className="text-center">
            <CheckCheck className="w-10 h-10 text-text-ghost opacity-20 mx-auto mb-3" />
            <p className="text-[13px] text-text-ghost">Select a decision to review</p>
          </div>
        </div>
      )}
    </div>
  );
}

function DecisionListItem({
  item, selected, onSelect,
}: {
  item: DecisionItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left flex items-stretch rounded-xl overflow-hidden border transition-all",
        selected
          ? "bg-white/[0.04] border-accent-cyan/15"
          : "bg-[#0b1020] border-white/[0.05] hover:border-white/[0.09] hover:bg-[#0d1220]"
      )}
    >
      <div className={cn("w-[3px] flex-shrink-0", URGENCY_BAR[item.urgency])} />
      <div className="flex-1 min-w-0 px-3 py-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-text-ghost mb-0.5 truncate">{item.team}</p>
            <p className="text-[13px] text-text-secondary font-medium leading-snug truncate">{item.title}</p>
            <p className={cn("text-[10px] mt-0.5", URGENCY_TEXT[item.urgency])}>{item.typeTag}</p>
          </div>
          <span className="text-[10px] text-text-ghost flex-shrink-0 flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            {fmtTime(item.createdAt)}
          </span>
        </div>
      </div>
    </button>
  );
}

function DecisionDetail({
  item, acting, onClose, onApprovalAction, onDraftAction, onDefer,
}: {
  item: DecisionItem;
  acting: boolean;
  onClose: () => void;
  onApprovalAction: (action: "approved" | "rejected") => void;
  onDraftAction: (action: "approved" | "rejected" | "archived") => void;
  onDefer: () => void;
}) {
  const approval = item.approval;
  const draft    = item.draft;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#08101e] border-l border-white/[0.04]">
      <div className="px-5 py-4 border-b border-white/[0.05] flex-shrink-0">
        <div className="flex items-start gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-ghost hover:text-text-muted hover:bg-white/[0.04] transition-colors flex-shrink-0 mt-0.5"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded border",
                item.urgency === "red"   ? "text-accent-red   bg-accent-red/10   border-accent-red/20"   :
                item.urgency === "amber" ? "text-accent-amber bg-accent-amber/10 border-accent-amber/20" :
                                           "text-accent-cyan  bg-accent-cyan/10  border-accent-cyan/20"
              )}>
                {item.typeTag}
              </span>
              <span className="text-[11px] text-text-ghost">{item.team}</span>
            </div>
            <h2 className="text-[16px] font-semibold text-text-primary leading-snug">{item.title}</h2>
            <p className="text-[11px] text-text-ghost mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {fmtTime(item.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {approval && (
          <>
            {approval.description && (
              <div>
                <p className="text-[11px] text-text-ghost uppercase tracking-[0.1em] font-medium mb-2">What the team wants to do</p>
                <p className="text-[13px] text-text-secondary leading-relaxed">{approval.description}</p>
              </div>
            )}
            {approval.reason && (
              <div>
                <p className="text-[11px] text-text-ghost uppercase tracking-[0.1em] font-medium mb-2">Why</p>
                <p className="text-[13px] text-text-secondary leading-relaxed">{approval.reason}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-[10px] text-text-ghost uppercase tracking-[0.08em] mb-1">Urgency</p>
                <span className={cn(
                  "text-[11px] font-medium px-2 py-0.5 rounded border capitalize",
                  approval.priority === "urgent" ? "text-accent-red   bg-accent-red/10   border-accent-red/20"   :
                  approval.priority === "high"   ? "text-accent-amber bg-accent-amber/10 border-accent-amber/20" :
                                                   "text-text-muted   bg-white/[0.04]    border-white/[0.06]"
                )}>
                  {approval.priority}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-text-ghost uppercase tracking-[0.08em] mb-1">Risk</p>
                <span className="text-[11px] text-text-muted capitalize">{approval.riskLevel}</span>
              </div>
            </div>
          </>
        )}

        {draft && (
          <>
            {draft.draftType === "email" && (draft.subject || draft.recipientName) && (
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] space-y-1">
                {draft.subject && (
                  <p className="text-[12px] text-text-secondary">
                    <span className="text-text-ghost">Subject:</span> {draft.subject}
                  </p>
                )}
                {draft.recipientName && (
                  <p className="text-[12px] text-text-secondary">
                    <span className="text-text-ghost">To:</span> {draft.recipientName}
                    {draft.recipientEmail ? ` <${draft.recipientEmail}>` : ""}
                  </p>
                )}
              </div>
            )}
            {draft.draftType === "content" && draft.platform && (
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <p className="text-[12px] text-text-secondary capitalize">
                  <span className="text-text-ghost">Platform:</span> {draft.platform}
                </p>
              </div>
            )}
            {draft.draftType === "proposal" && draft.customer && (
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <p className="text-[12px] text-text-secondary">
                  <span className="text-text-ghost">Customer:</span> {draft.customer}
                </p>
              </div>
            )}
            {draft.editableContent && (
              <div>
                <p className="text-[11px] text-text-ghost uppercase tracking-[0.1em] font-medium mb-2">Content</p>
                <pre className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-[12px] text-text-secondary leading-relaxed font-mono whitespace-pre-wrap overflow-x-auto">
                  {draft.editableContent}
                </pre>
              </div>
            )}
            {draft.preview && !draft.editableContent && (
              <div>
                <p className="text-[11px] text-text-ghost uppercase tracking-[0.1em] font-medium mb-2">Preview</p>
                <p className="text-[13px] text-text-secondary leading-relaxed">{draft.preview}</p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-6 py-4 border-t border-white/[0.05] flex-shrink-0">
        {item.source === "approval" ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onApprovalAction("approved")}
              disabled={acting}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green text-[13px] font-medium hover:bg-accent-green/15 transition-all disabled:opacity-50"
            >
              {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Approve
            </button>
            <button
              onClick={() => onApprovalAction("rejected")}
              disabled={acting}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-accent-red/20 text-accent-red text-[13px] font-medium hover:bg-accent-red/10 transition-all disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
            <button
              onClick={onDefer}
              disabled={acting}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/[0.08] text-text-ghost text-[13px] hover:bg-white/[0.04] hover:text-text-muted transition-all disabled:opacity-50"
            >
              Defer
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDraftAction("approved")}
              disabled={acting}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green text-[13px] font-medium hover:bg-accent-green/15 transition-all disabled:opacity-50"
            >
              {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Approve
            </button>
            <button
              onClick={() => onDraftAction("rejected")}
              disabled={acting}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-accent-red/20 text-accent-red text-[13px] font-medium hover:bg-accent-red/10 transition-all disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
            <button
              onClick={() => onDraftAction("archived")}
              disabled={acting}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/[0.08] text-text-ghost text-[13px] hover:bg-white/[0.04] hover:text-text-muted transition-all disabled:opacity-50"
            >
              Archive
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
