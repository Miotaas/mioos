"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import {
  WorkforceApproval, ApprovalQueueItem, MioProject,
  RevenueEntry, WorkforceTeam, WorkforceOutput,
} from "@/types";
import {
  Sun, RefreshCw, ArrowRight, AlertTriangle,
  Zap, X, ChevronRight, Scale,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────

const DEPT_COLOR: Record<string, string> = {
  ecommerce:          "#22C55E",
  "automation-sales": "#8B5CF6",
  youtube:            "#F97316",
  "crypto-stock":     "#00D4FF",
};

const OUTPUT_LABELS: Record<string, string> = {
  product_research:  "product research",
  supplier_lead:     "supplier lead",
  validation_report: "validation",
  campaign_draft:    "campaign draft",
  script:            "script",
  market_analysis:   "market analysis",
  trade_proposal:    "trade proposal",
  lead:              "lead",
  lead_generation:   "lead",
  proposal:          "proposal",
  research:          "research report",
  analysis:          "analysis",
  content:           "content",
  outreach:          "outreach draft",
  video:             "video",
  thumbnail:         "thumbnail",
  channel_analysis:  "channel analysis",
};

// ── Helpers ────────────────────────────────────────────────────────────

function fmtEuro(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `€${(n / 1_000).toFixed(0)}k`;
  return `€${Math.round(n)}`;
}

function timeAgo(s: string): string {
  const mins = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (mins < 60)   return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

function outputLabel(type: string): string {
  return OUTPUT_LABELS[type] ?? type.replace(/_/g, " ");
}

// Primary slugs for the 4 master-prompt business units
const PRIMARY_SLUGS = new Set(["ecommerce", "automation-sales", "youtube", "crypto-stock"]);

function getTeamDept(team: WorkforceTeam): string {
  // Exact slug match first — handles master-prompt teams regardless of departmentType
  const slug = (team.slug ?? "").toLowerCase();
  if (slug === "ecommerce")        return "ecommerce";
  if (slug === "automation-sales") return "automation-sales";
  if (slug === "youtube")          return "youtube";
  if (slug === "crypto-stock")     return "crypto-stock";
  // Fallback pattern matching for legacy teams
  const s = (team.departmentType ?? slug).toLowerCase();
  if (s.includes("ecommerce") || s.includes("commerce")) return "ecommerce";
  if (s.includes("automation") || s.includes("sales"))   return "automation-sales";
  if (s.includes("youtube")    || s.includes("media"))   return "youtube";
  if (s.includes("crypto") || s.includes("stock") || s.includes("trad")) return "crypto-stock";
  return s;
}

// ── Types ──────────────────────────────────────────────────────────────

interface RevenueSnapshot {
  actual:    number;
  pipeline:  number;
  projected: number;
  entries:   RevenueEntry[];
}

interface OpportunitySnap {
  id:               string;
  title:            string;
  estimatedRevenue?: number | null;
  createdAt:        string;
}

// ── Sub-components ─────────────────────────────────────────────────────

function SectionLabel({
  text, note, count, countColor = "#6b7280",
}: {
  text: string; note?: string; count?: number; countColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-ghost whitespace-nowrap">
        {text}
      </p>
      {count !== undefined && (
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
          style={{ color: countColor, backgroundColor: `${countColor}20` }}
        >
          {count}
        </span>
      )}
      <div className="flex-1 h-px bg-white/[0.04]" />
      {note && (
        <span className="text-[10px] text-text-ghost/50 whitespace-nowrap">{note}</span>
      )}
    </div>
  );
}

function TeamImpactStrip({
  team, outputs, color, onNavigate,
}: {
  team: WorkforceTeam;
  outputs: WorkforceOutput[];
  color: string;
  onNavigate: () => void;
}) {
  const latestAt = outputs.length > 0
    ? outputs.reduce((a, b) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b).createdAt
    : null;

  // Group by type for outcome sentence
  const typeCounts = new Map<string, number>();
  for (const o of outputs) typeCounts.set(o.outputType, (typeCounts.get(o.outputType) ?? 0) + 1);

  const parts: string[] = [];
  for (const [type, count] of typeCounts) {
    const lbl = outputLabel(type);
    parts.push(`${count} ${lbl}${count > 1 ? "s" : ""}`);
  }
  const sentence = parts.length > 0
    ? parts.slice(0, 3).join(", ").replace(/^./, c => c.toUpperCase()) + " created."
    : `${outputs.length} output${outputs.length > 1 ? "s" : ""} created.`;

  return (
    <button onClick={onNavigate} className="w-full text-left group">
      <div className="flex rounded-xl border border-white/[0.04] overflow-hidden hover:border-white/[0.09] transition-colors" style={{ background: "rgba(255,255,255,0.018)" }}>
        <div className="w-[3px] flex-shrink-0" style={{ backgroundColor: color }} />
        <div className="flex-1 px-4 py-3.5 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.14em] whitespace-nowrap" style={{ color }}>
                {team.name}
              </span>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap" style={{ color, backgroundColor: `${color}18` }}>
                {outputs.length} {outputs.length === 1 ? "output" : "outputs"}
              </span>
            </div>
            {latestAt && (
              <span className="text-[10px] text-text-ghost flex-shrink-0">{timeAgo(latestAt)}</span>
            )}
          </div>
          <p className="text-[13px] text-text-secondary leading-snug">{sentence}</p>
          {outputs.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {outputs.slice(0, 3).map(o => (
                <span key={o.id} className="text-[10px] px-2 py-0.5 rounded-md text-text-ghost border border-white/[0.05] truncate max-w-[180px]">
                  {o.title}
                </span>
              ))}
              {outputs.length > 3 && (
                <span className="text-[10px] text-text-ghost">+{outputs.length - 3} more</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center pr-4 flex-shrink-0">
          <ChevronRight className="w-3.5 h-3.5 text-text-ghost group-hover:text-text-muted transition-colors" />
        </div>
      </div>
    </button>
  );
}

function RevenueMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.1em] text-text-ghost mb-1">{label}</p>
      <p className="text-[22px] font-mono font-semibold leading-none" style={{ color }}>{value}</p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────

export function TodayView() {
  const { setActiveView, showToast } = useAppStore();

  const [teams,         setTeams]         = useState<WorkforceTeam[]>([]);
  const [outputs,       setOutputs]       = useState<WorkforceOutput[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunitySnap[]>([]);
  const [wfApprovals,   setWfApprovals]   = useState<WorkforceApproval[]>([]);
  const [agentApprovals,setAgentApprovals]= useState<ApprovalQueueItem[]>([]);
  const [blockedProjects,setBlocked]      = useState<MioProject[]>([]);
  const [revenue,       setRevenue]       = useState<RevenueSnapshot | null>(null);
  const [focusRec,      setFocusRec]      = useState<string | null>(null);
  const [loaded,        setLoaded]        = useState(false);
  const [sinceLabel,    setSinceLabel]    = useState("your last visit");
  const [dispatchOpen,  setDispatchOpen]  = useState(false);

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/workforce/teams").then(r => r.json()).catch(() => []),
      fetch("/api/workforce/outputs?limit=20").then(r => r.json()).catch(() => []),
      fetch("/api/opportunities?limit=10").then(r => r.json()).catch(() => []),
      fetch("/api/workforce-approvals?status=pending").then(r => r.json()).catch(() => []),
      fetch("/api/approvals?status=pending").then(r => r.json()).catch(() => []),
      fetch("/api/projects").then(r => r.json()).catch(() => []),
      fetch("/api/revenue").then(r => r.json()).catch(() => null),
    ]).then(([tm, outs, opps, wfa, apa, pr, rev]) => {
      setTeams(Array.isArray(tm) ? tm.filter((t: WorkforceTeam) => t.status === "active") : []);
      setOutputs(Array.isArray(outs) ? outs : []);
      setOpportunities(Array.isArray(opps) ? opps.slice(0, 5) : []);
      setWfApprovals(Array.isArray(wfa) ? wfa : []);
      setAgentApprovals(Array.isArray(apa) ? apa.filter((a: ApprovalQueueItem) => a.status === "pending") : []);
      setBlocked(Array.isArray(pr) ? pr.filter((p: MioProject) => p.status === "blocked") : []);
      if (rev && typeof rev === "object" && !Array.isArray(rev)) setRevenue(rev as RevenueSnapshot);
      setLoaded(true);

      try {
        const stored = localStorage.getItem("mioos-last-visit");
        if (stored) {
          const mins = Math.floor((Date.now() - parseInt(stored, 10)) / 60000);
          if (mins < 60)   setSinceLabel(`${mins}m ago`);
          else if (mins < 1440) setSinceLabel(`${Math.floor(mins / 60)}h ago`);
          else setSinceLabel(`${Math.floor(mins / 1440)}d ago`);
        }
        localStorage.setItem("mioos-last-visit", String(Date.now()));
      } catch { /* SSR */ }
    });

    fetch("/api/executive/recommendations")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d) && d.length > 0) setFocusRec(d[0].title); })
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived ───────────────────────────────────────────────────────────

  const dateStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // Per-team impact — only the 4 master-prompt business units (exact slug match)
  const teamImpacts = teams
    .filter(t => PRIMARY_SLUGS.has(t.slug ?? ""))
    .map(team => ({
      team,
      outputs: outputs.filter(o => (o as any).teamId === team.id),
      color: DEPT_COLOR[getTeamDept(team)] ?? "#6b7280",
    }));
  const activeImpacts = teamImpacts.filter(ti => ti.outputs.length > 0);
  const quietTeams    = teamImpacts.filter(ti => ti.outputs.length === 0);

  const totalOutputs   = outputs.length;
  const totalApprovals = wfApprovals.length + agentApprovals.length;
  const topApproval    = wfApprovals[0] ?? null;
  const liveRevenue    = revenue?.actual   ?? 0;
  const pipeline       = revenue?.pipeline ?? 0;
  const hasRevenue     = liveRevenue > 0 || pipeline > 0;

  function statusLine(): string {
    if (!loaded) return "Checking in with your workforce…";
    const parts: string[] = [];
    if (totalOutputs > 0)
      parts.push(`${totalOutputs} ${totalOutputs === 1 ? "output" : "outputs"} across ${activeImpacts.length} ${activeImpacts.length === 1 ? "team" : "teams"}`);
    if (totalApprovals > 0)
      parts.push(`${totalApprovals} ${totalApprovals === 1 ? "decision" : "decisions"} awaiting review`);
    if (blockedProjects.length > 0)
      parts.push(`${blockedProjects.length} ${blockedProjects.length === 1 ? "item" : "items"} blocked`);
    return parts.length === 0
      ? "Your workforce has been standing by. Nothing new to report."
      : parts.join(" · ") + ".";
  }

  function focusSentence(): string {
    if (focusRec) return focusRec;
    if (totalApprovals > 0)
      return `Review the ${totalApprovals} pending ${totalApprovals === 1 ? "decision" : "decisions"} in Decide.`;
    if (blockedProjects.length > 0)
      return `Unblock ${blockedProjects[0].name} to restore momentum.`;
    if (opportunities.length > 0)
      return `Your workforce discovered ${opportunities.length} ${opportunities.length === 1 ? "opportunity" : "opportunities"}. Decide which to pursue.`;
    if (totalOutputs > 0)
      return "Review the workforce outputs and provide feedback to keep momentum going.";
    return "Your workforce is standing by. Dispatch work to start generating value.";
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[820px] mx-auto px-5 md:px-8 py-8 pb-24 md:pb-12">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sun className="w-3 h-3 text-[#F59E0B]" />
                <span className="text-[10px] font-medium tracking-[0.14em] uppercase text-text-ghost">
                  {dateStr}
                </span>
              </div>
              <h1 className="text-[34px] md:text-[42px] font-semibold text-text-primary tracking-tight leading-none mb-3">
                Daily Briefing
              </h1>
              <p className="text-[15px] text-text-secondary leading-relaxed max-w-[560px]">
                {statusLine()}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 pt-1">
              <button
                onClick={load}
                title="Refresh"
                className="p-2 rounded-lg border border-white/[0.06] text-text-ghost hover:text-text-muted hover:border-white/[0.1] transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDispatchOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] text-[12px] font-medium hover:bg-[#00D4FF]/15 transition-all"
              >
                <Zap className="w-3 h-3" />
                Dispatch
              </button>
            </div>
          </div>
          <div className="mt-8 h-px bg-white/[0.05]" />
        </div>

        <div className="space-y-12">

          {/* ── 1. Workforce Impact ─────────────────────────────────── */}
          <section>
            <SectionLabel text="Workforce Impact" note={`Since ${sinceLabel}`} />

            {!loaded ? (
              <p className="text-[14px] text-text-ghost italic">Checking in with your teams…</p>

            ) : teams.length === 0 ? (
              <p className="text-[14px] text-text-secondary leading-relaxed">
                No active workforce teams found. Set up your teams in Workforce to begin tracking value.
              </p>

            ) : activeImpacts.length === 0 ? (
              <p className="text-[14px] text-text-secondary leading-relaxed">
                No new value was created while you were away. Your workforce is standing by.
              </p>

            ) : (
              <div className="space-y-2.5">
                {activeImpacts.map(ti => (
                  <TeamImpactStrip
                    key={ti.team.id}
                    team={ti.team}
                    outputs={ti.outputs}
                    color={ti.color}
                    onNavigate={() => setActiveView("workforce")}
                  />
                ))}
                {quietTeams.length > 0 && (
                  <p className="text-[11px] text-text-ghost pt-1 pl-1">
                    {quietTeams.map(ti => ti.team.name).join(", ")} — no new activity.
                  </p>
                )}
              </div>
            )}

            {/* Opportunities discovered */}
            {opportunities.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/[0.04]">
                <p className="text-[13px] text-text-secondary leading-relaxed">
                  <span className="text-text-primary font-medium">
                    {opportunities.length} {opportunities.length === 1 ? "opportunity" : "opportunities"}
                  </span>{" "}
                  {opportunities.length === 1 ? "was" : "were"} discovered or updated.
                  {opportunities[0] && (
                    <> Most recent: <span className="text-text-primary">&ldquo;{opportunities[0].title}&rdquo;</span>.</>
                  )}
                </p>
              </div>
            )}
          </section>

          {/* ── 2. Revenue ─────────────────────────────────────────── */}
          {loaded && (
            <section>
              <SectionLabel text="Revenue" />
              {!hasRevenue ? (
                <p className="text-[14px] text-text-secondary">
                  No revenue tracked yet. Add entries to see your position.
                </p>
              ) : (
                <>
                  <p className="text-[14px] text-text-secondary leading-relaxed mb-5">
                    {liveRevenue > 0 && pipeline > 0
                      ? `${fmtEuro(liveRevenue)} running monthly with ${fmtEuro(pipeline)} in qualified pipeline.`
                      : liveRevenue > 0
                      ? `${fmtEuro(liveRevenue)} in active monthly revenue. No pipeline staged.`
                      : `${fmtEuro(pipeline)} in pipeline — no live revenue yet. Close one to start compounding.`}
                  </p>
                  <div className="flex items-end gap-8">
                    <RevenueMetric
                      label="Monthly Revenue"
                      value={liveRevenue > 0 ? fmtEuro(liveRevenue) : "—"}
                      color="#22C55E"
                    />
                    <div className="w-px h-10 bg-white/[0.05] mb-0.5" />
                    <RevenueMetric
                      label="Pipeline"
                      value={pipeline > 0 ? fmtEuro(pipeline) : "—"}
                      color="rgba(255,255,255,0.45)"
                    />
                    <button
                      onClick={() => setActiveView("revenue" as any)}
                      className="ml-auto mb-0.5 text-[11px] text-text-ghost hover:text-text-muted transition-colors flex items-center gap-1"
                    >
                      Full breakdown <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {/* ── 3. Approvals Required ──────────────────────────────── */}
          {loaded && (
            <section>
              <SectionLabel
                text="Approvals Required"
                count={totalApprovals > 0 ? totalApprovals : undefined}
                countColor="#EF4444"
              />
              {totalApprovals === 0 ? (
                <p className="text-[14px] text-text-secondary">
                  No decisions are waiting for your review.
                </p>
              ) : (
                <div className="space-y-4">
                  <p className="text-[14px] text-text-secondary leading-relaxed">
                    {topApproval ? (
                      <>
                        The most urgent decision is{" "}
                        <span className="text-text-primary">&ldquo;{topApproval.title}&rdquo;</span>
                        {(topApproval as any).sourceTeam?.name && (
                          <> from {(topApproval as any).sourceTeam.name}</>
                        )}.
                        {totalApprovals > 1 && ` Plus ${totalApprovals - 1} more.`}
                      </>
                    ) : (
                      `${totalApprovals} ${totalApprovals === 1 ? "decision" : "decisions"} waiting for your review.`
                    )}
                  </p>
                  <button
                    onClick={() => setActiveView("decide")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-[12px] font-medium hover:bg-[#EF4444]/15 transition-all"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    Open Decide ({totalApprovals})
                  </button>
                </div>
              )}
            </section>
          )}

          {/* ── 4. Blocked ──────────────────────────────────────────── */}
          {blockedProjects.length > 0 && (
            <section>
              <SectionLabel text="Blocked" countColor="#EF4444" />
              <div>
                {blockedProjects.map((p, i) => (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-start gap-3 py-3",
                      i < blockedProjects.length - 1 && "border-b border-white/[0.03]"
                    )}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-text-primary font-medium">{p.name}</p>
                      {p.blocker && (
                        <p className="text-[12px] text-text-ghost mt-0.5 leading-snug">{p.blocker}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 5. Where to Focus ───────────────────────────────────── */}
          {loaded && (
            <section className="pb-4">
              <SectionLabel text="Where to Focus" />
              <div className="flex gap-4">
                <div
                  className="w-[3px] rounded-full flex-shrink-0 self-stretch"
                  style={{ backgroundColor: "#F59E0B", opacity: 0.5 }}
                />
                <div>
                  <p className="text-[15px] text-text-primary leading-relaxed font-medium">
                    {focusSentence()}
                  </p>
                  {totalApprovals > 0 && (
                    <button
                      onClick={() => setActiveView("decide")}
                      className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-[#F59E0B] hover:opacity-75 transition-opacity"
                    >
                      Go to Decide <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

        </div>
      </div>

      {dispatchOpen && (
        <QuickDispatchModal
          teams={teams}
          onClose={() => setDispatchOpen(false)}
          onDispatched={() => {
            setDispatchOpen(false);
            showToast("Work dispatched", "success");
            load();
          }}
        />
      )}
    </div>
  );
}

// ── QuickDispatchModal ─────────────────────────────────────────────────

function QuickDispatchModal({
  teams, onClose, onDispatched,
}: {
  teams: WorkforceTeam[];
  onClose: () => void;
  onDispatched: () => void;
}) {
  const [prompt,  setPrompt]  = useState("");
  const [teamId,  setTeamId]  = useState("");
  const [loading, setLoading] = useState(false);

  async function dispatch() {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const body: Record<string, string> = { title: prompt.trim() };
      if (teamId) body.teamId = teamId;
      const r = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, priority: "medium", senderType: "operator" }),
      });
      if (r.ok) onDispatched();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-[#0d1220] border border-white/[0.08] rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#00D4FF]" />
            <h2 className="text-[15px] font-semibold text-text-primary">Dispatch Work</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-ghost hover:text-text-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] text-text-ghost uppercase tracking-[0.08em] mb-2">
              What do you need?
            </label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. Find 3 competitors to Mail Co-Pilot with pricing and positioning analysis"
              rows={4}
              className="w-full bg-[#080d1a] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-text-primary placeholder:text-text-ghost resize-none focus:outline-none focus:border-[#00D4FF]/30 transition-colors leading-relaxed"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-ghost uppercase tracking-[0.08em] mb-2">
              Team (optional)
            </label>
            <select
              value={teamId}
              onChange={e => setTeamId(e.target.value)}
              className="w-full bg-[#080d1a] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[13px] text-text-secondary focus:outline-none focus:border-[#00D4FF]/30 transition-colors"
            >
              <option value="">Auto-route</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={dispatch}
              disabled={!prompt.trim() || loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00D4FF]/15 border border-[#00D4FF]/25 text-[#00D4FF] text-[13px] font-medium hover:bg-[#00D4FF]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Zap className="w-3.5 h-3.5" />
              {loading ? "Dispatching…" : "Dispatch"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/[0.07] text-text-ghost text-[13px] hover:bg-white/[0.03] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
