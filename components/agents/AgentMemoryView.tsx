"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Agent, AgentMemory, MemoryType } from "@/types";
import { Database, Plus, Pencil, Trash2, Search, ChevronDown } from "lucide-react";

const MEMORY_TYPES: MemoryType[] = ["fact", "decision", "pattern", "long_term", "short_term"];

const TYPE_CONFIG: Record<MemoryType, { label: string; color: string }> = {
  fact:       { label: "Fact",       color: "#06b6d4" },
  decision:   { label: "Decision",   color: "#8b5cf6" },
  pattern:    { label: "Pattern",    color: "#f59e0b" },
  long_term:  { label: "Long-term",  color: "#10b981" },
  short_term: { label: "Short-term", color: "#6366f1" },
};

function importanceColor(n: number): string {
  if (n >= 8) return "#ef4444";
  if (n >= 6) return "#f59e0b";
  if (n >= 4) return "#10b981";
  return "#475569";
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface FormState {
  agentId: string; memoryType: MemoryType; title: string;
  content: string; importance: number;
}

const DEFAULT_FORM: FormState = {
  agentId: "", memoryType: "fact", title: "", content: "", importance: 5,
};

const inputCls = "w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors";

export function AgentMemoryView() {
  const { showToast } = useAppStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [importanceFilter, setImportanceFilter] = useState(1);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AgentMemory | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function load() {
    const [a, m] = await Promise.all([
      fetch("/api/agents").then((r) => r.json()).catch(() => []),
      fetch("/api/agent-memory").then((r) => r.json()).catch(() => []),
    ]);
    setAgents(Array.isArray(a) ? a : []);
    setMemories(Array.isArray(m) ? m : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...DEFAULT_FORM, agentId: agentFilter !== "all" ? agentFilter : (agents[0]?.id ?? "") });
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(mem: AgentMemory, e?: React.MouseEvent) {
    e?.stopPropagation();
    setEditing(mem);
    setForm({ agentId: mem.agentId, memoryType: mem.memoryType, title: mem.title, content: mem.content, importance: mem.importance });
    setFormError("");
    setModalOpen(true);
  }

  async function save() {
    if (!form.agentId) { setFormError("Select an agent."); return; }
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    if (!form.content.trim()) { setFormError("Content is required."); return; }
    setSaving(true);
    setFormError("");
    try {
      const method = editing ? "PATCH" : "POST";
      const url = editing ? `/api/agent-memory/${editing.id}` : "/api/agent-memory";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      showToast(editing ? "Memory updated" : "Memory created");
      setModalOpen(false);
      await load();
    } catch {
      setFormError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMemory(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    await fetch(`/api/agent-memory/${id}`, { method: "DELETE" });
    setMemories((prev) => prev.filter((m) => m.id !== id));
    showToast("Memory deleted");
  }

  const filtered = memories.filter((m) => {
    if (agentFilter !== "all" && m.agentId !== agentFilter) return false;
    if (typeFilter !== "all" && m.memoryType !== typeFilter) return false;
    if (m.importance < importanceFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!m.title.toLowerCase().includes(q) && !m.content.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? "Unknown";

  return (
    <div className="h-full overflow-y-auto bg-void">
      <div className="max-w-[1080px] mx-auto px-6 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium text-text-ghost uppercase tracking-widest mb-1">Agent OS · Phase 1.5</p>
            <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">
              Agent <span className="text-accent-cyan">Memory</span>
            </h1>
            <p className="text-sm text-text-secondary mt-1.5">
              {loading ? "Loading..." : (
                <span className="text-text-muted">{filtered.length} memor{filtered.length !== 1 ? "ies" : "y"} — injected into agent context at run time based on importance.</span>
              )}
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" /> Add Memory
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search memories..."
              className="text-xs bg-surface-2 border border-white/[0.08] rounded-lg pl-8 pr-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/50 w-52" />
          </div>
          <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}
            className="text-xs bg-surface-2 border border-white/[0.08] rounded-lg px-3 py-2 text-text-secondary focus:outline-none focus:border-accent-cyan/50">
            <option value="all">All agents</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs bg-surface-2 border border-white/[0.08] rounded-lg px-3 py-2 text-text-secondary focus:outline-none focus:border-accent-cyan/50">
            <option value="all">All types</option>
            {MEMORY_TYPES.map((t) => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-muted">Min importance:</span>
            {[1, 4, 7].map((v) => (
              <button key={v} onClick={() => setImportanceFilter(v)}
                className={cn("text-xs px-2 py-1 rounded-lg border transition-all",
                  importanceFilter === v ? "bg-accent-cyan/15 border-accent-cyan/25 text-accent-cyan" : "bg-surface-2 border-white/[0.06] text-text-muted hover:text-text-secondary")}>
                {v === 1 ? "All" : v === 4 ? "Med+" : "High+"}
              </button>
            ))}
          </div>
        </div>

        {/* Memory Grid */}
        {loading && <p className="text-xs text-text-muted text-center py-8">Loading memories...</p>}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <Database className="w-8 h-8 mx-auto mb-3 text-text-ghost" />
            <p className="text-sm text-text-muted">No memories found.</p>
            <button onClick={openCreate} className="text-xs text-accent-cyan mt-2 hover:underline">Add first memory</button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {filtered.map((mem) => {
            const typeCfg = TYPE_CONFIG[mem.memoryType] ?? TYPE_CONFIG.fact;
            const impColor = importanceColor(mem.importance);
            return (
              <div key={mem.id} className="rounded-xl border border-white/[0.06] bg-surface-1 p-4 flex flex-col gap-3 group hover:border-white/[0.1] transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                      style={{ color: typeCfg.color, background: `${typeCfg.color}18` }}>
                      {typeCfg.label}
                    </span>
                    <span className="text-[10px] text-text-ghost truncate">{agentName(mem.agentId)}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
                    <button onClick={(e) => openEdit(mem, e)} className="p-1 rounded hover:bg-white/[0.08] text-text-muted hover:text-text-primary">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={(e) => deleteMemory(mem.id, e)} className="p-1 rounded hover:bg-accent-red/10 text-text-muted hover:text-accent-red">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-text-primary mb-1">{mem.title}</p>
                  <p className="text-[11px] text-text-muted leading-relaxed line-clamp-3">{mem.content}</p>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full"
                          style={{ background: i < mem.importance ? impColor : "#1e1e32" }} />
                      ))}
                    </div>
                    <span className="text-[9px] font-mono" style={{ color: impColor }}>{mem.importance}</span>
                  </div>
                  <span className="text-[9px] text-text-ghost">{fmtDate(mem.updatedAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Memory" : "New Memory"}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Agent *</label>
              <select value={form.agentId} onChange={(e) => setForm((f) => ({ ...f, agentId: e.target.value }))} className={inputCls}>
                <option value="">— Select agent —</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Type</label>
              <select value={form.memoryType} onChange={(e) => setForm((f) => ({ ...f, memoryType: e.target.value as MemoryType }))} className={inputCls}>
                {MEMORY_TYPES.map((t) => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Title *</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Short descriptive title" className={inputCls} autoFocus />
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Content *</label>
            <textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={4} placeholder="What should the agent remember?" className={`${inputCls} resize-none`} />
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1.5 block">
              Importance: <span className="font-mono" style={{ color: importanceColor(form.importance) }}>{form.importance}/10</span>
              <span className="text-text-ghost ml-2">(≥4 injected into context automatically)</span>
            </label>
            <input type="range" min={1} max={10} value={form.importance}
              onChange={(e) => setForm((f) => ({ ...f, importance: parseInt(e.target.value) }))}
              className="w-full accent-cyan-500" />
            <div className="flex justify-between text-[9px] text-text-ghost mt-0.5">
              <span>1 — Low</span><span>5 — Medium</span><span>10 — Critical</span>
            </div>
          </div>

          {formError && <p className="text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="flex gap-3 pt-1">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button variant="primary" onClick={save} disabled={saving} className="flex-1">
              {saving ? "Saving..." : editing ? "Save" : "Add Memory"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
