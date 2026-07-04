"use client";

import { useEffect, useState, useCallback } from "react";

// Local type (avoids depending on @/types before the Prisma client is regenerated).
interface Prospect {
  id: string;
  companyName: string;
  website: string | null;
  location: string | null;
  industry: string | null;
  websiteScore: number | null;
  trustScore: number | null;
  conversionScore: number | null;
  mobileScore: number | null;
  speedEstimate: string | null;
  ctaQuality: string | null;
  painPoints: string | null;        // JSON array string
  opportunities: string | null;     // JSON array string
  recommendedOffer: string | null;
  estimatedSetupValue: number | null;
  estimatedMonthlyValue: number | null;
  auditSummary: string | null;
  outreachDraft: string | null;
  linkedinDraft: string | null;
  followupDraft: string | null;
  priorityScore: number | null;
  revenueTrack: string | null;
  status: string;
}

function parseList(s: string | null): string[] {
  if (!s) return [];
  try { const a = JSON.parse(s); return Array.isArray(a) ? a.map(String) : []; } catch { return []; }
}

function scoreColor(n: number | null): string {
  if (n == null) return "text-text-ghost";
  if (n >= 7) return "text-accent-green";
  if (n >= 4) return "text-accent-amber";
  return "text-accent-red";
}

function stageBadge(status: string): string {
  if (status === "won") return "bg-accent-green/10 text-accent-green border-accent-green/20";
  if (status === "lost") return "bg-accent-red/10 text-accent-red border-accent-red/20";
  if (status === "awaiting_approval") return "bg-accent-amber/10 text-accent-amber border-accent-amber/20";
  if (status === "contacted" || status === "interested" || status === "proposal_sent") return "bg-accent-violet/10 text-accent-violet border-accent-violet/20";
  return "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20";
}

const euro = (n: number | null) => (n == null ? "—" : `€${n.toLocaleString("nl-NL")}`);

