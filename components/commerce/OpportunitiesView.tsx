"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CommerceOpportunity, OpportunityType, OpportunityStatus } from "@/types";
import { Plus, TrendingUp, X, ChevronDown } from "lucide-react";

const TYPE_LABELS: Record<OpportunityType, string> = {
  ai_product: "AI Product", digital_product: "Digital Product", affiliate: "Affiliate",
  reseller: "Reseller", plr: "PLR", dropshipping: "Dropshipping",
  productized_service: "Productized Service", ads_campaign: "Ads Campaign", lead_generation: "Lead Gen",
};
const TYPE_COLORS: Record<OpportunityType, string> = {
  ai_product: "text-accent-violet bg-accent-violet/10 border-accent-violet/20",
  digital_product: "text-accent-purple bg-accent-purple/10 border-accent-purple/20",
  affiliate: "text-accent-blue bg-accent-blue/10 border-accent-blue/20",
  reseller: "text-accent-cyan bg-accent-cyan/10 border-accent-cyan/20",
  plr: "text-accent-amber bg-accent-amber/10 border-accent-amber/20",
  dropshipping: "text-accent-green bg-accent-green/10 border-accent-green/20",
  productized_service: "text-accent-green bg-accent-green/10 border-accent-green/20",
  ads_campaign: "text-accent-red bg-accent-red/10 border-accent-red/20",
  lead_generation: "text-accent-blue bg-accent-blue/10 border-accent-blue/20",
};

function statusBadge(status: OpportunityStatus) {
  const cfg: Record<OpportunityStatus, string> = {
    discovered: "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20",
    validating: "bg-accent-amber/10 text-accent-amber border-accent-amber/20",
    approved: "bg-accent-green/10 text-accent-green border-accent-green/20",
    rejected: "bg-accent-red/10 text-accent-red border-accent-red/20",
    testing: "bg-accent-blue/10 text-accent-blue border-accent-blue/20",
    live: "bg-accent-green/15 text-accent-green border-accent-green/30",
    archived: "bg-white/[0.04] text-text-ghost border-white/[0.06]",
  };
  return cfg[status] ?? cfg.discovered;
}

const EFFORT_COLORS: Record<string, string> = {
  low: "text-accent-green", medium: "text-accent-amber", high: "text-accent-red",
};

const EMPTY_FORM = {
  title: "", opportunityType: "digital_product" as OpportunityType,
  targetCustomer: "", offer: "", estimatedRevenue: "", estimatedMargin: "",
  buildEffort: "medium", riskLevel: "medium", source: "", notes: "",
};

