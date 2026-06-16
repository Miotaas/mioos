"use client";

import { useEffect, useState } from "react";
import { Opportunity } from "@/types";
import { Target, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";

function formatEur(n: number) {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(1)}k`;
  return `€${Math.round(n)}`;
}

const OPP_TYPE_LABELS: Record<string, string> = {
  automation_service: "Automation Service",
  ecommerce_product: "E-commerce Product",
  saas_product: "SaaS Product",
  content_business: "Content Business",
  internal_tool: "Internal Tool",
};

const STATUS_GROUPS = {
  all: null,
  active: ["discovered", "researching", "validating", "approved", "building", "marketing", "selling", "demo", "pilot"],
  live: ["deployment", "live", "revenue_generating"],
  closed: ["rejected", "archived"],
} as const;

type FilterKey = keyof typeof STATUS_GROUPS;

function scoreColor(score: number) {
  if (score >= 8) return "text-accent-green bg-accent-green/10 border-accent-green/20";
  if (score >= 6) return "text-amber-400 bg-amber-400/10 border-amber-400/20";
  return "text-text-muted bg-white/[0.04] border-white/[0.08]";
}

function confidenceDot(c: number) {
  if (c >= 8) return "bg-accent-green";
  if (c >= 5) return "bg-amber-400";
  return "bg-accent-red";
}

export function OpportunitiesView() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/opportunities?limit=100")
      .then((r) => r.json())
      .then((data) => {
        setOpps(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = opps.filter((o) => {
    const group = STATUS_GROUPS[filter];
    if (!group) return true;
    return (group as readonly string[]).includes(o.status);
  });

  const totalPipeline = filtered.reduce((sum, o) => sum + (o.estimatedRevenue ?? 0), 0);

  const filterLabels: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "live", label: "Live" },
    { key: "closed", label: "Closed" },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-10 pb-20">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.14em] text-text-ghost font-medium mb-1">
            COMMAND CENTER
          </p>
          <h1 className="text-3xl font-bold text-text-primary">Opportunities</h1>
          <p className="text-[13px] text-text-muted mt-1">
            {loading
              ? "Loading…"
              : `${filtered.length} opportunities · ${totalPipeline > 0 ? formatEur(totalPipeline) + " potential" : "no revenue estimate"}`}
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {filterLabels.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-1.5 rounded-xl text-[13px] font-medium border transition-all ${
                filter === key
                  ? "bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/20"
                  : "text-text-ghost border-white/[0.06] hover:text-text-muted hover:border-white/[0.10] bg-transparent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Opportunity list */}
        {loading ? (
          <div className="text-center py-16 text-text-ghost">Loading opportunities…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Target className="w-8 h-8 text-text-ghost mx-auto mb-3" />
            <p className="text-text-muted">No opportunities in this category.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => {
              const isExpanded = expanded === o.id;
              let evidenceItems: string[] = [];
              try {
                evidenceItems = o.evidence ? JSON.parse(o.evidence) : [];
              } catch {
                evidenceItems = [];
              }

              return (
                <div
                  key={o.id}
                  className="bg-[#0d1424] border border-white/[0.06] rounded-2xl overflow-hidden"
                >
                  <button
                    className="w-full flex items-start gap-4 p-5 text-left hover:bg-white/[0.015] transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : o.id)}
                  >
                    {/* Score */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl border flex flex-col items-center justify-center ${scoreColor(o.score)}`}>
                      <span className="text-[17px] font-bold leading-none">{o.score}</span>
                      <span className="text-[9px] leading-none mt-0.5 opacity-70">/10</span>
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] text-text-ghost capitalize">
                          {OPP_TYPE_LABELS[o.opportunityType] ?? o.opportunityType.replace(/_/g, " ")}
                        </span>
                        <span className="text-text-ghost/40 text-[10px]">·</span>
                        <span className="text-[11px] text-text-ghost capitalize">
                          {o.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-[15px] font-semibold text-text-primary leading-snug">{o.title}</p>
                      {o.nextRecommendedStep && (
                        <p className="text-[13px] text-text-muted mt-1 truncate">→ {o.nextRecommendedStep}</p>
                      )}
                    </div>

                    {/* Right side */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      {o.estimatedRevenue && (
                        <div className="flex items-center gap-1 text-accent-green text-[13px] font-semibold">
                          <TrendingUp className="w-3 h-3" />
                          {formatEur(o.estimatedRevenue)}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${confidenceDot(o.confidence)}`} />
                        <span className="text-[11px] text-text-ghost">conf {o.confidence}/10</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-text-ghost" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-text-ghost" />
                      )}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-white/[0.04] pt-4 space-y-4">
                      {/* Metrics row */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white/[0.03] rounded-xl p-3 text-center">
                          <p className="text-[10px] uppercase tracking-widest text-text-ghost mb-1">Confidence</p>
                          <p className="text-[15px] font-bold text-text-primary">{o.confidence}/10</p>
                        </div>
                        <div className="bg-white/[0.03] rounded-xl p-3 text-center">
                          <p className="text-[10px] uppercase tracking-widest text-text-ghost mb-1">Effort</p>
                          <p className="text-[15px] font-bold text-text-primary capitalize">{o.estimatedEffort ?? "—"}</p>
                        </div>
                        <div className="bg-white/[0.03] rounded-xl p-3 text-center">
                          <p className="text-[10px] uppercase tracking-widest text-text-ghost mb-1">Potential</p>
                          <p className="text-[15px] font-bold text-accent-green">
                            {o.estimatedRevenue ? formatEur(o.estimatedRevenue) : "—"}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      {o.description && (
                        <div>
                          <p className="text-[11px] uppercase tracking-widest text-text-ghost mb-2">Description</p>
                          <p className="text-[13px] text-text-muted leading-relaxed">{o.description}</p>
                        </div>
                      )}

                      {/* Evidence */}
                      {evidenceItems.length > 0 && (
                        <div>
                          <p className="text-[11px] uppercase tracking-widest text-text-ghost mb-2">Evidence</p>
                          <ul className="space-y-1.5">
                            {evidenceItems.map((ev, i) => (
                              <li key={i} className="flex items-start gap-2 text-[13px] text-text-secondary">
                                <span className="text-accent-green mt-0.5 flex-shrink-0">✓</span>
                                {ev}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommended action */}
                      {o.nextRecommendedStep && (
                        <div className="bg-[#00D4FF]/5 border border-[#00D4FF]/15 rounded-xl px-4 py-3">
                          <p className="text-[10px] uppercase tracking-widest text-[#00D4FF]/70 mb-1">
                            Recommended Action
                          </p>
                          <p className="text-[13px] text-text-secondary">{o.nextRecommendedStep}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
