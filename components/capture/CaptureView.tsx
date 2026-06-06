"use client";

import { useEffect, useState, useCallback } from "react";
import { MioCapture, MioNode, CaptureSource, CaptureType, CaptureStatus, Priority, ExtractedActionItem } from "@/types";
import { cn } from "@/lib/utils";
import { normalizeCapture } from "@/lib/normalize";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAppStore } from "@/store/appStore";
import {
  Inbox, Plus, Trash2, Pencil, Tag, Link2, ArrowRight,
  CheckCircle2, Zap,
  FileText, CheckSquare, Target, GitBranch, X, AlertCircle,
  Archive, RefreshCw,
} from "lucide-react";

// ─── Constants ──────────────────────────────────────────────────────────────

const SOURCES: { value: CaptureSource; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "chatgpt", label: "ChatGPT" },
  { value: "claude", label: "Claude" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "other", label: "Other" },
];

const CAPTURE_TYPES: { value: CaptureType; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "task", label: "Task" },
  { value: "idea", label: "Idea" },
  { value: "decision", label: "Decision" },
  { value: "bug", label: "Bug" },
  { value: "roadmap", label: "Roadmap" },
  { value: "goal", label: "Goal" },
  { value: "project_update", label: "Project Update" },
  { value: "sales_note", label: "Sales Note" },
  { value: "technical_note", label: "Technical Note" },
];

const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];
const STATUSES: CaptureStatus[] = ["inbox", "processed", "archived"];

const ACTION_KEYWORDS = [
  // English
  /\btodo\b/i, /\bnext step\b/i, /\bfix\b/i, /\bbuild\b/i, /\badd\b/i,
  /\bimprove\b/i, /\btest\b/i, /\bshould\b/i, /\bneed to\b/i, /\bmust\b/i,
  /\bimplement\b/i, /\bcreate\b/i, /\bupdate\b/i, /\brefactor\b/i, /\bcheck\b/i,
  /\bmake sure\b/i, /\bensure\b/i, /\bsetup\b/i, /\bset up\b/i,
  // Dutch
  /\bmoet\b/i, /\bmoeten\b/i, /\bvolgende stap\b/i, /\boplossen\b/i,
  /\btoevoegen\b/i, /\bbouwen\b/i, /\bverbeteren\b/i, /\btesten\b/i,
  /\bmoet worden\b/i, /\bnodig\b/i, /\bafmaken\b/i,
];

function extractActionItems(content: string): string[] {
  const lines = content
    .split(/[\n.!?]/)
    .map((l) => l.trim())
    .filter((l) => l.length > 5 && l.length < 200);

  return lines.filter((line) => ACTION_KEYWORDS.some((re) => re.test(line)));
}

// ─── Form State ─────────────────────────────────────────────────────────────

interface CaptureFormState {
  title: string;
  content: string;
  source: CaptureSource;
  type: CaptureType;
  status: CaptureStatus;
  priority: Priority;
  tags: string;
  nodeId: string;
}

const DEFAULT_FORM: CaptureFormState = {
  title: "",
  content: "",
  source: "manual",
  type: "note",
  status: "inbox",
  priority: "medium",
  tags: "",
  nodeId: "",
};

// ─── Source Badge ────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<CaptureSource, string> = {
  chatgpt: "#10b981",
  claude: "#f59e0b",
  manual: "#6366f1",
  whatsapp: "#22c55e",
  email: "#3b82f6",
  meeting: "#8b5cf6",
  other: "#94a3b8",
};

const TYPE_COLORS: Record<CaptureType, string> = {
  note: "#6366f1",
  task: "#3b82f6",
  idea: "#f59e0b",
  decision: "#8b5cf6",
  bug: "#ef4444",
  roadmap: "#10b981",
  goal: "#22c55e",
  project_update: "#06b6d4",
  sales_note: "#f97316",
  technical_note: "#64748b",
};

// ─── Main Component ──────────────────────────────────────────────────────────

