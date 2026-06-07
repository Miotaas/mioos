"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CampaignDraft, CampaignChannel, CampaignStatus } from "@/types";
import { Plus, Megaphone, X, ShieldAlert } from "lucide-react";

const CHANNEL_LABELS: Record<CampaignChannel, string> = {
  linkedin: "LinkedIn", email: "Email", google_ads: "Google Ads", meta_ads: "Meta Ads",
  instagram: "Instagram", facebook: "Facebook", retargeting: "Retargeting", landing_page: "Landing Page",
};
const CHANNEL_COLORS: Record<CampaignChannel, string> = {
  linkedin: "text-accent-blue bg-accent-blue/10 border-accent-blue/20",
  email: "text-accent-green bg-accent-green/10 border-accent-green/20",
  google_ads: "text-accent-amber bg-accent-amber/10 border-accent-amber/20",
  meta_ads: "text-accent-violet bg-accent-violet/10 border-accent-violet/20",
  instagram: "text-accent-red bg-accent-red/10 border-accent-red/20",
  facebook: "text-accent-blue bg-accent-blue/10 border-accent-blue/20",
  retargeting: "text-accent-cyan bg-accent-cyan/10 border-accent-cyan/20",
  landing_page: "text-accent-purple bg-accent-purple/10 border-accent-purple/20",
};

function statusBadge(status: CampaignStatus) {
  const cfg: Record<CampaignStatus, string> = {
    draft: "bg-white/[0.06] text-text-muted border-white/[0.08]",
    pending_approval: "bg-accent-amber/10 text-accent-amber border-accent-amber/20",
    approved: "bg-accent-green/10 text-accent-green border-accent-green/20",
    rejected: "bg-accent-red/10 text-accent-red border-accent-red/20",
    ready_to_launch: "bg-accent-blue/10 text-accent-blue border-accent-blue/20",
    launched_manually: "bg-accent-green/15 text-accent-green border-accent-green/30",
    archived: "bg-white/[0.04] text-text-ghost border-white/[0.06]",
  };
  return cfg[status] ?? cfg.draft;
}

const EMPTY_FORM = {
  name: "", channel: "email" as CampaignChannel, goal: "",
  targetAudience: "", offer: "", hook: "",
  outreachMessage: "", adCopy: "", cta: "", successMetric: "",
};

