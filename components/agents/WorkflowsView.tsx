"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Agent, AgentWorkflow, WorkflowTrigger } from "@/types";
import {
  Network, Plus, Pencil, Trash2, AlertCircle, CheckCircle2,
  ArrowDown,
} from "lucide-react";

// ── constants ──────────────────────────────────────────────────────
const TRIGGER_TYPES: WorkflowTrigger[] = ["manual", "approved_action", "completed_run"];
const TRIGGER_LABELS: Record<WorkflowTrigger, string> = {
  manual:           "Manual",
  approved_action:  "Approved Action",
  completed_run:    "Completed Run",
};
const TRIGGER_COLOR: Record<WorkflowTrigger, string> = {
  manual:           "#475569",
  approved_action:  "#f59e0b",
  completed_run:    "#10b981",
};

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ── form types ─────────────────────────────────────────────────────
interface FormState {
  name: string; sourceAgentId: string; targetAgentId: string;
  triggerType: WorkflowTrigger; enabled: boolean;
}
const DEFAULT_FORM: FormState = {
  name: "", sourceAgentId: "", targetAgentId: "", triggerType: "manual", enabled: false,
};
const inputCls = "w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors";

// ── main component ─────────────────────────────────────────────────
export function WorkflowsView() {
  const { showToast } = useAppStore();
  const [workflows, setWorkflows] = useState<AgentWorkflow[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AgentWorkflow | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function load() {
    const [w, a] = await Promise.all([
      fetch("/api/agent-workflows").then(r => r.json()).catch(() => []),
      fetch("/api/agents").then(r => r.json()).catch(() => []),
    ]);
    setWorkflows(Array.isArray(w) ? w : []);
    setAgents(Array.isArray(a) ? a : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(wf: AgentWorkflow) {
    setEditing(wf);
    setForm({
      name: wf.name,
      sourceAgentId: wf.sourceAgentId,
      targetAgentId: wf.targetAgentId,
      triggerType: wf.triggerType,
      enabled: wf.enabled,
    });
    setFormError("");
    setModalOpen(true);
  }

  async function save() {
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    if (!form.sourceAgentId) { setFormError("Source agent is required."); return; }
    if (!form.targetAgentId) { setFormError("Target agent is required."); return; }
    if (form.sourceAgentId === form.targetAgentId) { setFormError("Source and target must differ."); return; }
    setSaving(true); setFormError("");
    try {
      const method = editing ? "PATCH" : "POST";
      const url = editing ? `/api/agent-workflows/${editing.id}` : "/api/agent-workflows";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Save failed"); }
      showToast(editing ? "Workflow updated" : "Workflow created");
      setModalOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteWorkflow(id: string) {
    await fetch(`/api/agent-workflows/${id}`, { method: "DELETE" });
    setWorkflows(prev => prev.filter(w => w.id !== id));
    showToast("Workflow deleted");
  }

  async function toggleEnabled(wf: AgentWorkflow) {
    const res = await fetch(`/api/agent-workflows/${wf.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !wf.enabled }),
    });
    const updated = await res.json() as AgentWorkflow;
    setWorkflows(prev => prev.map(w => w.id === wf.id ? updated : w));
  }

  // ── derived stats ────────────────────────────────────────────────
  const enabledCount = workflows.filter(w => w.enabled).length;
  const connectedAgentIds = new Set([
    ...workflows.map(w => w.sourceAgentId),
    ...workflows.map(w => w.targetAgentId),
  ]);
  const standaloneCount = agents.filter(a => !connectedAgentIds.has(a.id)).length;

  return (
    <div className="h-full overflow-y-auto bg-void">
      <div className="max-w-[1000px] mx-auto px-6 py-6 space-y-5">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium text-text-ghost uppercase tracking-widest mb-1">Agent OS · Phase 1.5</p>
            <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">
              Agent <span className="text-accent-cyan">Workflows</span>
            </h1>
            <p className="text-xs text-text-muted mt-1.5">
              {loading ? "Loading…" : `${workflows.length} workflow${workflows.length !== 1 ? "s" : ""} defined`}
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" /> New Workflow
          </Button>
        </div>

        {/* ── Foundation notice ────────────────────────────────── */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-surface-2 border border-accent-amber/20">
          <AlertCircle className="w-3.5 h-3.5 text-accent-amber flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-text-muted leading-relaxed">
            <span className="text-accent-amber font-medium">Foundation only.</span>{" "}
            Workflow definitions are stored and will be used by the future execution engine.
            Automatic chained execution is Phase 2. Workflows with trigger{" "}
            <span className="text-text-secondary font-medium">Manual</span> can be triggered explicitly in a future release.
          </p>
        </div>

        {/* ── Overview stats ───────────────────────────────────── */}
        {!loading && (
          <div className="grid grid-cols-4 gap-3">
            <OverviewStat label="Total Workflows" value={workflows.length} color="#6366f1" />
            <OverviewStat label="Enabled" value={enabledCount} color="#10b981" />
            <OverviewStat label="Connected Agents" value={connectedAgentIds.size} color="#3b82f6" />
            <OverviewStat label="Standalone Agents" value={standaloneCount} color="#475569" />
          </div>
        )}

        {/* ── Loading ─────────────────────────────────────────── */}
        {loading && (
          <p className="text-xs text-text-muted text-center py-8">Loading…</p>
        )}

        {/* ── Empty state ─────────────────────────────────────── */}
        {!loading && workflows.length === 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-surface-1 py-14 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center mb-4">
              <Network className="w-7 h-7 text-accent-cyan opacity-60" />
            </div>
            <p className="text-sm font-medium text-text-secondary mb-1">Build your first Agent Workflow</p>
            <p className="text-xs text-text-ghost mb-5">
              Example: Daily Strategy Agent → <span className="text-accent-green">completed_run</span> → Research Agent
            </p>
            <Button variant="primary" size="sm" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" /> Create Workflow
            </Button>
          </div>
        )}

        {/* ── Visual workflow graph ────────────────────────────── */}
        {!loading && workflows.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map(wf => (
              <WorkflowCard
                key={wf.id}
                wf={wf}
                onEdit={() => openEdit(wf)}
                onDelete={() => deleteWorkflow(wf.id)}
                onToggle={() => toggleEnabled(wf)}
              />
            ))}
          </div>
        )}

      </div>

      {/* ── CRUD Modal (unchanged) ─────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Workflow" : "New Workflow"}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Workflow Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Strategy → Research pipeline"
              className={inputCls}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Source Agent *</label>
              <select
                value={form.sourceAgentId}
                onChange={e => setForm(f => ({ ...f, sourceAgentId: e.target.value }))}
                className={inputCls}
              >
                <option value="">— Select —</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Target Agent *</label>
              <select
                value={form.targetAgentId}
                onChange={e => setForm(f => ({ ...f, targetAgentId: e.target.value }))}
                className={inputCls}
              >
                <option value="">— Select —</option>
                {agents.filter(a => a.id !== form.sourceAgentId).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Trigger Type</label>
            <select
              value={form.triggerType}
              onChange={e => setForm(f => ({ ...f, triggerType: e.target.value as WorkflowTrigger }))}
              className={inputCls}
            >
              {TRIGGER_TYPES.map(t => <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>)}
            </select>
            <p className="text-[10px] text-text-ghost mt-1.5">
              {form.triggerType === "manual" && "Triggered explicitly by the user."}
              {form.triggerType === "approved_action" && "Target agent runs when a proposed action from the source is approved."}
              {form.triggerType === "completed_run" && "Target agent runs automatically when the source completes. (Phase 2)"}
            </p>
          </div>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-3 border border-white/[0.06]">
            <input
              type="checkbox"
              id="wfEnabled"
              checked={form.enabled}
              onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
              className="w-3.5 h-3.5 rounded accent-cyan-500"
            />
            <label htmlFor="wfEnabled" className="text-xs text-text-secondary cursor-pointer">
              Workflow enabled
            </label>
          </div>

          {formError && (
            <p className="text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 px-3 py-2 rounded-lg">
              {formError}
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button variant="primary" onClick={save} disabled={saving} className="flex-1">
              {saving ? "Saving…" : editing ? "Save" : "Create Workflow"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── sub-components ─────────────────────────────────────────────────

function OverviewStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-surface-1 px-4 py-3.5">
      <p className="text-2xl font-bold font-mono leading-none mb-1" style={{ color }}>{value}</p>
      <p className="text-[10px] text-text-muted">{label}</p>
    </div>
  );
}

function WorkflowCard({
  wf, onEdit, onDelete, onToggle,
}: {
  wf: AgentWorkflow;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const trigType = wf.triggerType as WorkflowTrigger;
  const trigColor = TRIGGER_COLOR[trigType] ?? "#475569";
  const trigLabel = TRIGGER_LABELS[trigType] ?? wf.triggerType;

  return (
    <div className={cn(
      "rounded-xl border bg-surface-1 p-4 flex flex-col gap-4 transition-all",
      wf.enabled ? "border-white/[0.08]" : "border-white/[0.04] opacity-60",
    )}>
      {/* Card header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-text-primary leading-tight">{wf.name}</p>
          <p className="text-[10px] text-text-ghost mt-0.5">{fmtDate(wf.createdAt)}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onToggle}
            className={cn(
              "text-[10px] px-2 py-1 rounded-lg border transition-all",
              wf.enabled
                ? "bg-accent-green/10 border-accent-green/20 text-accent-green hover:bg-accent-green/20"
                : "bg-surface-3 border-white/[0.08] text-text-muted hover:text-text-secondary"
            )}
          >
            {wf.enabled ? <><CheckCircle2 className="w-3 h-3 inline mr-0.5" />On</> : "Off"}
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 rounded hover:bg-white/[0.08] text-text-muted hover:text-text-primary transition-all"
            title="Edit"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-accent-red/10 text-text-muted hover:text-accent-red transition-all"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Visual flow */}
      <div className="flex flex-col items-center gap-0">
        {/* Source node */}
        <div className="w-full px-3 py-2.5 rounded-xl bg-accent-cyan/10 border border-accent-cyan/25">
          <p className="text-[10px] font-medium text-accent-cyan/70 uppercase tracking-widest mb-0.5">Source</p>
          <p className="text-sm font-semibold text-accent-cyan truncate">
            {wf.sourceAgent?.name ?? "Unknown Agent"}
          </p>
        </div>

        {/* Connector */}
        <div className="flex flex-col items-center py-2 gap-1.5">
          <div className="w-px h-4 bg-white/[0.08]" />
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium"
            style={{ color: trigColor, background: `${trigColor}12`, borderColor: `${trigColor}30` }}
          >
            <ArrowDown className="w-2.5 h-2.5" />
            {trigLabel}
          </div>
          <div className="w-px h-4 bg-white/[0.08]" />
        </div>

        {/* Target node */}
        <div className="w-full px-3 py-2.5 rounded-xl bg-accent-violet/10 border border-accent-violet/25">
          <p className="text-[10px] font-medium text-accent-violet/70 uppercase tracking-widest mb-0.5">Target</p>
          <p className="text-sm font-semibold text-accent-violet truncate">
            {wf.targetAgent?.name ?? "Unknown Agent"}
          </p>
        </div>
      </div>
    </div>
  );
}