export function OpportunitiesView() {
  const [items, setItems] = useState<CommerceOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<OpportunityStatus | "all">("all");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await fetch("/api/commerce/opportunities").then(r => r.json());
      setItems(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }

  async function create() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/commerce/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          estimatedRevenue: form.estimatedRevenue ? parseFloat(form.estimatedRevenue) : null,
          estimatedMargin: form.estimatedMargin ? parseFloat(form.estimatedMargin) : null,
        }),
      });
      setForm(EMPTY_FORM);
      setShowCreate(false);
      await load();
    } finally { setSaving(false); }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/commerce/opportunities/${id}`, {
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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Opportunities</h1>
            <p className="text-xs text-text-muted mt-0.5">{items.length} discovered · {items.filter(i => ["approved","live"].includes(i.status)).length} approved</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-green/10 border border-accent-green/25 text-accent-green text-sm font-medium hover:bg-accent-green/15 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Opportunity
          </button>
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {(["all", "discovered", "validating", "approved", "testing", "live", "archived"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                filter === s
                  ? "bg-accent-green/15 text-accent-green border-accent-green/30"
                  : "text-text-muted border-white/[0.06] hover:text-text-secondary hover:border-white/[0.12]"
              )}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Cards */}
        {loading ? (
          <div className="text-center py-20 text-text-muted text-sm">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20">
            <TrendingUp className="w-10 h-10 text-text-ghost mx-auto mb-3 opacity-40" />
            <p className="text-sm text-text-muted">No opportunities {filter !== "all" ? `with status "${filter}"` : "yet"}.</p>
            {filter === "all" && <p className="text-xs text-text-ghost mt-1">Create one manually or let agents discover them.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map(item => (
              <div key={item.id} className="bg-surface-2 border border-white/[0.06] rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary leading-snug">{item.title}</p>
                  <span className={cn("flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border", statusBadge(item.status))}>
                    {item.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", TYPE_COLORS[item.opportunityType])}>
                    {TYPE_LABELS[item.opportunityType]}
                  </span>
                  {item.riskLevel && (
                    <span className={cn("text-[10px] font-medium", EFFORT_COLORS[item.riskLevel] ?? "text-text-muted")}>
                      {item.riskLevel} risk
                    </span>
                  )}
                </div>
                {item.offer && <p className="text-xs text-text-muted line-clamp-2">{item.offer}</p>}
                {(item.estimatedRevenue != null || item.estimatedMargin != null) && (
                  <div className="flex gap-4">
                    {item.estimatedRevenue != null && (
                      <div>
                        <p className="text-[10px] text-text-ghost">Est. Revenue</p>
                        <p className="text-sm font-bold text-accent-green">€{item.estimatedRevenue.toLocaleString()}</p>
                      </div>
                    )}
                    {item.estimatedMargin != null && (
                      <div>
                        <p className="text-[10px] text-text-ghost">Est. Margin</p>
                        <p className="text-sm font-bold text-accent-cyan">{item.estimatedMargin}%</p>
                      </div>
                    )}
                  </div>
                )}
                {item.source && <p className="text-[10px] text-text-ghost">Source: {item.source}</p>}
                <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-white/[0.04] flex-wrap">
                  {item.status === "discovered" && (
                    <button onClick={() => updateStatus(item.id, "validating")} className="text-[10px] px-2 py-1 rounded bg-accent-amber/10 text-accent-amber border border-accent-amber/20 hover:bg-accent-amber/15 transition-colors">Validate</button>
                  )}
                  {item.status === "validating" && (
                    <button onClick={() => updateStatus(item.id, "approved")} className="text-[10px] px-2 py-1 rounded bg-accent-green/10 text-accent-green border border-accent-green/20 hover:bg-accent-green/15 transition-colors">Approve</button>
                  )}
                  {["discovered", "validating"].includes(item.status) && (
                    <button onClick={() => updateStatus(item.id, "rejected")} className="text-[10px] px-2 py-1 rounded bg-accent-red/10 text-accent-red border border-accent-red/20 hover:bg-accent-red/15 transition-colors">Reject</button>
                  )}
                  {!["archived", "rejected"].includes(item.status) && (
                    <button onClick={() => updateStatus(item.id, "archived")} className="text-[10px] px-2 py-1 rounded bg-white/[0.04] text-text-ghost border border-white/[0.06] hover:text-text-muted transition-colors ml-auto">Archive</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 bg-surface-2 border border-white/[0.08] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-text-primary">New Opportunity</h2>
              <button onClick={() => setShowCreate(false)} className="text-text-muted hover:text-text-primary transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Title *">
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. AI Writing Tool PLR Bundle" className="input-dark" />
              </Field>
              <Field label="Type">
                <select value={form.opportunityType} onChange={e => setForm(f => ({ ...f, opportunityType: e.target.value as OpportunityType }))} className="input-dark">
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Target Customer">
                <input value={form.targetCustomer} onChange={e => setForm(f => ({ ...f, targetCustomer: e.target.value }))} placeholder="Who buys this?" className="input-dark" />
              </Field>
              <Field label="Offer">
                <textarea value={form.offer} onChange={e => setForm(f => ({ ...f, offer: e.target.value }))} placeholder="What are we selling / offering?" className="input-dark min-h-[72px] resize-none" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Est. Revenue (€)">
                  <input type="number" value={form.estimatedRevenue} onChange={e => setForm(f => ({ ...f, estimatedRevenue: e.target.value }))} placeholder="0" className="input-dark" />
                </Field>
                <Field label="Est. Margin (%)">
                  <input type="number" value={form.estimatedMargin} onChange={e => setForm(f => ({ ...f, estimatedMargin: e.target.value }))} placeholder="0" className="input-dark" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Build Effort">
                  <select value={form.buildEffort} onChange={e => setForm(f => ({ ...f, buildEffort: e.target.value }))} className="input-dark">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </select>
                </Field>
                <Field label="Risk Level">
                  <select value={form.riskLevel} onChange={e => setForm(f => ({ ...f, riskLevel: e.target.value }))} className="input-dark">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </select>
                </Field>
              </div>
              <Field label="Source">
                <input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="Where was this found?" className="input-dark" />
              </Field>
              <Field label="Notes">
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional context…" className="input-dark min-h-[60px] resize-none" />
              </Field>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text-primary transition-colors">Cancel</button>
              <button onClick={create} disabled={saving || !form.title.trim()} className="px-4 py-2 rounded-lg bg-accent-green/15 text-accent-green border border-accent-green/25 text-sm font-medium hover:bg-accent-green/20 transition-colors disabled:opacity-40">
                {saving ? "Creating…" : "Create Opportunity"}
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

// Inject shared input style once
if (typeof document !== "undefined") {
  const style = document.getElementById("commerce-input-style");
  if (!style) {
    const s = document.createElement("style");
    s.id = "commerce-input-style";
    s.textContent = `.input-dark{width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text-primary,#e2e8f0);outline:none;transition:border-color 0.15s}.input-dark:focus{border-color:rgba(99,102,241,0.5)}.input-dark option{background:#1e1e2e}`;
    document.head.appendChild(s);
  }
}
