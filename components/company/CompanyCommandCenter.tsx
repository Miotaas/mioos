"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/store/appStore";
import { Building2, TrendingUp, Zap, AlertTriangle, CheckCircle2,
  Clock, Target, RefreshCw, Circle, ChevronRight, BarChart3,
  Lightbulb, Shield } from "lucide-react";

interface RevenueEntry { title: string; amount: number; revenueType: string; currency: string; probability: number | null }
interface Opportunity  { id: string; title: string; opportunityType: string; score: number; confidence: number; estimatedRevenue: number | null; status: string; currentStage: string | null; createdAt: string }
interface Project      { id: string; name: string; status: string; priority: string; revenueImpact: number | null; nextAction: string | null; updatedAt: string; autoCreated: boolean }
interface Approval     { id: string; title: string; priority: string; decisionType: string; createdAt: string; sourceTeam?: { name: string } | null }
interface AllocationEntry { opportunityId: string; title: string; opportunityType: string; roi: number; allocationPct: number; recommendation: string; score: number }
interface Goal         { id: string; title: string; progress: number; target: number | null; goalType: string }
interface WfTeamPerf  { teamId: string; teamName: string; departmentType: string; completedThisWeek: number; outputsThisWeek: number }

interface DashboardData {
  generatedAt: string;
  revenue: { mrr: number; arr: number; oneTime: number; potential: number; total: number; entries: RevenueEntry[] };
  opportunities: { recentCount: number; recent: Opportunity[]; totalActive: number; funnel: Record<string, number> };
  projects: { active: Project[]; count: number };
  blocked: { blockedProjects: { id: string; name: string; blocker: string | null; priority: string }[]; stalledOpportunities: { id: string; title: string; status: string; currentStage: string | null }[]; totalIssues: number };
  approvals: { pending: Approval[]; pendingCount: number };
  goals: Goal[];
  artifactsThisWeek: number;
  topROIAction: AllocationEntry | null;
  allocationPlan: AllocationEntry[];
  runtime: { alive: boolean; lastBeat: string | null; loopCount: number };
}

const OPP_TYPE_LABELS: Record<string, string> = {
  automation_service: "Automation",
  ecommerce_product:  "E-Commerce",
  saas_product:       "SaaS",
  content_business:   "Content",
  internal_tool:      "Internal",
};

const STATUS_COLORS: Record<string, string> = {
  discovered:  "text-accent-cyan",
  researching: "text-accent-violet",
  validating:  "text-accent-amber",
  approved:    "text-accent-green",
  building:    "text-accent-green",
  marketing:   "text-accent-green",
  live:        "text-emerald-400",
  revenue_generating: "text-emerald-400",
};

