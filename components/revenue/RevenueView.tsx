"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, Wrench, Video, TrendingUp } from "lucide-react";

interface RevenueEntry {
  id: string;
  title: string;
  amount: number;
  currency: string;
  revenueType: string;
  serviceType: string;
  status: string;
  sourceTeamId: string | null;
  probability: number | null;
  expectedCloseDate: string | null;
  createdAt: string;
}

interface RevenueData {
  actual: number;
  pipeline: number;
  projected: number;
  currency: string;
  byTeam: Record<string, { actual: number; pipeline: number }>;
  entries: RevenueEntry[];
}

function formatEur(n: number) {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(1)}k`;
  return `€${Math.round(n)}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d > 0) return `${d}d ago`;
  const h = Math.floor(diff / 3_600_000);
  if (h > 0) return `${h}h ago`;
  return "just now";
}

const BUSINESS_UNITS = [
  {
    id: "ecommerce",
    name: "E-commerce Team",
    patterns: ["commerce", "digital_commerce", "fulfillment"],
    color: "#10b981",
    Icon: ShoppingBag,
  },
  {
    id: "automation-sales",
    name: "Automation Sales Team",
    patterns: ["sales", "outreach", "marketing"],
    color: "#00D4FF",
    Icon: Wrench,
  },
  {
    id: "youtube",
    name: "YouTube Automation Team",
    patterns: ["content", "writing"],
    color: "#8b5cf6",
    Icon: Video,
  },
  {
    id: "crypto-stock",
    name: "Crypto / Stock Trader Team",
    patterns: ["research", "operations"],
    color: "#f59e0b",
    Icon: TrendingUp,
  },
];

const TYPE_LABELS: Record<string, string> = {
  pipeline: "Pipeline",
  potential: "Potential",
  live: "Actual",
  closed: "Closed",
};

const TYPE_COLORS: Record<string, string> = {
  live: "text-accent-green",
  pipeline: "text-[#00D4FF]",
  potential: "text-amber-400",
  closed: "text-text-ghost",
};

export function RevenueView() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/revenue")
      .then((r) => r.json())
      .then((d) => {
        setData(d.error ? null : d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const actual    = data?.actual ?? 0;
  const pipeline  = data?.pipeline ?? 0;
  const projected = data?.projected ?? 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-10 pb-20">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.14em] text-text-ghost font-medium mb-1">
            COMMAND CENTER
          </p>
          <h1 className="text-3xl font-bold text-text-primary">Revenue</h1>
          <p className="text-[13px] text-text-muted mt-1">
            Actual · Pipeline · Projected — all four teams
          </p>
        </div>

        {/* 3 horizon stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-[#0d1424] border border-white/[0.06] rounded-2xl p-6">
            <p className="text-[10px] uppercase tracking-widest text-text-ghost mb-2">Actual</p>
            <p className="text-2xl font-bold text-accent-green">
              {loading ? "—" : formatEur(actual)}
            </p>
            <p className="text-[11px] text-text-ghost mt-1">confirmed revenue</p>
          </div>

          <div className="bg-[#0d1424] border border-white/[0.06] rounded-2xl p-6">
            <p className="text-[10px] uppercase tracking-widest text-text-ghost mb-2">Pipeline</p>
            <p className="text-2xl font-bold text-[#00D4FF]">
              {loading ? "—" : formatEur(pipeline)}
            </p>
            <p className="text-[11px] text-text-ghost mt-1">in motion</p>
          </div>

          <div className="bg-[#0d1424] border border-white/[0.06] rounded-2xl p-6">
            <p className="text-[10px] uppercase tracking-widest text-text-ghost mb-2">Projected</p>
            <p className="text-2xl font-bold text-text-primary">
              {loading ? "—" : formatEur(projected)}
            </p>
            <p className="text-[11px] text-text-ghost mt-1">weighted estimate</p>
          </div>
        </div>

        {/* Team breakdown */}
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-medium mb-4">
            By Business Unit
          </p>
          <div className="bg-[#0d1424] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.04]">
            {BUSINESS_UNITS.map((unit) => {
              const { Icon } = unit;

              // Sum all revenue entries where the sourceTeamId matches teams with this unit's patterns
              // Since we don't have team lookup here, show totals from byTeam if we had slugs
              // For now, show a proportional placeholder — the API aggregates by sourceTeamId
              // We display all byTeam data grouped under the unit that best matches
              const unitActual   = 0;
              const unitPipeline = 0;
              // Note: actual team-to-unit mapping would require the team list;
              // showing aggregate row per unit as a structural placeholder

              return (
                <div key={unit.id} className="flex items-center gap-4 px-5 py-4">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${unit.color}15`, border: `1px solid ${unit.color}25` }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: unit.color }} />
                  </div>
                  <p className="flex-1 text-[13px] text-text-secondary font-medium">{unit.name}</p>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-[10px] text-text-ghost mb-0.5">Actual</p>
                      <p className="text-[13px] font-semibold text-accent-green">
                        {unitActual > 0 ? formatEur(unitActual) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-ghost mb-0.5">Pipeline</p>
                      <p className="text-[13px] font-semibold text-[#00D4FF]">
                        {unitPipeline > 0 ? formatEur(unitPipeline) : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent entries */}
        {(data?.entries?.length ?? 0) > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-medium mb-4">
              Recent Entries
            </p>
            <div className="bg-[#0d1424] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.04]">
              {data!.entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-text-secondary truncate">{entry.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[11px] ${TYPE_COLORS[entry.revenueType] ?? "text-text-ghost"}`}>
                        {TYPE_LABELS[entry.revenueType] ?? entry.revenueType}
                      </span>
                      <span className="text-text-ghost/40 text-[10px]">·</span>
                      <span className="text-[11px] text-text-ghost">{timeAgo(entry.createdAt)}</span>
                    </div>
                  </div>
                  <p className={`text-[15px] font-bold flex-shrink-0 ${TYPE_COLORS[entry.revenueType] ?? "text-text-primary"}`}>
                    {formatEur(entry.amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && actual === 0 && pipeline === 0 && (
          <div className="text-center py-12 mt-4">
            <TrendingUp className="w-8 h-8 text-text-ghost mx-auto mb-3" />
            <p className="text-text-muted">No revenue entries yet.</p>
            <p className="text-text-ghost text-[13px] mt-1">
              Revenue will appear here as teams generate opportunities and close deals.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
