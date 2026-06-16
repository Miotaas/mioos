"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { WorkforceOutput, WorkforceApproval, Opportunity } from "@/types";
import { Zap, Target, CheckSquare, TrendingUp, ArrowRight, Clock } from "lucide-react";

interface RevenueData {
  actual: number;
  pipeline: number;
  projected: number;
  currency: string;
}

function formatEur(n: number) {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(1)}k`;
  return `€${Math.round(n)}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return "just now";
}

function buildBrief(
  outputs: WorkforceOutput[],
  pendingCount: number,
  revenue: RevenueData | null,
  topOpp: Opportunity | null
): string {
  const now = Date.now();
  const recent = outputs.filter(
    (o) => now - new Date(o.createdAt).getTime() < 7 * 24 * 3_600_000
  );

  // Group by team name
  const byTeam: Record<string, number> = {};
  for (const o of recent) {
    const name = o.team?.name ?? "Unknown Team";
    byTeam[name] = (byTeam[name] ?? 0) + 1;
  }

  const parts: string[] = [];

  for (const [teamName, count] of Object.entries(byTeam).slice(0, 3)) {
    parts.push(`${teamName} produced ${count} output${count > 1 ? "s" : ""} this week.`);
  }

  if (topOpp) {
    parts.push(
      `Highest-scored opportunity: "${topOpp.title}" (score ${topOpp.score}/10${topOpp.estimatedRevenue ? `, ${formatEur(topOpp.estimatedRevenue)} potential` : ""}).`
    );
  }

  if (pendingCount > 0) {
    parts.push(
      `${pendingCount} decision${pendingCount > 1 ? "s" : ""} require${pendingCount === 1 ? "s" : ""} your approval.`
    );
  }

  if (revenue && revenue.pipeline > 0) {
    parts.push(`Revenue pipeline is at ${formatEur(revenue.pipeline)}.`);
  }

  if (parts.length === 0) {
    return "Operations normal. All teams are running. No decisions pending.";
  }

  return parts.join(" ");
}

const OUTPUT_TYPE_LABELS: Record<string, string> = {
  research: "Research",
  product_candidate: "Product Candidate",
  prospect: "Prospect",
  campaign: "Campaign",
  content: "Content",
  automation: "Automation",
  tool: "Tool",
  mvp: "MVP",
  support_insight: "Support Insight",
  process_improvement: "Process Improvement",
  revenue_opportunity: "Revenue Opportunity",
  approval_request: "Approval Request",
  briefing_note: "Briefing Note",
};

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-accent-green",
  approved: "bg-accent-green",
  in_review: "bg-accent-amber",
  draft: "bg-text-ghost",
  in_progress: "bg-[#00D4FF]",
};

