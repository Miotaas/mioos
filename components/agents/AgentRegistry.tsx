"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Agent, AgentType, AgentStatus } from "@/types";
import type { AgentHealthRecord } from "@/types";
import {
  Bot, Plus, Pencil, Trash2, Play, Pause, Search,
  CheckCircle2, XCircle, Clock, ChevronDown, ChevronLeft,
  HeartPulse, TrendingUp, ShieldAlert, Database, Wrench, Network,
} from "lucide-react";

const AGENT_TYPES: AgentType[] = ["strategy", "research", "lead_generation", "outreach", "project_management", "custom"];
const AGENT_STATUSES: AgentStatus[] = ["active", "paused", "disabled"];

const TYPE_COLOR: Record<string, string> = {
  strategy: "#6366f1", research: "#8b5cf6", lead_generation: "#3b82f6",
  outreach: "#06b6d4", project_management: "#10b981", custom: "#475569",
};
const STATUS_COLOR: Record<string, string> = {
  active: "#10b981", paused: "#f59e0b", disabled: "#475569",
};

function fmtRelative(date: string | null | undefined): string {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface FormState {
  name: string; slug: string; description: string; status: string;
  agentType: string; prompt: string; systemPrompt: string;
  requiresApproval: boolean;
}

const DEFAULT_FORM: FormState = {
  name: "", slug: "", description: "", status: "active",
  agentType: "custom", prompt: "", systemPrompt: "",
  requiresApproval: true,
};

const inputCls = "w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors";

export function AgentRegistry() {
  const { showToast } = useAppStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [running, setRunning] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "ops" | "prompt">("info");
  const [opsRecord, setOpsRecord] = useState<AgentHealthRecord | null>(null);
  const [opsLoading, setOpsLoading] = useState(false);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => { setAgents(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab !== "ops" || !selected) return;
    setOpsRecord(null);
    setOpsLoading(true);
    fetch("/api/agents/fleet")
      .then((r) => r.json())
      .then((data) => {
        const rec = Array.isArray(data.agents)
          ? (data.agents as AgentHealthRecord[]).find(a => a.id === selected.id) ?? null
          : null;
        setOpsRecord(rec);
      })
      .catch(() => setOpsRecord(null))
      .finally(() => setOpsLoading(false));
  }, [activeTab, selected?.id]);

  function slugify(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function openCreate() {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(agent: Agent, e?: React.MouseEvent) {
    e?.stopPropagation();
    setEditing(agent);
    setForm({
      name: agent.name,
      slug: agent.slug,
      description: agent.description ?? "",
      status: agent.status,
      agentType: agent.agentType,
      prompt: agent.prompt ?? "",
      systemPrompt: agent.systemPrompt ?? "",
      requiresApproval: agent.requiresApproval,
    });
    setFormError("");
    setModalOpen(true);
  }

  async function save() {
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    if (!form.slug.trim()) { setFormError("Slug is required."); return; }
    setSaving(true);
    setFormError("");
    try {
      const method = editing ? "PATCH" : "POST";
      const url = editing ? `/api/agents/${editing.id}` : "/api/agents";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Save failed");
      }
      const saved = await res.json() as Agent;
      if (editing) {
        setAgents((prev) => prev.map((a) => (a.id === editing.id ? saved : a)));
        if (selected?.id === editing.id) setSelected(saved);
        showToast("Agent updated");
      } else {
        setAgents((prev) => [saved, ...prev]);
        setSelected(saved);
        showToast("Agent created");
      }
      setModalOpen(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAgent(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    await fetch(`/api/agents/${id}`, { method: "DELETE" });
    setAgents((prev) => prev.filter((a) => a.id !== id));
    if (selected?.id === id) setSelected(null);
    showToast("Agent deleted");
  }

  async function toggleStatus(agent: Agent, e?: React.MouseEvent) {
    e?.stopPropagation();
    const newStatus = agent.status === "active" ? "paused" : "active";
    const res = await fetch(`/api/agents/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const updated = await res.json() as Agent;
    setAgents((prev) => prev.map((a) => (a.id === agent.id ? updated : a)));
    if (selected?.id === agent.id) setSelected(updated);
    showToast(`Agent ${newStatus}`);
  }

  async function runNow(agent: Agent, e?: React.MouseEvent) {
    e?.stopPropagation();
    setRunning(agent.id);
    showToast(`Running ${agent.name}...`);
    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id }),
      });
      if (!res.ok) throw new Error();
      showToast(`${agent.name} completed`);
      const refreshed = await fetch("/api/agents").then((r) => r.json()).catch(() => []);
      setAgents(Array.isArray(refreshed) ? refreshed : []);
      const updated = (Array.isArray(refreshed) ? refreshed : []).find((a: Agent) => a.id === agent.id);
      if (updated && selected?.id === agent.id) setSelected(updated as Agent);
    } catch {
      showToast("Run failed", "error");
    } finally {
      setRunning(null);
    }
  }

  const filtered = agents.filter((a) => {
    if (typeFilter !== "all" && a.agentType !== typeFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.name.toLowerCase().includes(q) && !a.slug.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left: agent list — full-width on mobile when nothing selected */}
      <div className={cn(
        "flex-shrink-0 border-r border-white/[0.06] flex-col",
        "w-full md:w-72",
        selected ? "hidden md:flex" : "flex"
      )}>
        <div className="px-4 py-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Bot className="w-4 h-4 text-accent-cyan" /> Agent Configuration
              </h1>
              <p className="text-[10px] text-text-ghost mt-0.5">Technical runtime agents · separate from Workforce Teams</p>
            </div>
            <Button variant="primary" size="sm" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents..."
              className="w-full text-xs bg-surface-3 border border-white/[0.08] rounded-lg pl-8 pr-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/50"
            />
          </div>
          <div className="flex gap-1.5">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="flex-1 text-[10px] bg-surface-3 border border-white/[0.08] rounded-lg px-2 py-1.5 text-text-muted focus:outline-none">
              <option value="all">All types</option>
              {AGENT_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="flex-1 text-[10px] bg-surface-3 border border-white/[0.08] rounded-lg px-2 py-1.5 text-text-muted focus:outline-none">
              <option value="all">All statuses</option>
              {AGENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {loading && <p className="text-xs text-text-muted px-2 py-4">Loading...</p>}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-8">
              <p className="text-xs text-text-muted">No agents found</p>
              <button onClick={openCreate} className="text-xs text-accent-cyan mt-2 hover:underline">Create first agent</button>
            </div>
          )}
          {filtered.map((agent) => {
            const typeColor = TYPE_COLOR[agent.agentType] ?? "#475569";
            const statusColor = STATUS_COLOR[agent.status] ?? "#475569";
            const lastRun = agent.runs?.[0];
            return (
              <div
                key={agent.id}
                onClick={() => { setSelected(agent); setActiveTab("info"); setOpsRecord(null); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(agent); } }}
                role="button"
                tabIndex={0}
                className={cn(
                  "w-full text-left px-3 py-3 rounded-xl border transition-all group cursor-pointer",
                  selected?.id === agent.id
                    ? "border-accent-cyan/25 bg-accent-cyan/10"
                    : "border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.02]",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-text-primary leading-snug truncate">{agent.name}</p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
                    <button onClick={(e) => openEdit(agent, e)} className="p-1 rounded hover:bg-white/[0.08] text-text-muted hover:text-text-primary">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={(e) => deleteAgent(agent.id, e)} className="p-1 rounded hover:bg-accent-red/10 text-text-muted hover:text-accent-red">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-text-ghost mt-0.5 font-mono">{agent.slug}</p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium capitalize" style={{ color: typeColor, background: `${typeColor}15` }}>
                    {agent.agentType.replace("_", " ")}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium capitalize" style={{ color: statusColor, background: `${statusColor}15` }}>
                    {agent.status}
                  </span>
                </div>
                {lastRun && (
                  <p className="text-[10px] text-text-ghost mt-1.5">Last run: {fmtRelative(lastRun.createdAt)}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: detail — full-width on mobile */}
      {selected ? (
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          <div className="px-4 md:px-6 py-3 md:py-4 border-b border-white/[0.06] flex flex-col gap-2">
            {/* Mobile back button */}
            <button
              className="md:hidden flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-secondary transition-colors self-start"
              onClick={() => { setSelected(null); setOpsRecord(null); }}
            >
              <ChevronLeft className="w-3.5 h-3.5" /> All agents
            </button>
            <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-text-primary">{selected.name}</h2>
              <p className="text-xs text-text-ghost font-mono mt-0.5">{selected.slug}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] px-2 py-1 rounded capitalize font-medium"
                  style={{ color: TYPE_COLOR[selected.agentType], background: `${TYPE_COLOR[selected.agentType]}15` }}>
                  {selected.agentType.replace("_", " ")}
                </span>
                <span className="text-[10px] px-2 py-1 rounded capitalize font-medium"
                  style={{ color: STATUS_COLOR[selected.status], background: `${STATUS_COLOR[selected.status]}15` }}>
                  {selected.status}
                </span>
                {selected.requiresApproval && (
                  <span className="text-[10px] px-2 py-1 rounded bg-accent-amber/10 text-accent-amber border border-accent-amber/20">
                    Requires Approval
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {selected.status !== "disabled" && (
                <Button variant="ghost" size="sm" onClick={(e) => toggleStatus(selected, e)}>
                  {selected.status === "active" ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Activate</>}
                </Button>
              )}
              {selected.status === "active" && (
                <Button variant="primary" size="sm" onClick={(e) => runNow(selected, e)} disabled={running === selected.id}>
                  <Play className="w-3.5 h-3.5" /> {running === selected.id ? "Running..." : "Run Now"}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => openEdit(selected)}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            </div>
            </div>
          </div>

          <div className="flex border-b border-white/[0.06] px-4 md:px-6">
            {(["info", "ops", "prompt"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn("text-xs px-3 py-2.5 capitalize transition-all border-b-2 -mb-px",
                  activeTab === tab ? "border-accent-cyan text-accent-cyan" : "border-transparent text-text-muted hover:text-text-secondary")}>
                {tab === "ops" ? "Ops" : tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
            {activeTab === "ops" && (
              <OpsPanel record={opsRecord} loading={opsLoading} />
            )}
            {activeTab === "info" && (
              <div className="space-y-4 max-w-2xl">
                {selected.description && (
                  <div className="bg-surface-2 border border-white/[0.06] rounded-xl p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-2">Description</p>
                    <p className="text-sm text-text-secondary">{selected.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Type", value: selected.agentType.replace("_", " ") },
                    { label: "Status", value: selected.status },
                    { label: "Requires Approval", value: selected.requiresApproval ? "Yes" : "No" },
                    { label: "Schedule Enabled", value: selected.scheduleEnabled ? "Yes" : "No" },
                    { label: "Created", value: new Date(selected.createdAt).toLocaleDateString("en-GB") },
                    { label: "Last Updated", value: new Date(selected.updatedAt).toLocaleDateString("en-GB") },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-surface-2 border border-white/[0.06] rounded-xl p-3">
                      <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-1">{label}</p>
                      <p className="text-xs text-text-secondary capitalize">{value}</p>
                    </div>
                  ))}
                </div>
                {selected.runs && selected.runs.length > 0 && (
                  <div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-2">Recent Runs</p>
                    <div className="space-y-1.5">
                      {selected.runs.slice(0, 5).map((run) => (
                        <div key={run.id} className="flex items-center gap-3 px-3 py-2 bg-surface-2 border border-white/[0.06] rounded-xl">
                          {run.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5 text-accent-green flex-shrink-0" />}
                          {run.status === "failed" && <XCircle className="w-3.5 h-3.5 text-accent-red flex-shrink-0" />}
                          {run.status === "running" && <Clock className="w-3.5 h-3.5 text-accent-cyan flex-shrink-0" />}
                          <span className="flex-1 text-xs text-text-secondary capitalize">{run.status}</span>
                          <span className="text-[10px] text-text-ghost">{fmtRelative(run.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "prompt" && (
              <div className="space-y-4 max-w-2xl">
                {selected.systemPrompt && (
                  <div className="bg-surface-2 border border-white/[0.06] rounded-xl p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-2">System Prompt</p>
                    <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono leading-relaxed">{selected.systemPrompt}</pre>
                  </div>
                )}
                {selected.prompt && (
                  <div className="bg-surface-2 border border-white/[0.06] rounded-xl p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-2">User Prompt</p>
                    <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono leading-relaxed">{selected.prompt}</pre>
                  </div>
                )}
                {!selected.systemPrompt && !selected.prompt && (
                  <p className="text-xs text-text-muted text-center py-8">No custom prompt configured — uses default system prompt.</p>
                )}
                <Button variant="ghost" size="sm" onClick={() => openEdit(selected)}>
                  <Pencil className="w-3.5 h-3.5" /> Edit Prompts
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        !loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-text-muted">
              <Bot className="w-8 h-8 mx-auto mb-3 text-text-ghost" />
              <p className="text-sm">Select an agent to view details</p>
              <button onClick={openCreate} className="text-xs text-accent-cyan mt-2 hover:underline">or create a new agent</button>
            </div>
          </div>
        )
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit — ${editing.name}` : "New Agent"}>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Name *</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))}
                placeholder="Daily Strategy Agent" className={inputCls} autoFocus />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Slug *</label>
              <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                placeholder="daily-strategy-agent" className={`${inputCls} font-mono`} />
            </div>
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Description</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="What does this agent do?" className={`${inputCls} resize-none`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Type</label>
              <select value={form.agentType} onChange={(e) => setForm((f) => ({ ...f, agentType: e.target.value }))} className={inputCls}>
                {AGENT_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
                {AGENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-3 border border-white/[0.06]">
            <input type="checkbox" id="requiresApproval" checked={form.requiresApproval}
              onChange={(e) => setForm((f) => ({ ...f, requiresApproval: e.target.checked }))}
              className="w-3.5 h-3.5 rounded accent-cyan-500" />
            <label htmlFor="requiresApproval" className="text-xs text-text-secondary cursor-pointer">
              Requires human approval before executing proposed actions
            </label>
          </div>

          <details className="border border-white/[0.06] rounded-xl overflow-hidden">
            <summary className="px-3 py-2.5 text-xs text-text-muted cursor-pointer hover:text-text-secondary flex items-center gap-2">
              <ChevronDown className="w-3 h-3" /> Prompts (optional)
            </summary>
            <div className="px-3 pb-3 space-y-3 border-t border-white/[0.06] pt-3">
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">System Prompt</label>
                <textarea value={form.systemPrompt} onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
                  rows={4} placeholder="Override the default system prompt..." className={`${inputCls} resize-none font-mono text-xs`} />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">User Prompt / Task</label>
                <textarea value={form.prompt} onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                  rows={4} placeholder="Specific instructions for this agent run..." className={`${inputCls} resize-none`} />
              </div>
            </div>
          </details>

          {formError && <p className="text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="flex gap-3 pt-1">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button variant="primary" onClick={save} disabled={saving} className="flex-1">
              {saving ? "Saving..." : editing ? "Save" : "Create Agent"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Ops Panel ────────────────────────────────────────────────

const HEALTH_COLOR: Record<string, string> = {
  healthy: "#10b981",
  warning: "#f59e0b",
  offline: "#ef4444",
};

const PRESSURE_COLOR: Record<string, string> = {
  low:    "#475569",
  medium: "#f59e0b",
  high:   "#ef4444",
};

function fmtOpsDate(d: string | null): string {
  if (!d) return "Never";
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function fmtOpsRelative(d: string | null): string {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function OpsCard({
  label, value, sub, color, icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-surface-2 border border-white/[0.06] rounded-xl p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-text-muted">{icon}</span>}
        <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium">{label}</p>
      </div>
      <p className="text-sm font-semibold leading-tight" style={{ color: color ?? undefined }}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-text-ghost">{sub}</p>}
    </div>
  );
}

function RateCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-surface-2 border border-white/[0.06] rounded-xl p-3 flex flex-col gap-1.5">
      <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium">{label}</p>
      <p className="text-sm font-bold font-mono leading-none" style={{ color }}>{value}%</p>
      <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function OpsPanel({ record, loading }: { record: AgentHealthRecord | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <HeartPulse className="w-6 h-6 text-text-ghost animate-pulse" />
        <span className="ml-2 text-sm text-text-muted">Loading operational data…</span>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <HeartPulse className="w-8 h-8 text-text-ghost mb-3" />
        <p className="text-sm text-text-muted">No operational data available.</p>
      </div>
    );
  }

  const healthColor   = HEALTH_COLOR[record.healthStatus]   ?? "#475569";
  const pressureColor = PRESSURE_COLOR[record.approvalPressure] ?? "#475569";

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Health status banner */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl border"
        style={{ background: `${healthColor}08`, borderColor: `${healthColor}30` }}
      >
        <HeartPulse className="w-4 h-4 flex-shrink-0" style={{ color: healthColor }} />
        <div className="flex-1">
          <p className="text-xs font-semibold capitalize" style={{ color: healthColor }}>
            {record.healthStatus}
          </p>
          <p className="text-[10px] text-text-muted">
            {record.healthStatus === "healthy"
              ? "Active, recently ran, low failure rate"
              : record.healthStatus === "warning"
                ? "Last run >24 h ago or failure rate >20 %"
                : record.status === "disabled"
                  ? "Agent is disabled"
                  : "No successful run in the last 7 days"}
          </p>
        </div>
        <span className="text-lg font-bold font-mono" style={{ color: healthColor }}>
          {record.successRate}%
        </span>
      </div>

      {/* Run timeline */}
      <div>
        <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-2">Run Timeline</p>
        <div className="grid grid-cols-3 gap-2">
          <OpsCard
            label="Last Run"
            value={fmtOpsDate(record.lastRunAt)}
            sub={fmtOpsRelative(record.lastRunAt)}
            color={record.lastRunAt ? undefined : "#475569"}
          />
          <OpsCard
            label="Last Success"
            value={fmtOpsDate(record.lastSuccessAt)}
            sub={fmtOpsRelative(record.lastSuccessAt)}
            color={record.lastSuccessAt ? "#10b981" : "#475569"}
            icon={<CheckCircle2 className="w-3 h-3 text-accent-green" />}
          />
          <OpsCard
            label="Last Failure"
            value={fmtOpsDate(record.lastFailureAt)}
            sub={fmtOpsRelative(record.lastFailureAt)}
            color={record.lastFailureAt ? "#ef4444" : "#475569"}
            icon={<XCircle className="w-3 h-3 text-accent-red" />}
          />
        </div>
      </div>

      {/* Rate stats */}
      <div>
        <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-2">Performance</p>
        <div className="grid grid-cols-3 gap-2">
          <OpsCard label="Total Runs" value={record.totalRuns} color={record.totalRuns > 0 ? "#06b6d4" : "#475569"} />
          <RateCard label="Success Rate" value={record.successRate} color="#10b981" />
          <RateCard label="Failure Rate" value={record.failureRate} color={record.failureRate > 20 ? "#ef4444" : "#475569"} />
        </div>
      </div>

      {/* Approval pressure */}
      <div>
        <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-2">Approval Pressure</p>
        <div className="grid grid-cols-2 gap-2">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl border"
            style={{ background: `${pressureColor}08`, borderColor: `${pressureColor}30` }}
          >
            <ShieldAlert className="w-4 h-4 flex-shrink-0" style={{ color: pressureColor }} />
            <div>
              <p className="text-xs font-semibold capitalize" style={{ color: pressureColor }}>
                {record.approvalPressure} pressure
              </p>
              <p className="text-[10px] text-text-muted">{record.pendingApprovalCount} pending approval{record.pendingApprovalCount !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <OpsCard label="Pending Approvals" value={record.pendingApprovalCount} color={record.pendingApprovalCount > 0 ? pressureColor : "#475569"} />
        </div>
      </div>

      {/* Resource counts */}
      <div>
        <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-2">Resources</p>
        <div className="grid grid-cols-3 gap-2">
          <OpsCard
            label="Memory Entries"
            value={record.memoryCount}
            color={record.memoryCount > 0 ? "#8b5cf6" : "#475569"}
            icon={<Database className="w-3 h-3" />}
          />
          <OpsCard
            label="Tools Assigned"
            value={record.toolCount}
            color={record.toolCount > 0 ? "#06b6d4" : "#475569"}
            icon={<Wrench className="w-3 h-3" />}
          />
          <OpsCard
            label="Workflows"
            value={record.workflowCount}
            color={record.workflowCount > 0 ? "#10b981" : "#475569"}
            icon={<Network className="w-3 h-3" />}
          />
        </div>
      </div>
    </div>
  );
}
