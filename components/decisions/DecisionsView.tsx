"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import type { WorkforceApproval, UnifiedDraft, DraftType } from "@/types";
import {
  CheckCircle2, XCircle, ChevronLeft, Clock, CheckCheck, Loader2,
  DollarSign, Users, AlertTriangle, Target,
} from "lucide-react";

// ── Category system ────────────────────────────────────────────────────

type DecisionCategory = "Financial" | "External Contact" | "High Risk" | "Strategic" | "Content";

function resolveCategory(decisionType: string, riskLevel: string): DecisionCategory {
  const dt = decisionType?.toLowerCase() ?? "";
  if (["financial_transaction","financial","trade","trade_execution","inventory","inventory_purchase","contract","budget"].some(t => dt.includes(t))) return "Financial";
  if (["outreach","campaign","content_publish","publish","proposal_send","product_launch","email","launch"].some(t => dt.includes(t))) return "External Contact";
  if (riskLevel === "high" || riskLevel === "critical" || dt.includes("external_action")) return "High Risk";
  if (["content","draft","media"].some(t => dt.includes(t))) return "Content";
  return "Strategic";
}

function decisionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    outreach:              "Customer Outreach",
    campaign_launch:       "Campaign Launch",
    campaign:              "Campaign Launch",
    financial_transaction: "Financial Transaction",
    financial:             "Financial",
    product_launch:        "Product Launch",
    content_publish:       "Content Publish",
    publish:               "Content Publish",
    contract:              "Contract",
    external_action:       "External Action",
    trade:                 "Trade Execution",
    trade_execution:       "Trade Execution",
    inventory:             "Inventory Purchase",
    inventory_purchase:    "Inventory Purchase",
    partnership:           "Partnership",
    proposal_send:         "Proposal",
    hiring:                "Hiring",
    email:                 "Email Outreach",
    campaign_draft:        "Campaign Draft",
    content:               "Content Review",
    proposal:              "Proposal Review",
    development:           "Development Review",
    product:               "Product Review",
  };
  const key = type?.toLowerCase() ?? "";
  return labels[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const CATEGORY_CONFIG: Record<DecisionCategory, { color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  "Financial":        { color: "#22C55E", Icon: DollarSign },
  "External Contact": { color: "#F59E0B", Icon: Users },
  "High Risk":        { color: "#EF4444", Icon: AlertTriangle },
  "Strategic":        { color: "#6366f1", Icon: Target },
  "Content":          { color: "#00D4FF", Icon: CheckCircle2 },
};

// ── Types ──────────────────────────────────────────────────────────────

type DecisionSource = "approval" | "draft";
type UrgencyLevel   = "red" | "amber" | "cyan";

interface DecisionItem {
  id:        string;
  source:    DecisionSource;
  title:     string;
  team:      string;
  typeTag:   string;
  category:  DecisionCategory;
  urgency:   UrgencyLevel;
  createdAt: string;
  approval?: WorkforceApproval;
  draft?:    UnifiedDraft;
}

const DRAFT_TYPE_LABELS: Record<DraftType, string> = {
  email:       "Email Draft",
  campaign:    "Campaign Draft",
  content:     "Content Draft",
  product:     "Product Draft",
  proposal:    "Proposal Draft",
  development: "Dev Draft",
};

const URGENCY_BAR: Record<UrgencyLevel, string> = {
  red:   "bg-[#EF4444]",
  amber: "bg-[#F59E0B]",
  cyan:  "bg-[#00D4FF]",
};

function fmtTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1)    return "just now";
  if (diff < 60)   return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function toDecisionItems(approvals: WorkforceApproval[], drafts: UnifiedDraft[]): DecisionItem[] {
  const approvalItems: DecisionItem[] = approvals.map(a => ({
    id:        a.id,
    source:    "approval",
    title:     a.title,
    team:      a.sourceTeam?.name ?? "Workforce",
    typeTag:   decisionTypeLabel(a.decisionType ?? ""),
    category:  resolveCategory(a.decisionType ?? "", a.riskLevel ?? ""),
    urgency:   a.priority === "urgent" ? "red" : "amber",
    createdAt: a.createdAt,
    approval:  a,
  }));

  const draftItems: DecisionItem[] = drafts
    .filter(d => d.status === "review_needed")
    .map(d => ({
      id:        d.id,
      source:    "draft",
      title:     d.title,
      team:      d.sourceTeamName ?? "Workforce",
      typeTag:   DRAFT_TYPE_LABELS[d.draftType] ?? d.draftType,
      category:  "Content" as DecisionCategory,
      urgency:   "cyan" as UrgencyLevel,
      createdAt: d.createdAt,
      draft:     d,
    }));

  const order: Record<UrgencyLevel, number> = { red: 0, amber: 1, cyan: 2 };
  return [...approvalItems, ...draftItems].sort((a, b) => {
    const u = order[a.urgency] - order[b.urgency];
    return u !== 0 ? u : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

// ── Main component ─────────────────────────────────────────────────────

type FilterMode = "all" | "red" | "amber" | "Financial" | "External Contact";

export function DecisionsView() {
  const { showToast } = useAppStore();

  const [items,    setItems]    = useState<DecisionItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<DecisionItem | null>(null);
  const [acting,   setActing]   = useState(false);
  const [filter,   setFilter]   = useState<FilterMode>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ar, dr] = await Promise.all([
        fetch("/api/workforce-approvals?status=pending"),
        fetch("/api/drafts?limit=50"),
      ]);
      const approvals: WorkforceApproval[] = ar.ok ? await ar.json() : [];
      const drafts:    UnifiedDraft[]      = dr.ok ? await dr.json() : [];
      setItems(toDecisionItems(
        Array.isArray(approvals) ? approvals : [],
        Array.isArray(drafts)    ? drafts    : [],
      ));
    } catch { /* empty state */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function removeItem(id: string) {
    setItems(prev => {
      const idx  = prev.findIndex(i => i.id === id);
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
    } catch { showToast("Action failed", "error"); } finally { setActing(false); }
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
    } catch { showToast("Action failed", "error"); } finally { setActing(false); }
  }

  function handleDefer(item: DecisionItem) {
    removeItem(item.id);
    showToast("Deferred");
  }

  const urgentCount = items.filter(i => i.urgency === "red").length;

  const visibleItems = items.filter(item => {
    if (filter === "all")              return true;
    if (filter === "red")              return item.urgency === "red";
    if (filter === "amber")            return item.urgency === "amber";
    if (filter === "Financial")        return item.category === "Financial";
    if (filter === "External Contact") return item.category === "External Contact";
    return true;
  });

  return (
    <div className="h-full flex overflow-hidden">

      {/* ── Left panel ────────────────────────────────────────── */}
      <div className={cn(
        "flex flex-col overflow-hidden transition-all duration-200",
        selected
          ? "hidden md:flex md:w-[360px] md:flex-shrink-0 border-r border-white/[0.05]"
          : "flex-1"
      )}>
        {/* Header */}
        <div className="px-6 pt-7 pb-4 border-b border-white/[0.05] flex-shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-[26px] font-semibold text-text-primary tracking-tight leading-tight flex-1">
              Decide
            </h1>
            <div className="flex items-center gap-1.5">
              {urgentCount > 0 && (
                <span className="text-[10px] font-bold text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 px-2 py-0.5 rounded-lg">
                  {urgentCount} urgent
                </span>
              )}
              {items.length > 0 && (
                <span className="text-[10px] text-text-muted bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-lg">
                  {items.length}
                </span>
              )}
            </div>
          </div>
          <p className="text-[12px] text-text-muted">
            Executive decisions awaiting your call
          </p>
        </div>

        {/* Filter bar */}
        {items.length > 0 && (
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.04] overflow-x-auto flex-shrink-0">
            {(["all", "red", "amber", "Financial", "External Contact"] as FilterMode[]).map(f => {
              const count =
                f === "all"              ? items.length :
                f === "red"              ? items.filter(i => i.urgency === "red").length :
                f === "amber"            ? items.filter(i => i.urgency === "amber").length :
                f === "Financial"        ? items.filter(i => i.category === "Financial").length :
                f === "External Contact" ? items.filter(i => i.category === "External Contact").length : 0;
              if (count === 0 && f !== "all") return null;
              const label =
                f === "all"   ? "All" :
                f === "red"   ? "Urgent" :
                f === "amber" ? "High" : f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "text-[10px] px-2.5 py-1 rounded-lg whitespace-nowrap transition-all font-medium",
                    filter === f
                      ? f === "red"   ? "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/25" :
                        f === "amber" ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/25" :
                        "bg-white/[0.07] text-text-secondary border border-white/[0.1]"
                      : "text-text-ghost hover:text-text-muted hover:bg-white/[0.03]"
                  )}
                >
                  {label} {count > 0 && <span className="opacity-60 ml-0.5">{count}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2.5 px-3 space-y-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <Loader2 className="w-5 h-5 text-text-ghost animate-spin" />
              <p className="text-[12px] text-text-ghost">Loading decisions…</p>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-center px-6">
              <CheckCheck className="w-8 h-8 text-text-ghost opacity-25" />
              <p className="text-[14px] text-text-muted font-medium">All clear</p>
              <p className="text-[12px] text-text-ghost">
                {filter !== "all" ? "No items match this filter." : "Nothing requires your attention right now."}
              </p>
            </div>
          ) : visibleItems.map(item => (
            <DecisionListItem
              key={item.id}
              item={item}
              selected={selected?.id === item.id}
              onSelect={() => setSelected(item)}
            />
          ))}
        </div>
      </div>

      {/* ── Right panel ───────────────────────────────────────── */}
      {selected ? (
        <DecisionDetail
          item={selected}
          acting={acting}
          onClose={() => setSelected(null)}
          onApprovalAction={action => handleApproval(selected, action)}
          onDraftAction={action => handleDraft(selected, action)}
          onDefer={() => handleDefer(selected)}
        />
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-[#08101e] border-l border-white/[0.04]">
          <div className="text-center">
            <CheckCheck className="w-9 h-9 text-text-ghost opacity-20 mx-auto mb-3" />
            <p className="text-[13px] text-text-ghost">Select a decision to review</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── DecisionListItem ───────────────────────────────────────────────────

function DecisionListItem({
  item, selected, onSelect,
}: {
  item: DecisionItem; selected: boolean; onSelect: () => void;
}) {
  const catConfig = CATEGORY_CONFIG[item.category];
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left flex items-stretch rounded-xl overflow-hidden border transition-all",
        selected
          ? "bg-white/[0.05] border-white/[0.1]"
          : "bg-[#0b1020] border-white/[0.05] hover:border-white/[0.09] hover:bg-[#0d1220]"
      )}
    >
      <div className={cn("w-[3px] flex-shrink-0", URGENCY_BAR[item.urgency])} />
      <div className="flex-1 min-w-0 px-3 py-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-text-ghost mb-0.5 truncate">{item.team}</p>
            <p className="text-[13px] text-text-secondary font-medium leading-snug truncate">{item.title}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                style={{ color: catConfig.color, backgroundColor: `${catConfig.color}18` }}
              >
                {item.category}
              </span>
              <span className="text-[10px] text-text-ghost">{item.typeTag}</span>
            </div>
          </div>
          <span className="text-[10px] text-text-ghost flex-shrink-0 flex items-center gap-0.5 mt-0.5">
            <Clock className="w-2.5 h-2.5" />
            {fmtTime(item.createdAt)}
          </span>
        </div>
      </div>
    </button>
  );
}

// ── DecisionDetail ─────────────────────────────────────────────────────

function DecisionDetail({
  item, acting, onClose, onApprovalAction, onDraftAction, onDefer,
}: {
  item:              DecisionItem;
  acting:            boolean;
  onClose:           () => void;
  onApprovalAction:  (action: "approved" | "rejected") => void;
  onDraftAction:     (action: "approved" | "rejected" | "archived") => void;
  onDefer:           () => void;
}) {
  const { approval, draft } = item;
  const catConfig = CATEGORY_CONFIG[item.category];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#08101e] border-l border-white/[0.04]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.05] flex-shrink-0">
        <div className="flex items-start gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-ghost hover:text-text-muted hover:bg-white/[0.04] transition-colors flex-shrink-0 mt-0.5"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded border"
                style={{ color: catConfig.color, backgroundColor: `${catConfig.color}18`, borderColor: `${catConfig.color}30` }}
              >
                {item.category}
              </span>
              <span className="text-[10px] text-text-ghost">{item.typeTag}</span>
              <span className="text-[10px] text-text-ghost">·</span>
              <span className="text-[10px] text-text-ghost">{item.team}</span>
            </div>
            <h2 className="text-[16px] font-semibold text-text-primary leading-snug">{item.title}</h2>
            <p className="text-[11px] text-text-ghost mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {fmtTime(item.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {approval && (
          <>
            {approval.description && (
              <div>
                <p className="text-[10px] text-text-ghost uppercase tracking-[0.12em] font-semibold mb-2">
                  Requested Action
                </p>
                <p className="text-[13px] text-text-secondary leading-relaxed">{approval.description}</p>
              </div>
            )}
            {approval.reason && (
              <div>
                <p className="text-[10px] text-text-ghost uppercase tracking-[0.12em] font-semibold mb-2">
                  Business Case
                </p>
                <p className="text-[13px] text-text-secondary leading-relaxed">{approval.reason}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-text-ghost uppercase tracking-[0.08em] mb-1.5">Urgency</p>
                <span className={cn(
                  "text-[11px] font-medium px-2.5 py-1 rounded-lg border capitalize inline-block",
                  approval.priority === "urgent" ? "text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20" :
                  approval.priority === "high"   ? "text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20" :
                                                   "text-text-muted bg-white/[0.04] border-white/[0.07]"
                )}>
                  {approval.priority}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-text-ghost uppercase tracking-[0.08em] mb-1.5">Risk Level</p>
                <span className="text-[11px] text-text-muted capitalize">{approval.riskLevel ?? "Standard"}</span>
              </div>
            </div>
          </>
        )}

        {draft && (
          <>
            {draft.draftType === "email" && (draft.subject || draft.recipientName) && (
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05] space-y-1.5">
                {draft.subject && (
                  <p className="text-[12px] text-text-secondary">
                    <span className="text-text-ghost">Subject: </span>{draft.subject}
                  </p>
                )}
                {draft.recipientName && (
                  <p className="text-[12px] text-text-secondary">
                    <span className="text-text-ghost">To: </span>{draft.recipientName}
                    {draft.recipientEmail ? ` <${draft.recipientEmail}>` : ""}
                  </p>
                )}
              </div>
            )}
            {draft.draftType === "content" && draft.platform && (
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <p className="text-[12px] text-text-secondary capitalize">
                  <span className="text-text-ghost">Platform: </span>{draft.platform}
                </p>
              </div>
            )}
            {draft.draftType === "proposal" && draft.customer && (
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <p className="text-[12px] text-text-secondary">
                  <span className="text-text-ghost">Customer: </span>{draft.customer}
                </p>
              </div>
            )}
            {draft.editableContent && (
              <div>
                <p className="text-[10px] text-text-ghost uppercase tracking-[0.12em] font-semibold mb-2">Content</p>
                <pre className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-[12px] text-text-secondary leading-relaxed font-mono whitespace-pre-wrap overflow-x-auto">
                  {draft.editableContent}
                </pre>
              </div>
            )}
            {draft.preview && !draft.editableContent && (
              <div>
                <p className="text-[10px] text-text-ghost uppercase tracking-[0.12em] font-semibold mb-2">Preview</p>
                <p className="text-[13px] text-text-secondary leading-relaxed">{draft.preview}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action bar */}
      <div className="px-6 py-4 border-t border-white/[0.05] flex-shrink-0">
        {item.source === "approval" ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onApprovalAction("approved")}
              disabled={acting}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-[13px] font-medium hover:bg-[#22C55E]/15 transition-all disabled:opacity-50"
            >
              {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Approve
            </button>
            <button
              onClick={() => onApprovalAction("rejected")}
              disabled={acting}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#EF4444]/20 text-[#EF4444] text-[13px] font-medium hover:bg-[#EF4444]/10 transition-all disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
            <button
              onClick={onDefer}
              disabled={acting}
              className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-text-ghost text-[13px] hover:bg-white/[0.04] hover:text-text-muted transition-all disabled:opacity-50"
            >
              Defer
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDraftAction("approved")}
              disabled={acting}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-[13px] font-medium hover:bg-[#22C55E]/15 transition-all disabled:opacity-50"
            >
              {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Approve
            </button>
            <button
              onClick={() => onDraftAction("rejected")}
              disabled={acting}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#EF4444]/20 text-[#EF4444] text-[13px] font-medium hover:bg-[#EF4444]/10 transition-all disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
            <button
              onClick={() => onDraftAction("archived")}
              disabled={acting}
              className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-text-ghost text-[13px] hover:bg-white/[0.04] hover:text-text-muted transition-all disabled:opacity-50"
            >
              Archive
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
