"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Prospect, ProspectStatus } from "@/types";
import { Plus, Users, X } from "lucide-react";

function statusBadge(status: ProspectStatus) {
  const cfg: Record<ProspectStatus, string> = {
    discovered: "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20",
    qualified: "bg-accent-violet/10 text-accent-violet border-accent-violet/20",
    rejected: "bg-accent-red/10 text-accent-red border-accent-red/20",
    converted_to_lead: "bg-accent-green/10 text-accent-green border-accent-green/20",
    archived: "bg-white/[0.04] text-text-ghost border-white/[0.06]",
  };
  return cfg[status] ?? cfg.discovered;
}

function fitColor(score: number | null): string {
  if (score == null) return "text-text-ghost";
  if (score >= 70) return "text-accent-green";
  if (score >= 40) return "text-accent-amber";
  return "text-accent-red";
}

const EMPTY_FORM = {
  companyName: "", contactName: "", role: "", email: "",
  industry: "", country: "", companySize: "", fitScore: "",
  painPointHypothesis: "", suggestedOffer: "", source: "",
};

export function ProspectsView() {
  const [items, setItems] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<ProspectStatus | "all">("all");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await fetch("/api/commerce/prospects").then(r => r.json());
      setItems(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }

  async function create() {
    if (!form.companyName.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/commerce/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, fitScore: form.fitScore ? parseInt(form.fitScore) : null }),
      });
      setForm(EMPTY_FORM);
      setShowCreate(false);
      await load();
    } finally { setSaving(false); }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/commerce/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  const visible = filter === "all" ? items : items.filter(i => i.status === filter);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Prospects</h1>
            <p className="text-xs text-text-muted mt-0.5">{items.length} total · {items.filter(i => i.status === "qualified").length} qualified</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-violet/10 border border-accent-violet/25 text-accent-violet text-sm font-medium hover:bg-accent-violet/15 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Prospect
          </button>
        </div>

        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {(["all", "discovered", "qualified", "converted_to_lead", "rejected", "archived"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                filter === s
                  ? "bg-accent-violet/15 text-accent-violet border-accent-violet/30"
                  : "text-text-muted border-white/[0.06] hover:text-text-secondary hover:border-white/[0.12]"
              )}
            >
              {s === "all" ? "All" : s.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-text-muted text-sm">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-10 h-10 text-text-ghost mx-auto mb-3 opacity-40" />
            <p className="text-sm text-text-muted">No prospects {filter !== "all" ? `with status "${filter.replace(/_/g, " ")}"` : "yet"}.</p>
            {filter === "all" && <p className="text-xs text-text-ghost mt-1">Agents can discover prospects, or add them manually.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map(item => (
              <div key={item.id} className="bg-surface-2 border border-white/[0.06] rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{item.companyName}</p>
                    {item.contactName && <p className="text-xs text-text-muted">{item.contactName}{item.role ? ` · ${item.role}` : ""}</p>}
                  </div>
                  <span className={cn("flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border", statusBadge(item.status))}>
                    {item.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  {item.industry && <span className="text-text-muted">{item.industry}</span>}
                  {item.country && <span className="text-text-ghost">{item.country}</span>}
                  {item.companySize && <span className="text-text-ghost">{item.companySize}</span>}
                </div>
                {item.fitScore != null && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-ghost">Fit Score</span>
                    <span className={cn("text-base font-bold font-mono", fitColor(item.fitScore))}>{item.fitScore}</span>
                    <span className="text-[10px] text-text-ghost">/ 100</span>
                  </div>
                )}
                {item.painPointHypothesis && (
                  <p className="text-xs text-text-muted line-clamp-2 italic">&ldquo;{item.painPointHypothesis}&rdquo;</p>
                )}
                {item.suggestedOffer && (
                  <p className="text-xs text-text-secondary line-clamp-2">Offer: {item.suggestedOffer}</p>
                )}
                {item.email && <p className="text-[10px] text-text-ghost">{item.email}</p>}
                <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-white/[0.04] flex-wrap">
                  {item.status === "discovered" && (
                    <button onClick={() => updateStatus(item.id, "qualified")} className="text-[10px] px-2 py-1 rounded bg-accent-violet/10 text-accent-violet border border-accent-violet/20 hover:bg-accent-violet/15 transition-colors">Qualify</button>
                  )}
                  {item.status === "qualified" && (
                    <button onClick={() => updateStatus(item.id, "converted_to_lead")} className="text-[10px] px-2 py-1 rounded bg-accent-green/10 text-accent-green border border-accent-green/20 hover:bg-accent-green/15 transition-colors">Convert to Lead</button>
                  )}
                  {["discovered", "qualified"].includes(item.status) && (
                    <button onClick={() => updateStatus(item.id, "rejected")} className="text-[10px] px-2 py-1 rounded bg-accent-red/10 text-accent-red border border-accent-red/20 hover:bg-accent-red/15 transition-colors">Reject</button>
                  )}
                  {!["archived", "converted_to_lead"].includes(item.status) && (
                    <button onClick={() => updateStatus(item.id, "archived")} className="text-[10px] px-2 py-1 rounded bg-white/[0.04] text-text-ghost border border-white/[0.06] hover:text-text-muted transition-colors ml-auto">Archive</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 bg-surface-2 border border-white/[0.08] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-text-primary">New Prospect</h2>
              <button onClick={() => setShowCreate(false)} className="text-text-muted hover:text-text-primary transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Company Name *">
                <input value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} placeholder="Acme Corp" className="input-dark" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Contact Name">
                  <input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Jane Smith" className="input-dark" />
                </Field>
                <Field label="Role">
                  <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="CEO, CMO…" className="input-dark" />
                </Field>
              </div>
              <Field label="Email">
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@acme.com" className="input-dark" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Industry">
                  <input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} placeholder="SaaS, E-commerce…" className="input-dark" />
                </Field>
                <Field label="Company Size">
                  <input value={form.companySize} onChange={e => setForm(f => ({ ...f, companySize: e.target.value }))} placeholder="1–10, 50–200…" className="input-dark" />
                </Field>
              </div>
              <Field label="Fit Score (0–100)">
                <input type="number" min={0} max={100} value={form.fitScore} onChange={e => setForm(f => ({ ...f, fitScore: e.target.value }))} placeholder="75" className="input-dark" />
              </Field>
              <Field label="Pain Point Hypothesis">
                <textarea value={form.painPointHypothesis} onChange={e => setForm(f => ({ ...f, painPointHypothesis: e.target.value }))} placeholder="What problem do they have?" className="input-dark min-h-[64px] resize-none" />
              </Field>
              <Field label="Suggested Offer">
                <input value={form.suggestedOffer} onChange={e => setForm(f => ({ ...f, suggestedOffer: e.target.value }))} placeholder="Which product/service fits best?" className="input-dark" />
              </Field>
              <Field label="Source">
                <input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="LinkedIn, research, agent…" className="input-dark" />
              </Field>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text-primary transition-colors">Cancel</button>
              <button onClick={create} disabled={saving || !form.companyName.trim()} className="px-4 py-2 rounded-lg bg-accent-violet/15 text-accent-violet border border-accent-violet/25 text-sm font-medium hover:bg-accent-violet/20 transition-colors disabled:opacity-40">
                {saving ? "Creating…" : "Create Prospect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-text-muted font-medium">{label}</label>
      {children}
    </div>
  );
}