export function CommandView() {
  const { setActiveView } = useAppStore();

  const [outputs, setOutputs] = useState<WorkforceOutput[]>([]);
  const [approvals, setApprovals] = useState<WorkforceApproval[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/workforce/outputs?limit=20").then((r) => r.json()).catch(() => []),
      fetch("/api/workforce-approvals?status=pending").then((r) => r.json()).catch(() => []),
      fetch("/api/opportunities?limit=10").then((r) => r.json()).catch(() => []),
      fetch("/api/revenue").then((r) => r.json()).catch(() => null),
    ]).then(([outs, apps, opps, rev]) => {
      setOutputs(Array.isArray(outs) ? outs : []);
      setApprovals(Array.isArray(apps) ? apps : []);
      setOpportunities(Array.isArray(opps) ? opps : []);
      setRevenue(rev && !rev.error ? rev : null);
      setLoading(false);
    });
  }, []);

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const pendingCount = approvals.length;
  const topOpp = opportunities[0] ?? null;
  const recentOutputs = outputs.slice(0, 6);
  const activeOpps = opportunities.filter(
    (o) => !["rejected", "archived"].includes(o.status)
  ).length;

  const brief = loading ? "Loading operational status…" : buildBrief(outputs, pendingCount, revenue, topOpp);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-10 pb-20">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.14em] text-text-ghost font-medium mb-1">
            COMMAND · {dateLabel.toUpperCase()}
          </p>
          <h1 className="text-3xl font-bold text-text-primary leading-tight">
            Good{now.getHours() < 12 ? " morning" : now.getHours() < 18 ? " afternoon" : " evening"}, Michiel.
          </h1>
        </div>

        {/* Brief */}
        <div className="bg-[#0d1424] border border-white/[0.06] rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <Zap className="w-4 h-4 text-[#00D4FF] mt-0.5 flex-shrink-0" />
            <p className="text-[15px] text-text-secondary leading-relaxed">
              {brief}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <button
            onClick={() => setActiveView("revenue")}
            className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-4 text-left hover:border-[#00D4FF]/20 transition-colors group"
          >
            <p className="text-[10px] uppercase tracking-widest text-text-ghost mb-1">Revenue</p>
            <p className="text-xl font-bold text-text-primary group-hover:text-[#00D4FF] transition-colors">
              {loading ? "—" : formatEur(revenue?.actual ?? 0)}
            </p>
            <p className="text-[11px] text-text-ghost mt-0.5">actual</p>
          </button>

          <button
            onClick={() => setActiveView("revenue")}
            className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-4 text-left hover:border-[#00D4FF]/20 transition-colors group"
          >
            <p className="text-[10px] uppercase tracking-widest text-text-ghost mb-1">Pipeline</p>
            <p className="text-xl font-bold text-text-primary group-hover:text-[#00D4FF] transition-colors">
              {loading ? "—" : formatEur(revenue?.pipeline ?? 0)}
            </p>
            <p className="text-[11px] text-text-ghost mt-0.5">in motion</p>
          </button>

          <button
            onClick={() => setActiveView("opportunities")}
            className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-4 text-left hover:border-[#00D4FF]/20 transition-colors group"
          >
            <p className="text-[10px] uppercase tracking-widest text-text-ghost mb-1">Opportunities</p>
            <p className="text-xl font-bold text-text-primary group-hover:text-[#00D4FF] transition-colors">
              {loading ? "—" : activeOpps}
            </p>
            <p className="text-[11px] text-text-ghost mt-0.5">active</p>
          </button>

          <button
            onClick={() => setActiveView("decisions")}
            className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-4 text-left hover:border-amber-400/20 transition-colors group"
          >
            <p className="text-[10px] uppercase tracking-widest text-text-ghost mb-1">Decisions</p>
            <p className={`text-xl font-bold transition-colors ${pendingCount > 0 ? "text-amber-400 group-hover:text-amber-300" : "text-text-primary"}`}>
              {loading ? "—" : pendingCount}
            </p>
            <p className="text-[11px] text-text-ghost mt-0.5">pending</p>
          </button>
        </div>

        {/* Top opportunity */}
        {topOpp && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-medium flex items-center gap-1.5">
                <Target className="w-3 h-3" /> Top Opportunity
              </p>
              <button
                onClick={() => setActiveView("opportunities")}
                className="text-[11px] text-text-ghost hover:text-[#00D4FF] transition-colors flex items-center gap-1"
              >
                All opportunities <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      topOpp.score >= 8
                        ? "bg-accent-green/15 text-accent-green"
                        : topOpp.score >= 6
                        ? "bg-amber-400/15 text-amber-400"
                        : "bg-white/[0.06] text-text-muted"
                    }`}>
                      {topOpp.score}/10
                    </span>
                    <span className="text-[11px] text-text-ghost capitalize">
                      {topOpp.opportunityType.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-[15px] font-semibold text-text-primary leading-snug">{topOpp.title}</p>
                  {topOpp.nextRecommendedStep && (
                    <p className="text-[13px] text-text-muted mt-2">
                      → {topOpp.nextRecommendedStep}
                    </p>
                  )}
                </div>
                {topOpp.estimatedRevenue && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-accent-green">{formatEur(topOpp.estimatedRevenue)}</p>
                    <p className="text-[11px] text-text-ghost">potential</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Team activity */}
        {recentOutputs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-medium flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" /> Team Activity
              </p>
              <button
                onClick={() => setActiveView("workforce")}
                className="text-[11px] text-text-ghost hover:text-[#00D4FF] transition-colors flex items-center gap-1"
              >
                View workforce <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl divide-y divide-white/[0.04]">
              {recentOutputs.map((o) => (
                <div key={o.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${STATUS_COLORS[o.status] ?? "bg-text-ghost"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] text-text-ghost">{o.team?.name ?? "Team"}</span>
                      <span className="text-[10px] text-text-ghost/50">·</span>
                      <span className="text-[11px] text-text-ghost/70">
                        {OUTPUT_TYPE_LABELS[o.outputType] ?? o.outputType}
                      </span>
                    </div>
                    <p className="text-[13px] text-text-secondary truncate">{o.title}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-text-ghost flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {timeAgo(o.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && recentOutputs.length === 0 && !topOpp && (
          <div className="text-center py-16">
            <Zap className="w-8 h-8 text-text-ghost mx-auto mb-3" />
            <p className="text-text-muted text-[15px]">Operations ready.</p>
            <p className="text-text-ghost text-[13px] mt-1">
              Teams are initializing. Activity will appear here as work begins.
            </p>
            <button
              onClick={() => setActiveView("workforce")}
              className="mt-4 text-[13px] text-[#00D4FF] hover:text-[#00D4FF]/80 transition-colors flex items-center gap-1 mx-auto"
            >
              View Workforce <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