export default function AIVenturesProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [selected, setSelected] = useState<Prospect | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({ companyName: "", website: "", industry: "", location: "" });
  const [creating, setCreating] = useState(false);
  const [track, setTrack] = useState<"all" | "website" | "automation">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/ai-ventures/prospects");
      const d = await r.json();
      setProspects(d.prospects ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function analyze(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/ai-ventures/prospects/${id}/analyze`, { method: "POST" });
      await load();
      const r = await fetch("/api/ai-ventures/prospects");
      const d = await r.json();
      const updated = (d.prospects ?? []).find((p: Prospect) => p.id === id) ?? null;
      setSelected(updated);
    } finally { setBusyId(null); }
  }

  async function createProspect() {
    if (!form.companyName.trim()) return;
    setCreating(true);
    try {
      await fetch("/api/ai-ventures/prospects", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, analyze: true }),
      });
      setForm({ companyName: "", website: "", industry: "", location: "" });
      await load();
    } finally { setCreating(false); }
  }

  return (
    <div className="min-h-screen bg-bg text-text-primary p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">AI Ventures — Prospects</h1>
        <p className="text-sm text-text-ghost">Revenue engine: analyze → match offer → mini-audit → approve outreach in Decide. No sending without approval.</p>
      </div>

      {/* Add prospect */}
      <div className="mb-6 flex flex-wrap gap-2">
        <input className="bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2 text-sm" placeholder="Company name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
        <input className="bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2 text-sm" placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
        <input className="bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2 text-sm" placeholder="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
        <input className="bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2 text-sm" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <button onClick={createProspect} disabled={creating || !form.companyName.trim()} className="bg-accent-green/15 text-accent-green border border-accent-green/25 rounded px-4 py-2 text-sm disabled:opacity-40">
          {creating ? "Analyzing…" : "Add & Analyze"}
        </button>
      </div>

      {/* Track filter — separates Website Revenue Team from Automation Revenue Team */}
      <div className="mb-3 flex gap-2 text-sm">
        {(["all", "website", "automation"] as const).map((t) => (
          <button key={t} onClick={() => setTrack(t)} className={`px-3 py-1 rounded border ${track === t ? "bg-accent-cyan/15 text-accent-cyan border-accent-cyan/25" : "border-white/[0.08] text-text-ghost"}`}>
            {t === "all" ? "All" : t === "website" ? "Website Revenue" : "Automation Revenue"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-white/[0.06] rounded-lg">
        <table className="w-full text-sm">
          <thead className="text-text-ghost border-b border-white/[0.06]">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Company</th>
              <th className="px-3 py-2 font-medium">Website Score</th>
              <th className="px-3 py-2 font-medium">Recommended Offer</th>
              <th className="px-3 py-2 font-medium">Setup</th>
              <th className="px-3 py-2 font-medium">Monthly</th>
              <th className="px-3 py-2 font-medium">Stage</th>
              <th className="px-3 py-2 font-medium">Priority</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-3 py-6 text-center text-text-ghost">Loading…</td></tr>}
            {(() => {
              const filtered = prospects.filter((p) => track === "all" || p.revenueTrack === track);
              if (!loading && filtered.length === 0) return <tr><td colSpan={7} className="px-3 py-6 text-center text-text-ghost">No prospects in this track yet.</td></tr>;
              return filtered.map((p) => (
              <tr key={p.id} onClick={() => setSelected(p)} className="border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer">
                <td className="px-3 py-2 font-medium">{p.companyName}{p.industry ? <span className="text-text-ghost"> · {p.industry}</span> : null}</td>
                <td className={`px-3 py-2 ${scoreColor(p.websiteScore)}`}>{p.websiteScore ?? "—"}{p.websiteScore != null ? "/10" : ""}</td>
                <td className="px-3 py-2">{p.recommendedOffer ?? <span className="text-text-ghost">not analyzed</span>}</td>
                <td className="px-3 py-2">{euro(p.estimatedSetupValue)}</td>
                <td className="px-3 py-2">{euro(p.estimatedMonthlyValue)}</td>
                <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded border ${stageBadge(p.status)}`}>{p.status}</span></td>
                <td className="px-3 py-2">{p.priorityScore ?? "—"}</td>
              </tr>
            )); })()}
          </tbody>
        </table>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-bg border-l border-white/[0.08] shadow-2xl overflow-y-auto p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">{selected.companyName}</h2>
              <p className="text-sm text-text-ghost">{[selected.industry, selected.location, selected.website].filter(Boolean).join(" · ") || "—"}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-text-ghost hover:text-text-primary">✕</button>
          </div>

          <div className="flex gap-2 mb-5">
            <button onClick={() => analyze(selected.id)} disabled={busyId === selected.id} className="bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/25 rounded px-3 py-1.5 text-sm disabled:opacity-40">
              {busyId === selected.id ? "Analyzing…" : selected.recommendedOffer ? "Re-analyze" : "Analyze"}
            </button>
            <span className="text-xs text-text-ghost self-center">
              {selected.status === "awaiting_approval" ? "Outreach approval created → review in Decide" : "Analyze to create an outreach approval in Decide"}
            </span>
          </div>

          {/* Website analysis */}
          <Section title="Website Analysis">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Metric label="Website" value={selected.websiteScore} />
              <Metric label="Trust" value={selected.trustScore} />
              <Metric label="Conversion" value={selected.conversionScore} />
              <Metric label="Mobile" value={selected.mobileScore} />
              <div className="text-text-ghost">Speed: <span className="text-text-primary">{selected.speedEstimate ?? "—"}</span></div>
              <div className="text-text-ghost">CTA: <span className="text-text-primary">{selected.ctaQuality ?? "—"}</span></div>
            </div>
          </Section>

          <Section title="Pain Points"><List items={parseList(selected.painPoints)} /></Section>
          <Section title="Opportunities"><List items={parseList(selected.opportunities)} /></Section>

          <Section title="Recommended Offer">
            <p className="text-sm">{selected.recommendedOffer ?? "—"} <span className="text-text-ghost">· {euro(selected.estimatedSetupValue)} setup / {euro(selected.estimatedMonthlyValue)} mo</span></p>
          </Section>

          <Section title="Mini-Audit"><Pre text={selected.auditSummary} /></Section>
          <Section title="Outreach Draft (email)"><Pre text={selected.outreachDraft} /></Section>
          <Section title="LinkedIn Draft"><Pre text={selected.linkedinDraft} /></Section>
          <Section title="Follow-up Draft"><Pre text={selected.followupDraft} /></Section>

          <Section title="Approval Status">
            <p className="text-sm">{selected.status === "awaiting_approval" ? "Outreach approval is in Decide — approve there to queue sending (Phase A)." : "No approval yet — run Analyze."}</p>
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-xs uppercase tracking-wide text-text-ghost mb-2">{title}</h3>
      {children}
    </div>
  );
}
function Metric({ label, value }: { label: string; value: number | null }) {
  const c = value == null ? "text-text-ghost" : value >= 7 ? "text-accent-green" : value >= 4 ? "text-accent-amber" : "text-accent-red";
  return <div className="text-text-ghost">{label}: <span className={c}>{value == null ? "—" : `${value}/10`}</span></div>;
}
function List({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-sm text-text-ghost">—</p>;
  return <ul className="text-sm list-disc pl-5 space-y-1">{items.map((it, i) => <li key={i}>{it}</li>)}</ul>;
}
function Pre({ text }: { text: string | null }) {
  if (!text) return <p className="text-sm text-text-ghost">—</p>;
  return <pre className="text-xs whitespace-pre-wrap bg-white/[0.03] border border-white/[0.06] rounded p-3">{text}</pre>;
}
