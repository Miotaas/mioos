"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { CommerceOpportunity, RevenueEntry, MioProject } from "@/types";
import {
  TrendingUp, ChevronRight, ArrowRight, Users2, Megaphone, AlertTriangle, Target, Zap,
} from "lucide-react";

function fmtEuro(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `€${(n / 1_000).toFixed(0)}k`;
  return `€${Math.round(n)}`;
}

const STATUS_LABEL: Record<string, string> = {
  discovered: "Discovered",
  validating: "Validating",
  approved:   "Approved",
  testing:    "Testing",
  live:       "Live",
  archived:   "Archived",
  rejected:   "Rejected",
};

const STATUS_COLOR: Record<string, string> = {
  discovered: "text-text-muted",
  validating: "text-[#00D4FF]",
  approved:   "text-accent-green",
  testing:    "text-[#00D4FF]",
  live:       "text-accent-green",
  archived:   "text-text-ghost",
  rejected:   "text-accent-red",
};

interface RevenueIntel {
  live: number;
  pipeline: number;
  potential: number;
  total: number;
  forecast30d: number;
  atRisk: { id: string; title: string; amount: number; reason: string }[];
  fastestPath: { id: string; title: string; amount: number; probability: number; action: string } | null;
  byType: { service: number; product: number };
  byProject: { projectId: string; projectName: string; amount: number }[];
}

function RevenueCard({
  label, value, sub, color,
}: {
  label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="rounded-2xl bg-[#0d1220] border border-white/[0.05] p-5 md:p-6">
      <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] mb-4 font-medium">{label}</p>
      <p className="text-[36px] md:text-[44px] font-bold font-mono leading-none mb-2" style={{ color }}>
        {value}
      </p>
      <p className="text-[12px] text-text-ghost">{sub}</p>
    </div>
  );
}