export function CaptureView() {
  const { showToast } = useAppStore();
  const [captures, setCaptures] = useState<MioCapture[]>([]);
  const [nodes, setNodes] = useState<MioNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | CaptureStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | CaptureType>("all");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCapture, setEditingCapture] = useState<MioCapture | null>(null);
  const [form, setForm] = useState<CaptureFormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Detail panel state
  const [selectedCapture, setSelectedCapture] = useState<MioCapture | null>(null);

  // Extract action items state
  const [extractedItems, setExtractedItems] = useState<ExtractedActionItem[]>([]);
  const [showExtract, setShowExtract] = useState(false);
  const [creatingTasks, setCreatingTasks] = useState(false);

  // Convert state
  const [converting, setConverting] = useState<string | null>(null);
  const [confirmReconvert, setConfirmReconvert] = useState<"note" | "task" | "goal" | "node" | null>(null);

  const loadData = useCallback(() => {
    Promise.all([
      fetch("/api/capture").then((r) => r.json()),
      fetch("/api/nodes").then((r) => r.json()),
    ])
      .then(([c, n]) => {
        setCaptures((Array.isArray(c) ? c : []).map(normalizeCapture));
        setNodes(Array.isArray(n) ? n : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keep selectedCapture in sync
  useEffect(() => {
    if (selectedCapture) {
      const updated = captures.find((c) => c.id === selectedCapture.id);
      if (updated) setSelectedCapture(updated);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captures]);

  // ── Form helpers ────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingCapture(null);
    setForm(DEFAULT_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(capture: MioCapture, e?: React.MouseEvent) {
    e?.stopPropagation();
    setEditingCapture(capture);
    setForm({
      title: capture.title,
      content: capture.content,
      source: capture.source,
      type: capture.type,
      status: capture.status,
      priority: capture.priority,
      tags: parseTags(capture.tags).join(", "),
      nodeId: capture.nodeId || "",
    });
    setFormError("");
    setModalOpen(true);
  }

  async function saveCapture() {
    const content = form.content.trim();
    if (!content) { setFormError("Content is required."); return; }
    const title = form.title.trim() || content.slice(0, 60);
    setSaving(true);
    setFormError("");
    try {
      const tagsArr = form.tags.trim()
        ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [];
      const body = {
        title,
        content,
        source: form.source,
        type: form.type,
        status: form.status,
        priority: form.priority,
        tags: tagsArr.length ? JSON.stringify(tagsArr) : null,
        nodeId: form.nodeId || null,
      };
      if (editingCapture) {
        const res = await fetch(`/api/capture/${editingCapture.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to update");
        const updated = normalizeCapture(await res.json());
        setCaptures((prev) => prev.map((c) => c.id === editingCapture.id ? updated : c));
        showToast("Capture updated");
      } else {
        const res = await fetch("/api/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to create");
        const created = normalizeCapture(await res.json());
        setCaptures((prev) => [created, ...prev]);
        showToast("Capture saved to inbox");
      }
      setModalOpen(false);
    } catch {
      setFormError("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCapture(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/capture/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setCaptures((prev) => prev.filter((c) => c.id !== id));
      if (selectedCapture?.id === id) setSelectedCapture(null);
      showToast("Capture deleted");
    } catch {
      showToast("Failed to delete capture", "error");
    }
  }

  async function updateStatus(capture: MioCapture, status: CaptureStatus) {
    try {
      const res = await fetch(`/api/capture/${capture.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = normalizeCapture(await res.json());
      setCaptures((prev) => prev.map((c) => c.id === capture.id ? updated : c));
    } catch {
      showToast("Failed to update status", "error");
    }
  }

  // ── Extract action items ─────────────────────────────────────────────────────

  function handleExtract(capture: MioCapture) {
    const items = extractActionItems(capture.content);
    setExtractedItems(items.map((text) => ({ text, approved: false })));
    setShowExtract(true);
  }

  async function createApprovedTasks() {
    const approved = extractedItems.filter((i) => i.approved);
    if (!approved.length) return;
    setCreatingTasks(true);
    try {
      await Promise.all(
        approved.map((item) =>
          fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: item.text.slice(0, 200),
              status: "todo",
              priority: selectedCapture?.priority || "medium",
              nodeId: selectedCapture?.nodeId || null,
            }),
          })
        )
      );
      showToast(`${approved.length} task${approved.length > 1 ? "s" : ""} created`);
      setShowExtract(false);
      setExtractedItems([]);
    } catch {
      showToast("Failed to create tasks", "error");
    } finally {
      setCreatingTasks(false);
    }
  }

  // ── Convert ─────────────────────────────────────────────────────────────────

  function handleConvertClick(capture: MioCapture, convertTo: "note" | "task" | "goal" | "node") {
    if (capture.convertedToType && converting === null) {
      // Already converted — ask for confirmation before creating another
      setConfirmReconvert(convertTo);
    } else {
      void convertCapture(capture, convertTo, false);
    }
  }

  async function convertCapture(capture: MioCapture, convertTo: "note" | "task" | "goal" | "node", force: boolean) {
    setConverting(convertTo);
    setConfirmReconvert(null);
    try {
      const res = await fetch(`/api/capture/${capture.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ convertTo, nodeId: capture.nodeId, force }),
      });
      if (res.status === 409) {
        // Server refused duplicate — should not happen if we pass force, but handle gracefully
        showToast("Already converted — use Convert Again to create a duplicate", "error");
        return;
      }
      if (!res.ok) throw new Error("Failed");
      const result = await res.json();
      const updated = normalizeCapture({ ...capture, status: "processed", convertedToType: convertTo, convertedToId: result.created?.id });
      setCaptures((prev) => prev.map((c) => c.id === capture.id ? updated : c));
      setSelectedCapture(updated);
      const labels: Record<string, string> = { note: "Note", task: "Task", goal: "Goal", node: "Node" };
      showToast(`Converted to ${labels[convertTo]}`);
    } catch {
      showToast("Conversion failed", "error");
    } finally {
      setConverting(null);
    }
  }

  // ── Filters ─────────────────────────────────────────────────────────────────

  const filtered = captures.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (typeFilter !== "all" && c.type !== typeFilter) return false;
    return true;
  });

  const counts = {
    all: captures.length,
    inbox: captures.filter((c) => c.status === "inbox").length,
    processed: captures.filter((c) => c.status === "processed").length,
    archived: captures.filter((c) => c.status === "archived").length,
  };

  const getNodeLabel = (nodeId?: string | null) => nodes.find((n) => n.id === nodeId)?.label;
  const parseTags = (tags?: string | null): string[] => {
    if (!tags) return [];
    try { return JSON.parse(tags); } catch { return []; }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Inbox className="w-5 h-5 text-accent-cyan" />
            Capture Inbox
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            {counts.inbox} unprocessed · {counts.all} total
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" />
          New Capture
        </Button>
      </div>

      {/* Status filters */}
      <div className="flex items-center gap-2 px-6 py-2.5 border-b border-white/[0.06] bg-surface-1 overflow-x-auto">
        {(["all", "inbox", "processed", "archived"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-all capitalize",
              statusFilter === s
                ? "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/25"
                : "text-text-muted hover:text-text-secondary hover:bg-white/[0.04]"
            )}
          >
            {s === "all" ? "All" : s}
            <span className={cn("text-[10px] font-mono", statusFilter === s ? "text-accent-cyan/70" : "text-text-ghost")}>
              {counts[s === "all" ? "all" : s] ?? 0}
            </span>
          </button>
        ))}

        <div className="h-4 w-px bg-white/[0.06] mx-1 flex-shrink-0" />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "all" | CaptureType)}
          className="text-xs bg-transparent border border-white/[0.06] rounded-lg px-2 py-1.5 text-text-muted focus:outline-none focus:border-white/[0.12] hover:border-white/[0.1] transition-colors"
        >
          <option value="all">All types</option>
          {CAPTURE_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* List */}
        <div className={cn("flex flex-col overflow-y-auto", selectedCapture ? "w-[420px] flex-shrink-0 border-r border-white/[0.06]" : "flex-1")}>
          <div className="p-4 space-y-2">
            {loading && (
              <div className="text-center py-12 text-text-muted text-sm">Loading captures...</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="text-center py-16">
                <Inbox className="w-8 h-8 text-text-ghost mx-auto mb-3" />
                <p className="text-sm text-text-secondary">
                  {statusFilter !== "all" || typeFilter !== "all" ? "No captures match this filter" : "Capture inbox is empty"}
                </p>
                <p className="text-xs text-text-muted mt-1 mb-4">
                  {statusFilter !== "all" || typeFilter !== "all"
                    ? "Try clearing the filter"
                    : "Paste a ChatGPT chat, meeting note, idea, or decision here."}
                </p>
                {statusFilter === "all" && typeFilter === "all" && (
                  <Button variant="primary" size="sm" onClick={openCreate}>
                    <Plus className="w-3.5 h-3.5" />
                    First capture
                  </Button>
                )}
              </div>
            )}
            {filtered.map((capture) => {
              const tags = parseTags(capture.tags);
              const nodeLabel = getNodeLabel(capture.nodeId);
              const srcColor = SOURCE_COLORS[capture.source] ?? "#94a3b8";
              const typeColor = TYPE_COLORS[capture.type] ?? "#6366f1";
              const isSelected = selectedCapture?.id === capture.id;

              return (
                <div
                  key={capture.id}
                  onClick={() => setSelectedCapture(isSelected ? null : capture)}
                  className={cn(
                    "group p-3.5 rounded-xl border transition-all cursor-pointer",
                    isSelected
                      ? "border-accent-cyan/30 bg-accent-cyan/5"
                      : capture.status === "archived"
                      ? "opacity-50 border-white/[0.04] bg-white/[0.01] hover:opacity-70"
                      : "border-white/[0.06] bg-surface-2 hover:border-white/[0.1] hover:bg-surface-3"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: srcColor, background: `${srcColor}18` }}>
                          {SOURCES.find((s) => s.value === capture.source)?.label ?? capture.source}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: typeColor, background: `${typeColor}18` }}>
                          {CAPTURE_TYPES.find((t) => t.value === capture.type)?.label ?? capture.type}
                        </span>
                        {capture.status === "processed" && (
                          <CheckCircle2 className="w-3 h-3 text-accent-green flex-shrink-0" />
                        )}
                        {capture.status === "archived" && (
                          <Archive className="w-3 h-3 text-text-ghost flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-text-primary truncate">{capture.title}</p>
                      <p className="text-xs text-text-secondary line-clamp-2 mt-0.5">{capture.content}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {nodeLabel && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-text-muted border border-white/[0.06] flex items-center gap-1">
                            <Link2 className="w-2.5 h-2.5" />
                            {nodeLabel}
                          </span>
                        )}
                        {tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-accent-purple/10 text-accent-purple/80 border border-accent-purple/10 flex items-center gap-1">
                            <Tag className="w-2 h-2" />
                            {tag}
                          </span>
                        ))}
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded capitalize font-medium", `priority-${capture.priority}`)}>
                          {capture.priority}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ml-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(capture, e); }}
                        className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-all"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteCapture(capture.id, e); }}
                        className="p-1.5 rounded text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedCapture && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
              <h2 className="text-sm font-semibold text-text-primary truncate flex-1 mr-3">{selectedCapture.title}</h2>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => openEdit(selectedCapture)}
                  className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setSelectedCapture(null)}
                  className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Meta */}
              <div className="flex flex-wrap gap-2">
                <span className="text-[11px] px-2 py-1 rounded border" style={{
                  color: SOURCE_COLORS[selectedCapture.source],
                  borderColor: `${SOURCE_COLORS[selectedCapture.source]}30`,
                  background: `${SOURCE_COLORS[selectedCapture.source]}12`,
                }}>
                  {SOURCES.find((s) => s.value === selectedCapture.source)?.label}
                </span>
                <span className="text-[11px] px-2 py-1 rounded border" style={{
                  color: TYPE_COLORS[selectedCapture.type],
                  borderColor: `${TYPE_COLORS[selectedCapture.type]}30`,
                  background: `${TYPE_COLORS[selectedCapture.type]}12`,
                }}>
                  {CAPTURE_TYPES.find((t) => t.value === selectedCapture.type)?.label}
                </span>
                <span className={cn("text-[11px] px-2 py-1 rounded border capitalize", `priority-${selectedCapture.priority}`)}>
                  {selectedCapture.priority}
                </span>
                {selectedCapture.status === "processed" && (
                  <span className="text-[11px] px-2 py-1 rounded border border-accent-green/25 bg-accent-green/10 text-accent-green flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Processed
                  </span>
                )}
              </div>

              {/* Content */}
              <div>
                <p className="text-xs text-text-muted mb-2">Content</p>
                <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap bg-surface-3 rounded-xl p-4 border border-white/[0.06]">
                  {selectedCapture.content}
                </div>
              </div>

              {/* Linked node */}
              {selectedCapture.nodeId && (
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Linked to: <span className="text-text-secondary">{getNodeLabel(selectedCapture.nodeId)}</span></span>
                </div>
              )}

              {/* Tags */}
              {parseTags(selectedCapture.tags).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {parseTags(selectedCapture.tags).map((tag) => (
                    <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple/80 border border-accent-purple/15 flex items-center gap-1">
                      <Tag className="w-2.5 h-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Converted reference */}
              {selectedCapture.convertedToType && (
                <div className="flex items-center gap-2 text-xs p-3 rounded-xl border border-accent-green/20 bg-accent-green/5 text-accent-green">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Converted to <strong>{selectedCapture.convertedToType}</strong></span>
                </div>
              )}

              {/* Status actions */}
              <div>
                <p className="text-xs text-text-muted mb-2">Status</p>
                <div className="flex gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(selectedCapture, s)}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-lg border capitalize transition-all",
                        selectedCapture.status === s
                          ? "border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan"
                          : "border-white/[0.06] text-text-muted hover:border-white/[0.12] hover:text-text-secondary"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Convert actions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-text-muted">Convert to</p>
                  {selectedCapture.convertedToType && (
                    <span className="text-[10px] text-text-ghost">
                      Click any button to create another
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: "note", label: "Note", icon: FileText, color: "#6366f1" },
                    { id: "task", label: "Task", icon: CheckSquare, color: "#3b82f6" },
                    { id: "goal", label: "Goal", icon: Target, color: "#10b981" },
                    { id: "node", label: "Node", icon: GitBranch, color: "#8b5cf6" },
                  ] as const).map(({ id, label, icon: Icon, color }) => {
                    const isConverted = selectedCapture.convertedToType === id;
                    return (
                      <button
                        key={id}
                        onClick={() => handleConvertClick(selectedCapture, id)}
                        disabled={converting !== null}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all",
                          isConverted
                            ? "border-accent-green/25 text-accent-green"
                            : "border-white/[0.06] text-text-secondary hover:border-white/[0.14] hover:text-text-primary",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                        style={{ background: isConverted ? "rgba(16,185,129,0.06)" : `${color}08` }}
                      >
                        <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: isConverted ? "rgba(16,185,129,0.15)" : `${color}20` }}>
                          {converting === id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" style={{ color: isConverted ? "#10b981" : color }} />
                          ) : isConverted ? (
                            <CheckCircle2 className="w-3 h-3 text-accent-green" />
                          ) : (
                            <Icon className="w-3 h-3" style={{ color }} />
                          )}
                        </div>
                        {converting === id
                          ? "Converting..."
                          : isConverted
                          ? `${label} ✓`
                          : `Convert to ${label}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Extract action items */}
              <div>
                <button
                  onClick={() => handleExtract(selectedCapture)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-white/[0.06] hover:border-accent-amber/30 text-text-secondary hover:text-text-primary transition-all text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-accent-amber" />
                    Extract action items
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Extract action items modal */}
      <Modal open={showExtract} onClose={() => { setShowExtract(false); setExtractedItems([]); }} title="Extracted Action Items">
        <div className="space-y-4">
          <p className="text-xs text-text-muted">
            Detected {extractedItems.length} potential action item{extractedItems.length !== 1 ? "s" : ""} in this capture.
            Select which ones to create as tasks.
          </p>

          {extractedItems.length === 0 && (
            <div className="text-center py-6 text-text-muted text-xs">
              <AlertCircle className="w-6 h-6 mx-auto mb-2" />
              No action items detected. Try looking for lines with TODO, &quot;need to&quot;, &quot;fix&quot;, &quot;build&quot;, etc.
            </div>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {extractedItems.map((item, i) => (
              <label
                key={i}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                  item.approved
                    ? "border-accent-cyan/30 bg-accent-cyan/5"
                    : "border-white/[0.06] hover:border-white/[0.12]"
                )}
              >
                <input
                  type="checkbox"
                  checked={item.approved}
                  onChange={(e) => {
                    setExtractedItems((prev) =>
                      prev.map((it, idx) => idx === i ? { ...it, approved: e.target.checked } : it)
                    );
                  }}
                  className="mt-0.5 accent-[#06b6d4]"
                />
                <span className="text-xs text-text-primary leading-relaxed">{item.text}</span>
              </label>
            ))}
          </div>

          {extractedItems.length > 0 && (
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>{extractedItems.filter((i) => i.approved).length} selected</span>
              <button
                onClick={() => setExtractedItems((prev) => prev.map((i) => ({ ...i, approved: true })))}
                className="text-accent-cyan hover:underline"
              >
                Select all
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => { setShowExtract(false); setExtractedItems([]); }} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={createApprovedTasks}
              disabled={creatingTasks || extractedItems.filter((i) => i.approved).length === 0}
              className="flex-1"
            >
              {creatingTasks ? "Creating..." : `Create ${extractedItems.filter((i) => i.approved).length} Task${extractedItems.filter((i) => i.approved).length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Re-convert confirmation */}
      <Modal
        open={confirmReconvert !== null}
        onClose={() => setConfirmReconvert(null)}
        title="Create another conversion?"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary leading-relaxed">
            This capture was already converted to a <strong className="text-text-primary">{selectedCapture?.convertedToType}</strong>.
            Creating another <strong className="text-text-primary">{confirmReconvert}</strong> will not remove the previous one.
          </p>
          <p className="text-xs text-text-muted">
            Both items will exist independently. This is intentional if you want duplicates in different contexts.
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setConfirmReconvert(null)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (selectedCapture && confirmReconvert) {
                  void convertCapture(selectedCapture, confirmReconvert, true);
                }
              }}
              className="flex-1"
            >
              Convert Again
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingCapture ? "Edit Capture" : "New Capture"}>
        <div className="space-y-4">
          {/* Content first — most important */}
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Content *</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="Paste a ChatGPT conversation, meeting note, idea, decision, or anything you want to capture..."
              rows={6}
              autoFocus
              className="w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50 resize-none transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Title <span className="text-text-ghost">(auto-generated if empty)</span></label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Leave empty to auto-generate from content..."
              className="w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Source</label>
              <select
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as CaptureSource }))}
                className="w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-3 py-2.5 text-text-primary focus:outline-none focus:border-accent-purple/50"
              >
                {SOURCES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CaptureType }))}
                className="w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-3 py-2.5 text-text-primary focus:outline-none focus:border-accent-purple/50"
              >
                {CAPTURE_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => setForm((f) => ({ ...f, priority: p }))}
                  className={cn(
                    "flex-1 text-xs py-1.5 rounded-lg border capitalize transition-all",
                    form.priority === p
                      ? `priority-${p} border-current`
                      : "text-text-ghost border-white/[0.06] hover:border-white/[0.12]"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Tags <span className="text-text-ghost">(comma separated)</span></label>
              <input
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="ai, product, idea..."
                className="w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Link to node</label>
              <select
                value={form.nodeId}
                onChange={(e) => setForm((f) => ({ ...f, nodeId: e.target.value }))}
                className="w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-3 py-2.5 text-text-primary focus:outline-none focus:border-accent-purple/50"
              >
                <option value="">No link</option>
                {nodes.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
              </select>
            </div>
          </div>

          {editingCapture && (
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Status</label>
              <div className="flex gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setForm((f) => ({ ...f, status: s }))}
                    className={cn(
                      "flex-1 text-xs py-1.5 rounded-lg border capitalize transition-all",
                      form.status === s
                        ? "border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan"
                        : "text-text-ghost border-white/[0.06] hover:border-white/[0.12]"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {formError && (
            <p className="text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 px-3 py-2 rounded-lg">
              {formError}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button variant="primary" onClick={saveCapture} disabled={saving || !form.content.trim()} className="flex-1">
              {saving ? "Saving..." : editingCapture ? "Save Changes" : "Save to Inbox"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
