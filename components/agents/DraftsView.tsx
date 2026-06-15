"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import type { UnifiedDraft, DraftType } from "@/types";
import {
  FileText, Mail, Megaphone, FileCode, Package, HandshakeIcon,
  Search, ChevronRight, X, CheckCircle2, XCircle, Archive,
  Clock, AlertCircle, Loader2, Building2, FolderOpen,
} from "lucide-react";

// ── constants ────────────────────────────────────────────────────

const DRAFT_TYPE_LABELS: Record<DraftType, string> = {
  email:       "Email",
  campaign:    "Campaign",
  content:     "Content",
  product:     "Product",
  proposal:    "Proposal",
  development: "Development",
};

const DRAFT_TYPE_ICONS: Record<DraftType, React.ComponentType<{ className?: string }>> = {
  email:       Mail,
  campaign:    Megaphone,
  content:     FileText,
  product:     Package,
  proposal:    HandshakeIcon,
  development: FileCode,
};

const DRAFT_TYPE_COLORS: Record<DraftType, string> = {
  email:       "text-accent-cyan   bg-accent-cyan/10   border-accent-cyan/20",
  campaign:    "text-accent-amber  bg-accent-amber/10  border-accent-amber/20",
  content:     "text-accent-green  bg-accent-green/10  border-accent-green/20",
  product:     "text-accent-violet bg-accent-violet/10 border-accent-violet/20",
  proposal:    "text-[#00D4FF]     bg-[#00D4FF]/10     border-[#00D4FF]/20",
  development: "text-accent-purple bg-accent-purple/10 border-accent-purple/20",
};

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  draft:         { label: "Draft",          cls: "text-text-ghost  bg-white/[0.04]   border-white/[0.08]",  dot: "bg-text-ghost" },
  review_needed: { label: "Review needed",  cls: "text-accent-amber bg-accent-amber/10 border-accent-amber/20", dot: "bg-accent-amber" },
  approved:      { label: "Approved",       cls: "text-accent-green bg-accent-green/10 border-accent-green/20", dot: "bg-accent-green" },
  rejected:      { label: "Rejected",       cls: "text-accent-red   bg-accent-red/10   border-accent-red/20",  dot: "bg-accent-red" },
  archived:      { label: "Archived",       cls: "text-text-ghost  bg-white/[0.04]   border-white/[0.08]",  dot: "bg-text-ghost" },
};

type Filter = "all" | DraftType;
type StatusFilter = "all" | "draft" | "review_needed" | "approved" | "rejected" | "archived";

function fmtTime(iso: string): string {
  const d = new Date(iso), now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diff < 1)    return "just now";
  if (diff < 60)   return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ── component ────────────────────────────────────────────────────

