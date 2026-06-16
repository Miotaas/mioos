"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { WorkforceTeam, WorkforceOutput, WorkforceApproval, Assignment } from "@/types";
import { ShoppingBag, Wrench, Video, TrendingUp, ArrowRight, Clock, CheckSquare } from "lucide-react";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return "just now";
}

function formatEur(n: number) {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(1)}k`;
  return `€${Math.round(n)}`;
}

const BUSINESS_UNITS = [
  {
    id: "ecommerce",
    name: "E-commerce Team",
    mission: "Find profitable products and generate revenue through sourcing, validation, and sales.",
    executionLabel: "Products & Revenue",
    patterns: ["commerce", "digital_commerce", "fulfillment", "ecommerce"],
    color: "#10b981",
    Icon: ShoppingBag,
  },
  {
    id: "automation-sales",
    name: "Automation Sales Team",
    mission: "Identify businesses with inefficiencies, design automation systems, and close them as clients.",
    executionLabel: "Automation Clients",
    patterns: ["sales", "outreach", "lead_generation", "automation", "marketing"],
    color: "#00D4FF",
    Icon: Wrench,
  },
  {
    id: "youtube",
    name: "YouTube Automation Team",
    mission: "Build and scale faceless YouTube channels. Produce content, grow subscribers, and monetize.",
    executionLabel: "Videos & Channels",
    patterns: ["content", "writing", "youtube", "video"],
    color: "#8b5cf6",
    Icon: Video,
  },
  {
    id: "crypto-stock",
    name: "Crypto / Stock Trader Team",
    mission: "Research financial markets, identify opportunities, and prepare trade proposals for approval.",
    executionLabel: "Trades & Analysis",
    patterns: ["research", "crypto", "trading", "finance", "operations"],
    color: "#f59e0b",
    Icon: TrendingUp,
  },
] as const;

type UnitId = typeof BUSINESS_UNITS[number]["id"];

interface UnitState {
  dbTeam: WorkforceTeam | null;
  recentOutputs: WorkforceOutput[];
  pendingApprovals: WorkforceApproval[];
  activeAssignments: number;
}

function matchUnit(team: WorkforceTeam, patterns: readonly string[]) {
  const slug = (team.slug + " " + team.departmentType).toLowerCase();
  return patterns.some((p) => slug.includes(p));
}

const OUTPUT_TYPE_LABELS: Record<string, string> = {
  research: "Research",
  product_candidate: "Product Candidate",
  prospect: "Prospect",
  campaign: "Campaign",
  content: "Content",
  automation: "Automation",
  tool: "Tool",
  revenue_opportunity: "Revenue Opportunity",
  briefing_note: "Briefing Note",
  approval_request: "Approval",
};

export function WorkforceView() {
  const { setActiveView } = useAppStore();

  const [teams, setTeams] = useState<WorkforceTeam[]>([]);
  const [outputs, setOutputs] = useState<WorkforceOutput[]>([]);
  const [approvals, setApprovals] = useState<WorkforceApproval[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/workforce/teams").then((r) => r.json()).catch(() => []),
      fetch("/api/workforce/outputs?limit=40").then((r) => r.json()).catch(() => []),
      fetch("/api/workforce-approvals?status=pending").then((r) => r.json()).catch(() => []),
      fetch("/api/assignments?status=active&limit=100").then((r) => r.json()).catch(() => []),
    ]).then(([t, o, a, as_]) => {
      setTeams(Array.isArray(t) ? t : []);
      setOutputs(Array.isArray(o) ? o : []);
      setApprovals(Array.isArray(a) ? a : []);
      setAssignments(Array.isArray(as_) ? as_ : []);
      setLoading(false);
    });
  }, []);

  function getUnitState(unit: typeof BUSINESS_UNITS[number]): UnitState {
    const dbTeam = teams.find((t) => matchUnit(t, unit.patterns)) ?? null;
    const teamIds = teams.filter((t) => matchUnit(t, unit.patterns)).map((t) => t.id);

    const recentOutputs = outputs
      .filter((o) => teamIds.includes(o.teamId))
      .slice(0, 3);

    const pendingApprovals = approvals.filter(
      (a) => a.sourceTeamId && teamIds.includes(a.sourceTeamId)
    );

    const activeAssignments = assignments.filter(
      (a) => teamIds.includes(a.teamId)
    ).length;

    return { dbTeam, recentOutputs, pendingApprovals, activeAssignments };
  }

  const totalActive = assignments.filter((a) => a.status === "active").length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-10 pb-20">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-text-ghost font-medium mb-1">
              OPERATIONS
            </p>
            <h1 className="text-3xl font-bold text-text-primary">Workforce</h1>
            <p className="text-[13px] text-text-muted mt-1">
              {loading ? "Loading…" : `4 autonomous business units · ${totalActive} assignments running`}
            </p>
          </div>
          <button
            onClick={() => setActiveView("decisions")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 text-[13px] font-medium hover:bg-amber-400/15 transition-colors"
          >
            <CheckSquare className="w-4 h-4" />
            {approvals.length > 0 ? `${approvals.length} pending` : "Decisions"}
          </button>
        </div>

        {/* Business unit cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BUSINESS_UNITS.map((unit) => {
            const state = getUnitState(unit);
            const { Icon } = unit;
            const isActive = state.dbTeam?.status === "active" || state.activeAssignments > 0;

            return (
              <div
                key={unit.id}
                className="bg-[#0d1424] border border-white/[0.06] rounded-2xl p-6 flex flex-col gap-4"
              >
                {/* Team header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${unit.color}18`, border: `1px solid ${unit.color}30` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: unit.color }} />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-text-primary leading-tight">{unit.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-accent-green" : "bg-text-ghost"}`} />
                        <span className="text-[11px] text-text-ghost">{isActive ? "Active" : "Standby"}</span>
                        {state.activeAssignments > 0 && (
                          <>
                            <span className="text-text-ghost/40 text-[10px]">·</span>
                            <span className="text-[11px] text-text-ghost">{state.activeAssignments} running</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {state.pendingApprovals.length > 0 && (
                    <button
                      onClick={() => setActiveView("decisions")}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 text-[11px] font-medium hover:bg-amber-400/15 transition-colors"
                    >
                      <CheckSquare className="w-3 h-3" />
                      {state.pendingApprovals.length}
                    </button>
                  )}
                </div>

                {/* Mission */}
                <p className="text-[13px] text-text-muted leading-relaxed">{unit.mission}</p>

                {/* Current focus */}
                {state.dbTeam?.currentFocus && (
                  <div className="bg-white/[0.03] rounded-xl px-4 py-3">
                    <p className="text-[10px] uppercase tracking-widest text-text-ghost mb-1">Current Focus</p>
                    <p className="text-[13px] text-text-secondary">{state.dbTeam.currentFocus}</p>
                  </div>
                )}

                {/* Recent outputs */}
                {state.recentOutputs.length > 0 ? (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-text-ghost mb-2">Recent Outputs</p>
                    <div className="space-y-2">
                      {state.recentOutputs.map((o) => (
                        <div key={o.id} className="flex items-start gap-2.5">
                          <div
                            className="w-1 h-1 rounded-full mt-2 flex-shrink-0"
                            style={{ background: unit.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-text-secondary truncate">{o.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-text-ghost">
                                {OUTPUT_TYPE_LABELS[o.outputType] ?? o.outputType}
                              </span>
                              <span className="text-text-ghost/40 text-[10px]">·</span>
                              <span className="text-[11px] text-text-ghost flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {timeAgo(o.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] text-text-ghost italic">No recent outputs.</p>
                )}

                {/* Execution label tag */}
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                  <span
                    className="text-[11px] px-2.5 py-1 rounded-lg font-medium"
                    style={{ background: `${unit.color}15`, color: unit.color }}
                  >
                    {unit.executionLabel}
                  </span>
                  <button
                    onClick={() => setActiveView("opportunities")}
                    className="text-[11px] text-text-ghost hover:text-[#00D4FF] transition-colors flex items-center gap-1"
                  >
                    Opportunities <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