export function CampaignDraftsView() {
  const [items, setItems] = useState<CampaignDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await fetch("/api/commerce/campaigns").then(r => r.json());
      setItems(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }

  async function create() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/commerce/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm(EMPTY_FORM);
      setShowCreate(false);
      await load();
    } finally { setSaving(false); }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/commerce/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        {/* Safety banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-accent-amber/[0.06] border border-accent-amber/20 mb-6">
          <ShieldAlert className="w-4 h-4 text-accent-amber flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-accent-amber">Approval-First — Campaigns are never launched automatically</p>
            <p className="text-[11px] text-text-muted mt-0.5">Drafts sit here until you manually approve and launch them through the actual platform. No budget is ever spent by agents.</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Campaign Drafts</h1>
            <p className="text-xs text-text-muted mt-0.5">{items.length} total · {items.filter(i => i.status === "approved").length} approved</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-purple/10 border border-accent-purple/25 text-accent-purple text-sm font-medium hover:bg-accent-purple/15 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Draft
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-text-muted text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Megaphone className="w-10 h-10 text-text-ghost mx-auto mb-3 opacity-40" />
            <p className="text-sm text-text-muted">No campaign drafts yet.</p>
            <p className="text-xs text-text-ghost mt-1">Create drafts manually or let the Ads Agent prepare them.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="bg-surface-2 border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-text-primary">{item.name}</p>
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", CHANNEL_COLORS[item.channel as CampaignChannel])}>
                        {CHANNEL_LABELS[item.channel as CampaignChannel] ?? item.channel}
                      </span>
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", statusBadge(item.status as CampaignStatus))}>
                        {item.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    {item.goal && <p className="text-xs text-text-muted mt-1 truncate">{item.goal}</p>}
                  </div>
                  <button
                    onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-white/[0.04] transition-colors border border-white/[0.06]"
                  >
                    {expanded === item.id ? "Collapse" : "View"}
                  </button>
                </div>
                {expanded === item.id && (
                  <div className="px-4 pb-4 space-y-3 border-t border-white/[0.04] pt-3">
                    {item.targetAudience && <DetailRow label="Target Audience" value={item.targetAudience} />}
                    {item.offer && <DetailRow label="Offer" value={item.offer} />}
                    {item.hook && <DetailRow label="Hook" value={item.hook} />}
                    {item.outreachMessage && <DetailRow label="Outreach Message" value={item.outreachMessage} />}
                    {item.adCopy && <DetailRow label="Ad Copy" value={item.adCopy} />}
                    {item.cta && <DetailRow label="CTA" value={item.cta} />}
                    {item.successMetric && <DetailRow label="Success Metric" value={item.successMetric} />}
                    <div className="flex items-center gap-2 pt-2 flex-wrap">
                      {item.status === "draft" && (
                        <button onClick={() => updateStatus(item.id, "pending_approval")} className="text-[10px] px-2 py-1 rounded bg-accent-amber/10 text-accent-amber border border-accent-amber/20 hover:bg-accent-amber/15 transition-colors">Submit for Approval</button>
                      )}
                      {item.status === "pending_approval" && (
                        <button onClick={() => updateStatus(item.id, "approved")} className="text-[10px] px-2 py-1 rounded bg-accent-green/10 text-accent-green border border-accent-green/20 hover:bg-accent-green/15 transition-colors">Approve</button>
                      )}
                      {item.status === "approved" && (
                        <button onClick={() => updateStatus(item.id, "ready_to_launch")} className="text-[10px] px-2 py-1 rounded bg-accent-blue/10 text-accent-blue border border-accent-blue/20 hover:bg-accent-blue/15 transition-colors">Mark Ready</button>
                      )}
                      {!["archived", "launched_manually"].includes(item.status) && (
                        <button onClick={() => updateStatus(item.id, "archived")} className="text-[10px] px-2 py-1 rounded bg-white/[0.04] text-text-ghost border border-white/[0.06] hover:text-text-muted transition-colors ml-auto">Archive</button>
                      )}
                    </div>
                  </div>
                )}
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
              <h2 className="text-base font-semibold text-text-primary">New Campaign Draft</h2>
              <button onClick={() => setShowCreate(false)} className="text-text-muted hover:text-text-primary transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Campaign Name *">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. LinkedIn Outreach — SME CFOs" className="input-dark" />
              </Field>
              <Field label="Channel">
                <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value as CampaignChannel }))} className="input-dark">
                  {Object.entries(CHANNEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Goal">
                <input value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} placeholder="What should this campaign achieve?" className="input-dark" />
              </Field>
              <Field label="Target Audience">
                <input value={form.targetAudience} onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))} placeholder="Who is this for?" className="input-dark" />
              </Field>
              <Field label="Offer">
                <input value={form.offer} onChange={e => setForm(f => ({ ...f, offer: e.target.value }))} placeholder="What are we offering?" className="input-dark" />
              </Field>
              <Field label="Hook / Angle">
                <textarea value={form.hook} onChange={e => setForm(f => ({ ...f, hook: e.target.value }))} placeholder="Opening hook or angle…" className="input-dark min-h-[64px] resize-none" />
              </Field>
              <Field label="Outreach Message / Ad Copy">
                <textarea value={form.outreachMessage || form.adCopy} onChange={e => setForm(f => ({ ...f, outreachMessage: e.target.value, adCopy: e.target.value }))} placeholder="Message body or ad copy…" className="input-dark min-h-[80px] resize-none" />
              </Field>
              <Field label="CTA">
                <input value={form.cta} onChange={e => setForm(f => ({ ...f, cta: e.target.value }))} placeholder="e.g. Book a 15-min call" className="input-dark" />
              </Field>
              <Field label="Success Metric">
                <input value={form.successMetric} onChange={e => setForm(f => ({ ...f, successMetric: e.target.value }))} placeholder="e.g. 5% reply rate, 20 booked calls" className="input-dark" />
              </Field>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text-primary transition-colors">Cancel</button>
              <button onClick={create} disabled={saving || !form.name.trim()} className="px-4 py-2 rounded-lg bg-accent-purple/15 text-accent-purple border border-accent-purple/25 text-sm font-medium hover:bg-accent-purple/20 transition-colors disabled:opacity-40">
                {saving ? "Creating…" : "Create Draft"}
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-text-ghost font-medium mb-0.5">{label}</p>
      <p className="text-xs text-text-secondary">{value}</p>
    </div>
  );
}