export function DraftsView() {
  const { setActiveView, showToast } = useAppStore();

  const [drafts, setDrafts]           = useState<UnifiedDraft[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState<Filter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch]           = useState("");
  const [selected, setSelected]       = useState<UnifiedDraft | null>(null);
  const [saving, setSaving]           = useState(false);
  const [editContent, setEditContent] = useState("");

  const loadDrafts = useCallback(() => {
    setLoading(true);
    fetch("/api/drafts")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setDrafts(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  // Sync edit content when selection changes
  useEffect(() => {
    setEditContent(selected?.editableContent ?? "");
  }, [selected?.id]);

  // ── filtering ─────────────────────────────────────────────────
  const visible = drafts.filter(d => {
    if (filter !== "all" && d.draftType !== filter) return false;
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!d.title.toLowerCase().includes(q) && !(d.editableContent ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const reviewCount = drafts.filter(d => d.status === "review_needed").length;

  // ── actions ───────────────────────────────────────────────────
  async function updateDraft(id: string, draftType: DraftType, patch: { status?: string; content?: string }) {
    setSaving(true);
    try {
      const res = await fetch(`/api/drafts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftType, ...patch }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      setDrafts(prev => prev.map(d => {
        if (d.id !== id) return d;
        return {
          ...d,
          status:          updated.status ?? d.status,
          editableContent: patch.content !== undefined ? patch.content : d.editableContent,
          updatedAt:       updated.updatedAt ?? d.updatedAt,
        };
      }));
      if (selected?.id === id) {
        setSelected(prev => prev ? {
          ...prev,
          status:          updated.status ?? prev.status,
          editableContent: patch.content !== undefined ? patch.content : prev.editableContent,
          updatedAt:       updated.updatedAt ?? prev.updatedAt,
        } : null);
      }
    } catch {
      showToast("Failed to update draft", "error");
    } finally {
      setSaving(false);
    }
  }

  async function saveContent() {
    if (!selected) return;
    await updateDraft(selected.id, selected.draftType, { content: editContent });
    showToast("Saved");
  }

  async function changeStatus(draft: UnifiedDraft, newStatus: string) {
    await updateDraft(draft.id, draft.draftType, { status: newStatus });
    showToast(
      newStatus === "approved" ? "Draft approved" :
      newStatus === "rejected" ? "Draft rejected" :
      newStatus === "archived" ? "Draft archived" : "Status updated"
    );
  }

  // ── render ────────────────────────────────────────────────────
  return (
    <div className="h-full flex overflow-hidden">

      {/* ── LEFT PANEL: List ──────────────────────────────────── */}
      <div className={cn(
        "flex flex-col overflow-hidden transition-all duration-200",
        selected ? "hidden md:flex md:w-[420px] md:flex-shrink-0 border-r border-white/[0.05]" : "flex-1"
      )}>

        {/* Header */}
        <div className="px-6 md:px-8 pt-8 pb-5 border-b border-white/[0.05] flex-shrink-0">
          <p className="text-[11px] text-text-ghost font-medium tracking-[0.12em] uppercase mb-2">Company</p>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[32px] md:text-[38px] font-semibold text-text-primary tracking-tight leading-tight">
                Pending Actions
              </h1>
              <p className="text-[12px] text-text-muted mt-1">
                Decisions waiting for you
              </p>
            </div>
            {reviewCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-amber/10 border border-accent-amber/20 flex-shrink-0 mt-1">
                <AlertCircle className="w-3.5 h-3.5 text-accent-amber" />
                <span className="text-[12px] text-accent-amber font-semibold">{reviewCount} to review</span>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-ghost" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search pending actions…"
              className="w-full pl-8 pr-4 py-2 bg-white/[0.04] border border-white/[0.07] rounded-xl text-[13px] text-text-primary placeholder:text-text-ghost focus:outline-none focus:border-[#00D4FF]/30 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-text-ghost hover:text-text-muted" />
              </button>
            )}
          </div>

          {/* Type filters */}
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            {(["all", "email", "campaign", "content", "product", "proposal", "development"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border",
                  filter === f
                    ? "bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/20"
                    : "text-text-ghost border-white/[0.05] hover:text-text-muted hover:bg-white/[0.03]"
                )}
              >
                {f === "all" ? "All" : DRAFT_TYPE_LABELS[f]}
                {f !== "all" && (
                  <span className="ml-1 opacity-60">
                    {drafts.filter(d => d.draftType === f).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {(["all", "review_needed", "draft", "approved", "rejected", "archived"] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border",
                  statusFilter === s
                    ? "bg-white/[0.06] text-text-secondary border-white/[0.12]"
                    : "text-text-ghost border-white/[0.04] hover:text-text-muted hover:bg-white/[0.03]"
                )}
              >
                {s === "all" ? "Any status" : STATUS_META[s]?.label ?? s}
                {s === "review_needed" && reviewCount > 0 && (
                  <span className="ml-1 px-1 py-0.5 rounded bg-accent-amber/20 text-accent-amber text-[9px] font-bold">{reviewCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-2">
          {loading ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <Loader2 className="w-5 h-5 text-text-ghost animate-spin" />
              <p className="text-[12px] text-text-ghost">Loading drafts…</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="w-7 h-7 text-text-ghost mx-auto mb-3 opacity-30" />
              <p className="text-[13px] text-text-muted">No drafts yet</p>
              <p className="text-[11px] text-text-ghost mt-1">Approve actions in the Inbox to generate drafts</p>
              <button
                onClick={() => setActiveView("inbox")}
                className="mt-3 text-[12px] text-[#00D4FF] hover:opacity-80 transition-opacity"
              >
                Go to Inbox →
              </button>
            </div>
          ) : visible.map(draft => (
            <DraftCard
              key={draft.id}
              draft={draft}
              selected={selected?.id === draft.id}
              onSelect={() => setSelected(draft)}
              onStatusChange={s => changeStatus(draft, s)}
            />
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL: Detail ───────────────────────────────── */}
      {selected && (
        <DraftDetail
          draft={selected}
          editContent={editContent}
          setEditContent={setEditContent}
          saving={saving}
          onSave={saveContent}
          onStatusChange={s => changeStatus(selected, s)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ── DraftCard ────────────────────────────────────────────────────

function DraftCard({
  draft, selected, onSelect, onStatusChange,
}: {
  draft: UnifiedDraft;
  selected: boolean;
  onSelect: () => void;
  onStatusChange: (s: string) => void;
}) {
  const Icon   = DRAFT_TYPE_ICONS[draft.draftType];
  const color  = DRAFT_TYPE_COLORS[draft.draftType];
  const sm     = STATUS_META[draft.status] ?? STATUS_META["draft"];

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-2xl border p-4 transition-all group",
        selected
          ? "bg-[#0e1324] border-[#00D4FF]/20"
          : "bg-[#0b1020] border-white/[0.05] hover:border-white/[0.09] hover:bg-[#0d1220]"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border flex-shrink-0", color)}>
          <Icon className="w-3.5 h-3.5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border", color)}>
              {DRAFT_TYPE_LABELS[draft.draftType]}
            </span>
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", sm.cls)}>
              {sm.label}
            </span>
          </div>
          <p className="text-[13px] text-text-primary font-medium leading-snug truncate">{draft.title}</p>
          {draft.preview && (
            <p className="text-[11px] text-text-ghost mt-1 leading-relaxed line-clamp-2">{draft.preview}</p>
          )}

          {/* Metadata row */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {draft.sourceTeamName && (
              <span className="flex items-center gap-1 text-[10px] text-text-ghost">
                <Building2 className="w-3 h-3" /> {draft.sourceTeamName}
              </span>
            )}
            {draft.opportunityTitle && (
              <span className="flex items-center gap-1 text-[10px] text-text-ghost truncate max-w-[140px]">
                <ChevronRight className="w-3 h-3 flex-shrink-0" /> {draft.opportunityTitle}
              </span>
            )}
            {draft.projectName && (
              <span className="flex items-center gap-1 text-[10px] text-text-ghost truncate max-w-[120px]">
                <FolderOpen className="w-3 h-3 flex-shrink-0" /> {draft.projectName}
              </span>
            )}
            <span className="ml-auto text-[10px] text-text-ghost tabular-nums flex-shrink-0">
              {fmtTime(draft.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Quick action buttons for review_needed */}
      {draft.status === "review_needed" && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.04]">
          <button
            onClick={e => { e.stopPropagation(); onStatusChange("rejected"); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-accent-red/20 text-accent-red text-[11px] font-medium hover:bg-accent-red/10 transition-all"
          >
            <XCircle className="w-3.5 h-3.5" /> Reject
          </button>
          <button
            onClick={e => { e.stopPropagation(); onStatusChange("approved"); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-accent-green/10 border border-accent-green/20 text-accent-green text-[11px] font-medium hover:bg-accent-green/15 transition-all"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
          </button>
        </div>
      )}
    </button>
  );
}

// ── DraftDetail ──────────────────────────────────────────────────

function DraftDetail({
  draft, editContent, setEditContent, saving,
  onSave, onStatusChange, onClose,
}: {
  draft: UnifiedDraft;
  editContent: string;
  setEditContent: (v: string) => void;
  saving: boolean;
  onSave: () => void;
  onStatusChange: (s: string) => void;
  onClose: () => void;
}) {
  const Icon  = DRAFT_TYPE_ICONS[draft.draftType];
  const color = DRAFT_TYPE_COLORS[draft.draftType];
  const sm    = STATUS_META[draft.status] ?? STATUS_META["draft"];

  const contentChanged = editContent !== (draft.editableContent ?? "");

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#08101e] border-l border-white/[0.04]">
      {/* Detail header */}
      <div className="px-6 py-5 border-b border-white/[0.05] flex-shrink-0">
        <div className="flex items-start gap-3">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0", color)}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border", color)}>
                {DRAFT_TYPE_LABELS[draft.draftType]}
              </span>
              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border flex items-center gap-1", sm.cls)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", sm.dot)} />
                {sm.label}
              </span>
            </div>
            <h2 className="text-[16px] font-semibold text-text-primary leading-snug">{draft.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-ghost hover:text-text-muted hover:bg-white/[0.04] transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Metadata */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {draft.sourceTeamName && (
            <span className="flex items-center gap-1 text-[11px] text-text-ghost">
              <Building2 className="w-3 h-3" /> {draft.sourceTeamName}
            </span>
          )}
          {draft.opportunityTitle && (
            <span className="flex items-center gap-1 text-[11px] text-text-ghost">
              <ChevronRight className="w-3 h-3" /> {draft.opportunityTitle}
            </span>
          )}
          {draft.projectName && (
            <span className="flex items-center gap-1 text-[11px] text-text-ghost">
              <FolderOpen className="w-3 h-3" /> {draft.projectName}
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] text-text-ghost ml-auto">
            <Clock className="w-3 h-3" /> {fmtTime(draft.createdAt)}
          </span>
        </div>

        {/* Type-specific extras */}
        {draft.draftType === "email" && (draft.subject || draft.recipientName) && (
          <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] space-y-1">
            {draft.subject && (
              <p className="text-[11px] text-text-secondary">
                <span className="text-text-ghost">Subject:</span> {draft.subject}
              </p>
            )}
            {draft.recipientName && (
              <p className="text-[11px] text-text-secondary">
                <span className="text-text-ghost">To:</span> {draft.recipientName}{draft.recipientEmail ? ` <${draft.recipientEmail}>` : ""}
              </p>
            )}
          </div>
        )}
        {draft.draftType === "content" && draft.platform && (
          <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <p className="text-[11px] text-text-secondary capitalize">
              <span className="text-text-ghost">Platform:</span> {draft.platform}
            </p>
          </div>
        )}
        {draft.draftType === "proposal" && draft.customer && (
          <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <p className="text-[11px] text-text-secondary">
              <span className="text-text-ghost">Customer:</span> {draft.customer}
            </p>
          </div>
        )}
        {draft.draftType === "product" && draft.priceSuggestion != null && (
          <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <p className="text-[11px] text-text-secondary">
              <span className="text-text-ghost">Price suggestion:</span> €{draft.priceSuggestion}
            </p>
          </div>
        )}
        {draft.draftType === "development" && draft.repoNameSuggestion && (
          <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <p className="text-[11px] text-text-secondary font-mono">
              <span className="text-text-ghost font-sans">Repo:</span> {draft.repoNameSuggestion}
            </p>
          </div>
        )}
      </div>

      {/* Editable content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-text-ghost uppercase tracking-[0.1em] font-medium">Content</p>
          {contentChanged && (
            <span className="text-[10px] text-accent-amber">Unsaved changes</span>
          )}
        </div>
        <textarea
          value={editContent}
          onChange={e => setEditContent(e.target.value)}
          placeholder="No content yet…"
          className="w-full h-[260px] bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-[13px] text-text-primary leading-relaxed resize-none focus:outline-none focus:border-[#00D4FF]/30 transition-colors placeholder:text-text-ghost font-mono"
        />

        {/* Source links */}
        {(draft.sourceApprovalId || draft.sourceOutputId) && (
          <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] mb-2 font-medium">Created from</p>
            <div className="space-y-1">
              {draft.sourceApprovalId && (
                <p className="text-[11px] text-text-ghost">
                  Approval: <span className="font-mono text-text-muted">{draft.sourceApprovalId.slice(0, 12)}…</span>
                </p>
              )}
              {draft.sourceOutputId && (
                <p className="text-[11px] text-text-ghost">
                  Output: <span className="font-mono text-text-muted">{draft.sourceOutputId.slice(0, 12)}…</span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions footer */}
      <div className="px-6 py-4 border-t border-white/[0.05] flex-shrink-0 space-y-3">
        {/* Save */}
        {contentChanged && (
          <button
            onClick={onSave}
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] text-[13px] font-medium hover:bg-[#00D4FF]/15 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "Saving…" : "Save changes"}
          </button>
        )}

        {/* Status actions */}
        <div className="flex items-center gap-2">
          {draft.status !== "approved" && (
            <button
              onClick={() => onStatusChange("approved")}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green text-[12px] font-medium hover:bg-accent-green/15 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
            </button>
          )}
          {draft.status !== "rejected" && (
            <button
              onClick={() => onStatusChange("rejected")}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-accent-red/20 text-accent-red text-[12px] font-medium hover:bg-accent-red/10 transition-all disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
          )}
          {draft.status !== "archived" && (
            <button
              onClick={() => onStatusChange("archived")}
              disabled={saving}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] text-text-ghost text-[12px] hover:bg-white/[0.04] transition-all disabled:opacity-50"
              title="Archive"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