function fmtAway(minutes: number): string {
  if (minutes < 2)    return "just now";
  if (minutes < 60)   return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60 > 0 ? ` ${minutes % 60}m` : ""}`.trim();
  return `${Math.floor(minutes / 1440)}d`;
}

function getBriefGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `€${(n / 1_000).toFixed(1)}K`;
  return `€${n.toLocaleString()}`;
}

function Section({ title, icon: Icon, children, className = "" }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface-1 border border-white/[0.06] rounded-xl p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-accent-cyan opacity-70" />
        <h2 className="text-xs font-semibold text-text-ghost uppercase tracking-widest">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] text-text-ghost uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-bold text-text-primary">{value}</p>
      {sub && <p className="text-[11px] text-text-ghost mt-0.5">{sub}</p>}
    </div>
  );
}

export function CompanyCommandCenter() {
  const [data, setData]     = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/company/dashboard");
      if (res.ok) setData(await res.json() as DashboardData);
    } catch { /* ignore */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const { setActiveView } = useAppStore();
  const [awayMinutes, setAwayMinutes] = useState(0);
  const [wfTeams, setWfTeams] = useState<WfTeamPerf[]>([]);

  useEffect(() => {
    const key = "mios_last_visit";
    const prev = localStorage.getItem(key);
    if (prev) setAwayMinutes(Math.floor((Date.now() - parseInt(prev, 10)) / 60000));
    localStorage.setItem(key, String(Date.now()));
  }, []);

  useEffect(() => {
    fetch("/api/executive/workforce")
      .then(r => r.json())
      .then((d: { teams?: WfTeamPerf[] }) => { if (d?.teams) setWfTeams(d.teams); })
      .catch(() => {});
  }, []);

  function refresh() { setRefreshing(true); void load(); }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <Building2 className="w-10 h-10 text-accent-cyan mx-auto opacity-50 animate-pulse" />
          <p className="text-text-ghost text-sm">Loading company status...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-ghost text-sm">Could not load company data.</p>
      </div>
    );
  }

  const { revenue, opportunities, projects, blocked, approvals, goals, topROIAction, allocationPlan, runtime, artifactsThisWeek } = data;

  // Executive Brief — derived data
  const briefDate = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  type NavView = Parameters<typeof setActiveView>[0];
  const bullets: { color: string; text: string; view: NavView | null; cta: string }[] = [];
  if (opportunities.recentCount > 0)
    bullets.push({ color: "bg-[#6366f1]", text: `Research discovered ${opportunities.recentCount} new opportunit${opportunities.recentCount === 1 ? "y" : "ies"}`, view: "opportunities", cta: "View →" });
  if (approvals.pendingCount > 0)
    bullets.push({ color: "bg-accent-amber", text: `${approvals.pendingCount} approval${approvals.pendingCount === 1 ? "" : "s"} waiting for your decision`, view: "drafts", cta: "Review →" });
  if (artifactsThisWeek > 0)
    bullets.push({ color: "bg-accent-green", text: `${artifactsThisWeek} artifact${artifactsThisWeek === 1 ? "" : "s"} created this week`, view: null, cta: "" });
  if (blocked.totalIssues > 0 && bullets.length < 3)
    bullets.push({ color: "bg-accent-red", text: `${blocked.totalIssues} item${blocked.totalIssues === 1 ? "" : "s"} blocked or stalled`, view: "projects", cta: "View →" });

  const biggestOpp  = opportunities.recent.slice().sort((a, b) => b.score - a.score)[0] ?? null;
  const biggestRisk = blocked.blockedProjects[0] ?? null;
  const stalledRisk = !biggestRisk ? (blocked.stalledOpportunities[0] ?? null) : null;

  return (
    <div className="h-full overflow-y-auto px-4 py-6 md:px-8">

      {/* ── EXECUTIVE BRIEF ─────────────────────────────────────── */}
      <div
        className="mb-6 rounded-xl overflow-hidden border border-[#00D4FF]/10"
        style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.07) 0%, rgba(99,102,241,0.04) 50%, rgba(16,185,129,0.03) 100%)" }}
      >
        {/* Greeting row */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3">
          <div>
            <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] mb-1.5">Command Center</p>
            <h2 className="text-[20px] font-semibold text-text-primary tracking-tight">{getBriefGreeting()}</h2>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-text-ghost uppercase tracking-[0.07em]">{briefDate}</p>
            {awayMinutes > 1 && (
              <p className="text-[11px] text-text-ghost mt-1">
                Away for <span className="text-text-secondary font-medium">{fmtAway(awayMinutes)}</span>
              </p>
            )}
          </div>
        </div>

        {/* Since your last visit bullets */}
        {bullets.length > 0 ? (
          <div className="px-6 pb-4 space-y-2">
            {bullets.map((b, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${b.color}`} />
                <p className="text-[12px] text-text-secondary flex-1">{b.text}</p>
                {b.view && (
                  <button
                    onClick={() => setActiveView(b.view as NavView)}
                    className="text-[10px] text-text-ghost hover:text-text-secondary border border-white/[0.07] hover:border-white/[0.12] px-2 py-0.5 rounded transition-all flex-shrink-0"
                  >
                    {b.cta}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 pb-4">
            <p className="text-[12px] text-text-ghost">All systems running. No events since your last visit.</p>
          </div>
        )}

        {/* Intelligence strip */}
        <div className="grid grid-cols-3 gap-px border-t border-white/[0.06]">
          <div className="px-5 py-3 bg-[rgba(16,185,129,0.03)]">
            <p className="text-[8.5px] uppercase tracking-[0.1em] text-accent-green font-semibold mb-1.5">Biggest Opportunity</p>
            {biggestOpp ? (
              <>
                <p className="text-[11px] text-text-primary font-medium leading-snug">{biggestOpp.title}</p>
                <p className="text-[10px] text-text-ghost mt-0.5">Score {biggestOpp.score}/10 · {biggestOpp.status}</p>
              </>
            ) : (
              <p className="text-[11px] text-text-ghost">No active opportunities</p>
            )}
          </div>
          <div className="px-5 py-3 bg-[rgba(239,68,68,0.03)] border-x border-white/[0.05]">
            <p className="text-[8.5px] uppercase tracking-[0.1em] text-accent-red font-semibold mb-1.5">Biggest Risk</p>
            {biggestRisk ? (
              <>
                <p className="text-[11px] text-text-primary font-medium leading-snug">{biggestRisk.name}</p>
                <p className="text-[10px] text-text-ghost mt-0.5">{biggestRisk.blocker ?? "Blocked — needs attention"}</p>
              </>
            ) : stalledRisk ? (
              <>
                <p className="text-[11px] text-text-primary font-medium leading-snug">{stalledRisk.title}</p>
                <p className="text-[10px] text-text-ghost mt-0.5">Stalled at {stalledRisk.currentStage ?? stalledRisk.status}</p>
              </>
            ) : (
              <p className="text-[11px] text-accent-green">No active blockers</p>
            )}
          </div>
          <div className="px-5 py-3 bg-[rgba(0,212,255,0.03)]">
            <p className="text-[8.5px] uppercase tracking-[0.1em] text-[#00D4FF] font-semibold mb-1.5">Recommended Action</p>
            {topROIAction ? (
              <>
                <p className="text-[11px] text-text-primary font-medium leading-snug">{topROIAction.title}</p>
                <p className="text-[10px] text-text-ghost mt-0.5">{topROIAction.recommendation?.slice(0, 60) ?? `Est. ${fmt(topROIAction.roi)}/mo`}</p>
              </>
            ) : (
              <p className="text-[11px] text-text-ghost">No recommendation yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Building2 className="w-5 h-5 text-accent-cyan" />
            Company
          </h1>
          <p className="text-xs text-text-ghost mt-0.5">
            Autonomous Company Runtime — {new Date(data.generatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            <span className={`ml-3 inline-flex items-center gap-1 ${runtime.alive ? "text-accent-green" : "text-accent-amber"}`}>
              <Circle className={`w-1.5 h-1.5 fill-current ${runtime.alive ? "text-accent-green" : "text-accent-amber"}`} />
              {runtime.alive ? "Runtime live" : "Runtime offline"} · {runtime.loopCount} ticks
            </span>
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 text-[11px] text-text-ghost hover:text-text-primary px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.12] transition-all"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Alerts row */}
      {(blocked.totalIssues > 0 || approvals.pendingCount > 0) && (
        <div className="flex flex-wrap gap-3 mb-6">
          {approvals.pendingCount > 0 && (
            <div className="flex items-center gap-2 bg-accent-amber/10 border border-accent-amber/20 rounded-lg px-4 py-2.5 text-sm">
              <Shield className="w-4 h-4 text-accent-amber" />
              <span className="text-text-primary font-medium">{approvals.pendingCount} approval{approvals.pendingCount > 1 ? "s" : ""} need your decision</span>
            </div>
          )}
          {blocked.totalIssues > 0 && (
            <div className="flex items-center gap-2 bg-accent-red/10 border border-accent-red/20 rounded-lg px-4 py-2.5 text-sm">
              <AlertTriangle className="w-4 h-4 text-accent-red" />
              <span className="text-text-primary font-medium">{blocked.totalIssues} blocked or stalled item{blocked.totalIssues > 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* === Column 1: Revenue + Goals === */}
        <div className="space-y-4">

          {/* 1. What is making money? */}
          <Section title="Revenue" icon={TrendingUp}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Metric label="MRR" value={fmt(revenue.mrr)} sub={revenue.potential > 0 ? `${fmt(revenue.potential)} pipeline` : undefined} />
              <Metric label="Total Active" value={fmt(revenue.total)} sub={revenue.arr > 0 ? `${fmt(revenue.arr)} ARR` : undefined} />
            </div>
            {revenue.entries.slice(0, 4).map((e, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-t border-white/[0.04] text-sm">
                <span className="text-text-secondary truncate max-w-[60%]">{e.title}</span>
                <span className="text-text-primary font-medium">{fmt(e.amount)}</span>
              </div>
            ))}
            {revenue.entries.length === 0 && (
              <p className="text-text-ghost text-xs text-center py-2">No revenue entries yet — opportunities being built</p>
            )}
          </Section>

          {/* Goals */}
          {goals.length > 0 && (
            <Section title="Active Goals" icon={Target}>
              {goals.map(g => (
                <div key={g.id} className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-text-secondary truncate max-w-[70%]">{g.title}</span>
                    <span className="text-xs text-text-ghost">{g.progress ?? 0}%</span>
                  </div>
                  <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full bg-accent-violet rounded-full transition-all" style={{ width: `${g.progress ?? 0}%` }} />
                  </div>
                </div>
              ))}
            </Section>
          )}
        </div>

        {/* === Column 2: Opportunities + Pipeline === */}
        <div className="space-y-4">

          {/* 2. What opportunities were discovered? */}
          <Section title="Opportunities" icon={Lightbulb}>
            <div className="flex items-center gap-4 mb-4">
              <Metric label="Active" value={String(opportunities.totalActive)} />
              <Metric label="This Week" value={String(opportunities.recentCount)} />
              <Metric label="Artifacts" value={String(artifactsThisWeek)} sub="this week" />
            </div>

            {/* Funnel pills */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {Object.entries(opportunities.funnel).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([status, count]) => (
                <span key={status} className={`text-[10px] px-2 py-0.5 rounded-full border border-white/[0.08] ${STATUS_COLORS[status] ?? "text-text-ghost"}`}>
                  {count} {status}
                </span>
              ))}
            </div>

            {/* Recent discoveries */}
            <div className="space-y-2">
              {opportunities.recent.slice(0, 5).map(opp => (
                <div key={opp.id} className="flex items-start justify-between gap-2 py-1.5 border-t border-white/[0.04]">
                  <div className="min-w-0">
                    <p className="text-sm text-text-secondary truncate">{opp.title}</p>
                    <p className="text-[10px] text-text-ghost">{OPP_TYPE_LABELS[opp.opportunityType] ?? opp.opportunityType} · score {opp.score}/10</p>
                  </div>
                  <span className={`text-[10px] font-medium flex-shrink-0 ${STATUS_COLORS[opp.status] ?? "text-text-ghost"}`}>
                    {opp.status}
                  </span>
                </div>
              ))}
              {opportunities.recent.length === 0 && (
                <p className="text-text-ghost text-xs text-center py-2">Research team is discovering opportunities</p>
              )}
            </div>
          </Section>

          {/* 3. What projects are progressing? */}
          <Section title="Projects" icon={BarChart3}>
            {projects.active.slice(0, 5).map(p => (
              <div key={p.id} className="py-2 border-t border-white/[0.04]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-text-secondary truncate max-w-[70%]">{p.name}</span>
                  <div className="flex items-center gap-2">
                    {p.revenueImpact && <span className="text-[10px] text-accent-green">{fmt(p.revenueImpact)}</span>}
                    {p.autoCreated && <span className="text-[9px] text-accent-cyan/60 border border-accent-cyan/20 rounded px-1">auto</span>}
                  </div>
                </div>
                {p.nextAction && <p className="text-[10px] text-text-ghost mt-1 truncate">{p.nextAction}</p>}
              </div>
            ))}
            {projects.active.length === 0 && (
              <p className="text-text-ghost text-xs text-center py-2">No active projects — opportunities create them automatically</p>
            )}
          </Section>
        </div>

        {/* === Column 3: Focus + Blocked + Approvals === */}
        <div className="space-y-4">

          {/* Top ROI Action */}
          {topROIAction && (
            <div className="bg-gradient-to-br from-accent-green/10 to-transparent border border-accent-green/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-accent-green" />
                <h2 className="text-xs font-semibold text-accent-green uppercase tracking-widest">Highest ROI Action</h2>
              </div>
              <p className="text-sm font-medium text-text-primary mb-1">{topROIAction.title}</p>
              <p className="text-xs text-text-ghost mb-3">{OPP_TYPE_LABELS[topROIAction.opportunityType] ?? topROIAction.opportunityType} · ROI estimate: {fmt(topROIAction.roi)}/mo</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-accent-green rounded-full" style={{ width: `${topROIAction.allocationPct}%` }} />
                </div>
                <span className="text-[10px] text-accent-green font-medium">{topROIAction.allocationPct}% effort</span>
              </div>
              <p className="text-[10px] text-text-ghost mt-2">{topROIAction.recommendation}</p>
            </div>
          )}

          {/* Capital Allocation */}
          {allocationPlan.length > 0 && (
            <Section title="Effort Allocation" icon={Target}>
              {allocationPlan.slice(0, 5).map((entry, i) => (
                <div key={entry.opportunityId} className="flex items-center gap-3 py-2 border-t border-white/[0.04]">
                  <span className="text-[10px] text-text-ghost w-4 flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary truncate">{entry.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full bg-accent-cyan rounded-full" style={{ width: `${entry.allocationPct}%` }} />
                      </div>
                      <span className="text-[9px] text-text-ghost flex-shrink-0">{entry.allocationPct}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* 4. What is blocked? */}
          {blocked.totalIssues > 0 && (
            <Section title="Blocked" icon={AlertTriangle}>
              {blocked.blockedProjects.map(p => (
                <div key={p.id} className="flex items-start gap-2 py-2 border-t border-white/[0.04]">
                  <AlertTriangle className="w-3 h-3 text-accent-red flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-text-secondary">{p.name}</p>
                    {p.blocker && <p className="text-[10px] text-accent-red">{p.blocker}</p>}
                  </div>
                </div>
              ))}
              {blocked.stalledOpportunities.map(o => (
                <div key={o.id} className="flex items-start gap-2 py-2 border-t border-white/[0.04]">
                  <Clock className="w-3 h-3 text-accent-amber flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-text-secondary">{o.title}</p>
                    <p className="text-[10px] text-text-ghost">Stalled at: {o.currentStage ?? o.status}</p>
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* 5. What needs approval? */}
          {approvals.pendingCount > 0 && (
            <Section title="Needs Your Decision" icon={Shield}>
              {approvals.pending.slice(0, 5).map(a => (
                <div key={a.id} className="py-2 border-t border-white/[0.04]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-text-secondary truncate">{a.title}</p>
                      <p className="text-[10px] text-text-ghost">{a.sourceTeam?.name ?? "System"}</p>
                    </div>
                    <span className={`text-[10px] flex-shrink-0 font-medium ${a.priority === "urgent" ? "text-accent-red" : a.priority === "high" ? "text-accent-amber" : "text-text-ghost"}`}>
                      {a.priority}
                    </span>
                  </div>
                </div>
              ))}
              {approvals.pendingCount > 5 && (
                <p className="text-[10px] text-text-ghost text-center pt-2">+{approvals.pendingCount - 5} more in Inbox</p>
              )}
            </Section>
          )}

          {/* All clear */}
          {blocked.totalIssues === 0 && approvals.pendingCount === 0 && (
            <div className="flex items-center gap-3 bg-accent-green/5 border border-accent-green/15 rounded-xl p-4">
              <CheckCircle2 className="w-4 h-4 text-accent-green flex-shrink-0" />
              <div>
                <p className="text-sm text-text-primary font-medium">All clear</p>
                <p className="text-xs text-text-ghost">No blockers or pending approvals</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