export function RevenueView() {
  const { setActiveView } = useAppStore();
  const [opportunities, setOpp]     = useState<CommerceOpportunity[]>([]);
  const [revenueEntries, setEntries] = useState<RevenueEntry[]>([]);
  const [projects, setProjects]      = useState<MioProject[]>([]);
  const [loading, setLoading]        = useState(true);
  const [intel, setIntel]            = useState<RevenueIntel | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/commerce/opportunities").then(r => r.json()).catch(() => []),
      fetch("/api/revenue-entries").then(r => r.json()).catch(() => []),
      fetch("/api/projects").then(r => r.json()).catch(() => []),
    ]).then(([opps, entries, projs]) => {
      setOpp(Array.isArray(opps) ? opps : []);
      setEntries(Array.isArray(entries) ? entries : []);
      setProjects(Array.isArray(projs) ? projs : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetch("/api/executive/revenue")
      .then(r => r.json())
      .then(d => { if (d && !d.error) setIntel(d); })
      .catch(() => {});
  }, []);

  const getProjectName = (projectId?: string | null) =>
    projectId ? (projects.find(p => p.id === projectId)?.name ?? null) : null;

  // RevenueEntry-based KPIs (primary)
  const liveEntries     = revenueEntries.filter(e => e.revenueType === "live" && e.status === "active");
  const pipelineEntries = revenueEntries.filter(e => e.revenueType === "pipeline" && e.status === "active");
  const potentialEntries = revenueEntries.filter(e => e.revenueType === "potential" && e.status === "active");

  const liveRev    = liveEntries.reduce((s, e) => s + e.amount, 0);
  const pipeline   = pipelineEntries.reduce((s, e) => s + e.amount * ((e.probability ?? 100) / 100), 0);
  const potential  = potentialEntries.reduce((s, e) => s + e.amount * ((e.probability ?? 50) / 100), 0);
  const totalActive = revenueEntries.filter(e => e.status === "active").length;

  // Fall back to CommerceOpportunity if no entries seeded yet
  const activeOpp  = opportunities.filter(o => !["archived", "rejected"].includes(o.status));
  const useLegacy  = revenueEntries.length === 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1100px] mx-auto px-5 md:px-10 py-8 md:py-12 pb-28 md:pb-12">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] text-text-ghost font-medium tracking-[0.12em] uppercase mb-2">
            Revenue
          </p>
          <h1 className="text-[32px] md:text-[40px] font-semibold text-text-primary tracking-tight leading-tight">
            Revenue
          </h1>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <RevenueCard
            label="Live MRR"
            value={liveRev > 0 ? fmtEuro(liveRev) : useLegacy ? "—" : "—"}
            sub={`${liveEntries.length} active contract${liveEntries.length !== 1 ? "s" : ""}`}
            color="#10b981"
          />
          <RevenueCard
            label="Pipeline"
            value={pipeline > 0 ? fmtEuro(pipeline) : "—"}
            sub="Weighted by probability"
            color="#00D4FF"
          />
          <RevenueCard
            label="Potential"
            value={potential > 0 ? fmtEuro(potential) : "—"}
            sub="Early-stage opportunities"
            color="#8b5cf6"
          />
          <RevenueCard
            label="Entries"
            value={String(totalActive || activeOpp.length)}
            sub="Active revenue sources"
            color="#f59e0b"
          />
        </div>

        {/* Revenue entries list */}
        <div className="rounded-2xl bg-[#0d1220] border border-white/[0.05] overflow-hidden mb-4">
          <div className="px-6 py-5 border-b border-white/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-4 h-4 text-accent-green" />
              <span className="text-[13px] font-semibold text-text-primary">
                {useLegacy ? "Opportunities" : "Revenue"}
              </span>
            </div>
            {useLegacy && (
              <button
                onClick={() => setActiveView("opportunities")}
                className="text-[11px] text-text-ghost hover:text-text-muted transition-colors flex items-center gap-1"
              >
                Manage all <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <p className="text-[13px] text-text-muted">Loading…</p>
            </div>
          ) : !useLegacy ? (
            <div className="divide-y divide-white/[0.03]">
              {revenueEntries.filter(e => e.status === "active").map(entry => (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.015] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-text-primary font-medium leading-snug">{entry.title}</p>
                    <p className="text-[11px] text-text-muted mt-0.5 capitalize">
                      {entry.revenueType} · {entry.serviceType}
                      {entry.probability != null && entry.revenueType !== "live"
                        ? ` · ${entry.probability}% probability`
                        : ""}
                    </p>
                    {getProjectName(entry.projectId) && (
                      <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-accent-violet/10 text-accent-violet border border-accent-violet/20">
                        {getProjectName(entry.projectId)}
                      </span>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn(
                      "text-[13px] font-mono font-medium",
                      entry.revenueType === "live"     ? "text-accent-green" :
                      entry.revenueType === "pipeline" ? "text-[#00D4FF]" :
                      "text-text-secondary"
                    )}>
                      {fmtEuro(entry.amount)}/mo
                    </p>
                    <p className="text-[11px] text-text-ghost mt-0.5 capitalize">{entry.revenueType}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-text-ghost flex-shrink-0" />
                </div>
              ))}
            </div>
          ) : activeOpp.length === 0 ? (
            <div className="py-14 text-center">
              <TrendingUp className="w-6 h-6 text-text-ghost mx-auto mb-3 opacity-20" />
              <p className="text-[13px] text-text-muted mb-1">No active opportunities yet.</p>
              <p className="text-[11px] text-text-ghost">
                Your Commerce and Research Teams will surface these.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {activeOpp.slice(0, 12).map(opp => (
                <div
                  key={opp.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.015] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-text-primary font-medium leading-snug">{opp.title}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {opp.opportunityType?.replace(/_/g, " ") ?? "Opportunity"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {opp.estimatedRevenue != null && opp.estimatedRevenue > 0 && (
                      <p className="text-[13px] text-accent-green font-mono font-medium">
                        {fmtEuro(opp.estimatedRevenue)}
                      </p>
                    )}
                    <p className={cn(
                      "text-[11px] mt-0.5",
                      STATUS_COLOR[opp.status] ?? "text-text-ghost"
                    )}>
                      {STATUS_LABEL[opp.status] ?? opp.status}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-text-ghost flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revenue Intelligence */}
        {intel && (intel.atRisk.length > 0 || intel.fastestPath || intel.byProject.length > 0) && (
          <div className="rounded-2xl bg-[#0d1220] border border-white/[0.05] overflow-hidden mb-4">
            <div className="px-6 py-5 border-b border-white/[0.04] flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-accent-amber" />
              <span className="text-[13px] font-semibold text-text-primary">Revenue Intelligence</span>
            </div>
            <div className="divide-y divide-white/[0.03]">

              {/* Fastest path */}
              {intel.fastestPath && (
                <div className="px-6 py-4">
                  <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] mb-2 flex items-center gap-1.5">
                    <Target className="w-3 h-3 text-accent-green" /> Fastest path to revenue
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-text-primary font-medium">{intel.fastestPath.title}</p>
                      <p className="text-[11px] text-text-muted mt-0.5">{intel.fastestPath.action}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-[13px] text-accent-green font-mono font-medium">{fmtEuro(intel.fastestPath.amount)}/mo</p>
                      <p className="text-[11px] text-text-ghost">{intel.fastestPath.probability}% probability</p>
                    </div>
                  </div>
                </div>
              )}

              {/* At risk */}
              {intel.atRisk.length > 0 && (
                <div className="px-6 py-4">
                  <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-accent-amber" /> At risk ({intel.atRisk.length})
                  </p>
                  <div className="space-y-2">
                    {intel.atRisk.map(r => (
                      <div key={r.id} className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-text-secondary truncate">{r.title}</p>
                          <p className="text-[11px] text-accent-amber/70">{r.reason}</p>
                        </div>
                        <span className="text-[12px] text-text-muted font-mono flex-shrink-0 ml-3">{fmtEuro(r.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 30-day forecast */}
              {intel.forecast30d > 0 && (
                <div className="px-6 py-4">
                  <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3 text-[#00D4FF]" /> 30-day revenue forecast
                  </p>
                  <p className="text-[22px] font-bold font-mono text-[#00D4FF]">{fmtEuro(intel.forecast30d)}</p>
                  <p className="text-[11px] text-text-ghost mt-0.5">Live + 30% of weighted pipeline</p>
                </div>
              )}

              {/* By project */}
              {intel.byProject.length > 0 && (
                <div className="px-6 py-4">
                  <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] mb-2">Revenue by project</p>
                  <div className="space-y-1.5">
                    {intel.byProject.map(p => (
                      <div key={p.projectId} className="flex items-center justify-between">
                        <span className="text-[12px] text-text-secondary truncate flex-1">{p.projectName}</span>
                        <span className="text-[12px] text-accent-green font-mono flex-shrink-0 ml-3">{fmtEuro(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => setActiveView("prospects")}
            className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-[#0d1220] border border-white/[0.04] hover:border-white/[0.08] transition-colors text-left"
          >
            <Users2 className="w-4 h-4 text-[#00D4FF] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-text-primary font-medium">Prospects</p>
              <p className="text-[11px] text-text-muted">Qualified leads in your pipeline</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-text-ghost flex-shrink-0" />
          </button>
          <button
            onClick={() => setActiveView("campaigns")}
            className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-[#0d1220] border border-white/[0.04] hover:border-white/[0.08] transition-colors text-left"
          >
            <Megaphone className="w-4 h-4 text-accent-green flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-text-primary font-medium">Campaigns</p>
              <p className="text-[11px] text-text-muted">Outreach and marketing drafts</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-text-ghost flex-shrink-0" />
          </button>
        </div>

      </div>
    </div>
  );
}
