"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import {
  WorkforceTeam, WorkforceOutput, WorkforceApproval, Assignment, RevenueEntry,
} from "@/types";
import {
  ShoppingBag, Wrench, Video, TrendingUp,
  ChevronRight, Scale, Briefcase,
  Zap, Clock, AlertTriangle, Lock, FlaskConical,
  CheckCircle2, X, Circle, BarChart2, TrendingDown,
  ArrowRight, Lightbulb,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────

type TradingMode = "research" | "paper" | "approval" | "autonomous";

const TRADING_MODES: {
  id: TradingMode; label: string; description: string; locked: boolean;
}[] = [
  { id: "research",   label: "Research",   description: "Market analysis and watchlists only. No execution.", locked: false },
  { id: "paper",      label: "Paper",      description: "Simulate trades with virtual capital to test strategy.", locked: false },
  { id: "approval",   label: "Approval",   description: "Proposals prepared by team, you approve before execution.", locked: false },
  { id: "autonomous", label: "Autonomous", description: "Executes within configured risk limits without approval.", locked: true },
];

const AUTOMATION_OUTPUT_TYPES = new Set([
  "automation", "system_design", "system", "workflow", "workflow_design",
  "proposal", "demo", "integration", "tool",
]);

const BUSINESS_UNITS = [
  {
    id:           "ecommerce",
    name:         "E-commerce",
    fullName:     "E-commerce Business Unit",
    mission:      "Build profitable direct-to-customer businesses through products, affiliate programs, and supplier partnerships.",
    businessModel: "Supplier / POD / Fulfillment Partner → Customer",
    revenueEngine: "Product → Validation → Store → Traffic → Orders → Revenue",
    kpis:         ["Opportunities validated", "Products launched", "Revenue generated", "Gross margin"],
    approvalBoundary: "Ad spend, supplier commitments, store launches, inventory, paid tests",
    icon:         ShoppingBag,
    color:        "#22C55E",
    patterns:     ["commerce", "ecommerce", "digital_commerce", "fulfillment"],
    oppDomains:   ["ecommerce", "product", "affiliate", "reseller", "dropshipping", "retail", "amazon"],
  },
  {
    id:           "automation-sales",
    name:         "Automation Sales",
    fullName:     "Automation Sales Business Unit",
    mission:      "Generate recurring revenue by identifying operational inefficiencies in businesses and designing automation solutions that eliminate them.",
    businessModel: "Discovery → Solution Design → Proposal → Customer → MRR",
    revenueEngine: "Lead → Qualification → Proposal → Demo → Contract → MRR",
    kpis:         ["Qualified opportunities", "Proposals prepared", "Customers won", "MRR generated"],
    approvalBoundary: "Outreach, proposals, pricing commitments, contracts",
    icon:         Wrench,
    color:        "#8B5CF6",
    patterns:     ["sales", "outreach", "lead_generation", "automation", "marketing"],
    oppDomains:   ["automation", "b2b", "saas", "service", "consulting", "software", "workflow"],
  },
  {
    id:           "youtube",
    name:         "YouTube Automation",
    fullName:     "YouTube Automation Business Unit",
    mission:      "Build and scale content businesses that generate passive income through advertising revenue, sponsorships, and affiliate links.",
    businessModel: "Content Studio → Views → Subscribers → Monetisation",
    revenueEngine: "Niche → Channel → Content → Views → Ad Revenue → Sponsorships",
    kpis:         ["Content opportunities", "Videos prepared", "Channel views", "Revenue generated"],
    approvalBoundary: "Publishing, brand deals, paid assets, copyright material",
    icon:         Video,
    color:        "#F97316",
    patterns:     ["content", "writing", "youtube", "video", "media"],
    oppDomains:   ["content", "youtube", "media", "affiliate", "sponsorship", "channel"],
  },
  {
    id:           "crypto-stock",
    name:         "Crypto / Stock",
    fullName:     "Crypto / Stock Trading Business Unit",
    mission:      "Grow capital responsibly through systematic research, validated trade theses, and disciplined risk-managed execution.",
    businessModel: "Research → Opportunity → Risk Assessment → Approval → Execution",
    revenueEngine: "Analysis → Thesis → Paper Trade → Approval → Position → Return",
    kpis:         ["Opportunities identified", "Thesis accuracy", "Risk-adjusted returns", "Portfolio growth"],
    approvalBoundary: "All real trades, capital allocation, position changes",
    icon:         TrendingUp,
    color:        "#00D4FF",
    patterns:     ["research", "crypto", "trading", "finance", "operations", "stock"],
    oppDomains:   ["crypto", "trading", "investment", "stock", "financial", "defi", "market"],
  },
] as const;

type UnitId     = typeof BUSINESS_UNITS[number]["id"];
type UnitConfig = typeof BUSINESS_UNITS[number];

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

function matchUnit(team: WorkforceTeam, patterns: readonly string[]): boolean {
  const hay = [team.slug, team.departmentType, team.name]
    .filter(Boolean).join(" ").toLowerCase();
  return patterns.some(p => hay.includes(p));
}

function matchOppDomain(title: string, type: string, domains: readonly string[]): boolean {
  const hay = (title + " " + type).toLowerCase();
  return domains.some(d => hay.includes(d));
}

const OUTPUT_LABELS: Record<string, string> = {
  product_research:  "Product research",
  supplier_lead:     "Supplier lead",
  validation_report: "Validation report",
  campaign_draft:    "Campaign draft",
  script:            "Script",
  market_analysis:   "Market analysis",
  trade_proposal:    "Trade proposal",
  lead:              "Lead",
  lead_generation:   "Lead",
  prospect:          "Prospect",
  proposal:          "Proposal",
  research:          "Research report",
  analysis:          "Analysis",
  content:           "Content",
  outreach:          "Outreach draft",
  video:             "Video",
  thumbnail:         "Thumbnail",
  channel_analysis:  "Channel analysis",
  automation:        "Automation design",
  system_design:     "System design",
  system:            "System design",
  workflow:          "Workflow design",
  workflow_design:   "Workflow design",
  demo:              "Demo",
  integration:       "Integration",
  tool:              "Tool",
};

function outputLabel(type: string): string {
  return OUTPUT_LABELS[type] ?? type.replace(/_/g, " ");
}

function deriveGrowthRecs(portfolio: PortfolioStats, unitId: string): string[] {
  const recs: string[] = [];
  const total = portfolio.discovered + portfolio.researching + portfolio.approved + portfolio.rejected;

  if (total === 0 && portfolio.totalAssignments < 3) {
    recs.push("Dispatch discovery work to start building the opportunity pipeline.");
    return recs;
  }
  if (portfolio.discovered > 2 && portfolio.researching === 0 && portfolio.approved === 0) {
    recs.push(`${portfolio.discovered} discovered opportunities waiting — move the strongest to validation.`);
  }
  if (portfolio.researching > 0 && portfolio.approved === 0) {
    recs.push("Validation work is in progress. Approve the best candidates to unlock execution.");
  }
  if (portfolio.approved > 0 && portfolio.revenueAttributed === 0) {
    recs.push("Approved opportunities are ready for execution. Launching one will generate first revenue.");
  }
  if (portfolio.rejected > 2 && (portfolio.successRate ?? 100) < 40) {
    recs.push("High rejection rate — tighten opportunity criteria to improve pipeline quality.");
  }
  if ((portfolio.successRate ?? 0) >= 70 && portfolio.approved >= 2) {
    recs.push("Strong success rate. Scale discovery volume to compound growth.");
  }
  if (portfolio.revenueAttributed > 0 && portfolio.approved > 0) {
    recs.push("Revenue is flowing. Identify the winning pattern and replicate it across the pipeline.");
  }
  if (unitId === "crypto-stock" && total > 0 && portfolio.approved === 0) {
    recs.push("Build your paper trading track record before moving to approval trading.");
  }

  return recs.slice(0, 3);
}

// ── Local types ─────────────────────────────────────────────────────────

interface OpportunityItem {
  id:              string;
  title:           string;
  opportunityType: string;
  status:          string;
  score:           number;
  confidence:      number;
  estimatedRevenue?: number | null;
  createdAt:       string;
}

interface UnitData {
  dbTeam:        WorkforceTeam | null;
  teamIds:       string[];
  outputs:       WorkforceOutput[];
  approvals:     WorkforceApproval[];
  assignments:   Assignment[];
  opportunities: OpportunityItem[];
  revenue:       RevenueEntry[];
}

interface PortfolioStats {
  discovered:       number;
  researching:      number;
  approved:         number;
  rejected:         number;
  archived:         number;
  active:           number;
  pipelineValue:    number;
  revenueAttributed: number;
  successRate:      number | null;
  totalAssignments: number;
  recentWins:       Array<{ title: string; status: string; estimatedRevenue?: number | null }>;
  recentFailures:   Array<{ title: string }>;
}

// ── Section label (shared) ─────────────────────────────────────────────

function SectionLabel({
  text, count, countColor = "#6b7280", action,
}: {
  text: string; count?: number; countColor?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-text-ghost whitespace-nowrap">
        {text}
      </p>
      {count !== undefined && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
          style={{ color: countColor, backgroundColor: `${countColor}20` }}>
          {count}
        </span>
      )}
      <div className="flex-1 h-px bg-white/[0.04]" />
      {action && (
        <button onClick={action.onClick}
          className="text-[10px] text-text-ghost hover:text-text-muted transition-colors flex items-center gap-1">
          {action.label} <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────

export function WorkforceView() {
  const { setActiveView, showToast } = useAppStore();

  const [allTeams,      setAllTeams]      = useState<WorkforceTeam[]>([]);
  const [allOutputs,    setAllOutputs]    = useState<WorkforceOutput[]>([]);
  const [allApprovals,  setAllApprovals]  = useState<WorkforceApproval[]>([]);
  const [allAssignments,setAllAssignments]= useState<Assignment[]>([]);
  const [allOpps,       setAllOpps]       = useState<OpportunityItem[]>([]);
  const [allRevenue,    setAllRevenue]    = useState<RevenueEntry[]>([]);
  const [loaded,        setLoaded]        = useState(false);
  const [selectedId,    setSelectedId]    = useState<UnitId>("ecommerce");
  const [dispatchOpen,  setDispatchOpen]  = useState(false);
  const [tradingMode,   setTradingMode]   = useState<TradingMode>("research");
  const [portfolio,     setPortfolio]     = useState<PortfolioStats | null>(null);

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/workforce/teams").then(r => r.json()).catch(() => []),
      fetch("/api/workforce/outputs?limit=60").then(r => r.json()).catch(() => []),
      fetch("/api/workforce-approvals?status=pending").then(r => r.json()).catch(() => []),
      fetch("/api/assignments?status=active&limit=100").then(r => r.json()).catch(() => []),
      fetch("/api/opportunities?limit=40").then(r => r.json()).catch(() => []),
      fetch("/api/revenue-entries").then(r => r.json()).catch(() => []),
    ]).then(([tm, outs, ap, as_, op, rev]) => {
      setAllTeams(Array.isArray(tm) ? tm : []);
      setAllOutputs(Array.isArray(outs) ? outs : []);
      setAllApprovals(Array.isArray(ap) ? ap : []);
      setAllAssignments(Array.isArray(as_) ? as_ : []);
      setAllOpps(Array.isArray(op) ? op : []);
      setAllRevenue(Array.isArray(rev) ? rev : []);
      setLoaded(true);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setPortfolio(null);
    fetch(`/api/workforce/teams/${selectedId}/portfolio`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPortfolio(d as PortfolioStats); })
      .catch(() => {});
  }, [selectedId]);

  const handleSendToDecide = useCallback(async (output: WorkforceOutput) => {
    try {
      const res = await fetch(`/api/workforce/outputs/${output.id}/to-approval`, { method: "POST" });
      if (res.ok) {
        showToast("Sent to Decide — approval created");
        load();
      } else {
        const body = await res.json().catch(() => ({}));
        showToast(body.error ?? "Failed to send to Decide", "error");
      }
    } catch {
      showToast("Failed to send to Decide", "error");
    }
  }, [load, showToast]);

  function getUnitData(unit: UnitConfig): UnitData {
    const slugMatched   = allTeams.filter(t => t.slug === unit.id);
    const matchedTeams  = slugMatched.length > 0
      ? slugMatched
      : allTeams.filter(t => matchUnit(t, unit.patterns));
    const teamIds       = matchedTeams.map(t => t.id);
    const dbTeam        = matchedTeams[0] ?? null;

    const outputs       = allOutputs.filter(o => teamIds.includes(o.teamId))
                                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const approvals     = allApprovals.filter(a => a.sourceTeamId && teamIds.includes(a.sourceTeamId));
    const assignments   = allAssignments.filter(a => teamIds.includes(a.teamId));
    const opportunities = allOpps.filter(o => matchOppDomain(o.title, o.opportunityType, unit.oppDomains));
    const revenue       = allRevenue.filter(r => r.sourceTeamId && teamIds.includes(r.sourceTeamId));

    return { dbTeam, teamIds, outputs, approvals, assignments, opportunities, revenue };
  }

  const selectedUnit   = BUSINESS_UNITS.find(u => u.id === selectedId)!;
  const selectedData   = getUnitData(selectedUnit);
  const totalApprovals = allApprovals.length;

  return (
    <div className="h-full flex overflow-hidden">

      {/* ── Left panel: Business unit list ────────────────────────── */}
      <div className="hidden md:flex flex-col w-[240px] flex-shrink-0 border-r border-white/[0.05] bg-[#0a0f1e] overflow-y-auto">
        <div className="px-4 pt-6 pb-4 border-b border-white/[0.05]">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-ghost mb-0.5">Portfolio</p>
          <p className="text-[13px] text-text-muted">
            {loaded ? "4 business units" : "Loading…"}
          </p>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {BUSINESS_UNITS.map(unit => {
            const data     = getUnitData(unit);
            const isActive = data.dbTeam?.status === "active" || data.assignments.length > 0;
            const selected = selectedId === unit.id;
            const { icon: Icon } = unit;

            return (
              <button
                key={unit.id}
                onClick={() => setSelectedId(unit.id)}
                className={cn(
                  "w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                  selected
                    ? "bg-white/[0.06] border border-white/[0.07]"
                    : "border border-transparent hover:bg-white/[0.03]"
                )}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: selected ? `${unit.color}25` : `${unit.color}10`,
                    border: `1px solid ${selected ? unit.color + "40" : unit.color + "20"}`,
                  }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: unit.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[12px] font-medium truncate leading-snug", selected ? "text-text-primary" : "text-text-muted group-hover:text-text-secondary")}>
                    {unit.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={cn("w-1 h-1 rounded-full", isActive ? "bg-[#22C55E]" : "bg-text-ghost/40")} />
                    <span className="text-[10px] text-text-ghost">{isActive ? "Active" : "Standby"}</span>
                  </div>
                </div>
                {data.approvals.length > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#EF4444]/15 text-[#EF4444] flex-shrink-0">
                    {data.approvals.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {totalApprovals > 0 && (
          <div className="px-2 pb-4">
            <button
              onClick={() => setActiveView("decide")}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-[12px] font-medium hover:bg-[#EF4444]/15 transition-all"
            >
              <Scale className="w-3.5 h-3.5" />
              {totalApprovals} pending {totalApprovals === 1 ? "decision" : "decisions"}
            </button>
          </div>
        )}
      </div>

      {/* ── Mobile: top tabs ──────────────────────────────────────── */}
      <div className="md:hidden absolute top-14 left-0 right-0 z-10 flex gap-2 px-4 py-3 bg-[#0a0f1e] border-b border-white/[0.05] overflow-x-auto">
        {BUSINESS_UNITS.map(unit => {
          const { icon: Icon } = unit;
          const selected = selectedId === unit.id;
          return (
            <button key={unit.id} onClick={() => setSelectedId(unit.id)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all flex-shrink-0",
                selected
                  ? "text-text-primary border border-white/[0.08] bg-white/[0.05]"
                  : "text-text-ghost border border-transparent hover:bg-white/[0.03]"
              )}
              style={selected ? { borderColor: `${unit.color}30` } : undefined}
            >
              <Icon className="w-3 h-3" style={{ color: unit.color }} />
              {unit.name}
            </button>
          );
        })}
      </div>

      {/* ── Right panel: Business unit detail ──────────────────────── */}
      <div className="flex-1 overflow-y-auto md:mt-0 mt-[52px]">
        <TeamDetailPanel
          unit={selectedUnit}
          data={selectedData}
          loaded={loaded}
          tradingMode={tradingMode}
          onTradingModeChange={setTradingMode}
          onNavigateDecide={() => setActiveView("decide")}
          onDispatch={() => setDispatchOpen(true)}
          onSendToDecide={handleSendToDecide}
          portfolio={portfolio}
        />
      </div>

      {dispatchOpen && (
        <QuickDispatchModal
          team={selectedData.dbTeam}
          unitName={selectedUnit.fullName}
          unitColor={selectedUnit.color}
          onClose={() => setDispatchOpen(false)}
          onDispatched={() => { setDispatchOpen(false); load(); }}
        />
      )}
    </div>
  );
}

// ── TeamDetailPanel ────────────────────────────────────────────────────

function TeamDetailPanel({
  unit, data, loaded, tradingMode, onTradingModeChange,
  onNavigateDecide, onDispatch, onSendToDecide, portfolio,
}: {
  unit: UnitConfig;
  data: UnitData;
  loaded: boolean;
  tradingMode: TradingMode;
  onTradingModeChange: (m: TradingMode) => void;
  onNavigateDecide: () => void;
  onDispatch: () => void;
  onSendToDecide: (output: WorkforceOutput) => void;
  portfolio: PortfolioStats | null;
}) {
  const { icon: Icon } = unit;
  const isActive = data.dbTeam?.status === "active" || data.assignments.length > 0;

  const pendingOutputIds = new Set(
    data.approvals
      .map(a => a.relatedOutputId)
      .filter((id): id is string => id !== null)
  );

  const liveRevenue = data.revenue.filter(r => r.revenueType === "live"     && r.status === "active").reduce((s, r) => s + r.amount, 0);
  const pipeline    = data.revenue.filter(r => r.revenueType === "pipeline" && r.status === "active").reduce((s, r) => s + r.amount * ((r.probability ?? 100) / 100), 0);

  const isAutomation   = unit.id === "automation-sales";
  const isCrypto       = unit.id === "crypto-stock";
  const leadOutputs    = isAutomation ? data.outputs.filter(o => !AUTOMATION_OUTPUT_TYPES.has(o.outputType)) : [];
  const systemOutputs  = isAutomation ? data.outputs.filter(o =>  AUTOMATION_OUTPUT_TYPES.has(o.outputType)) : [];
  const generalOutputs = isAutomation ? [] : data.outputs;

  const growthRecs = portfolio ? deriveGrowthRecs(portfolio, unit.id) : [];
  const pipelineTotal = portfolio?.pipelineValue ?? 0;
  const totalOpps = portfolio
    ? portfolio.discovered + portfolio.researching + portfolio.approved + portfolio.rejected
    : 0;

  return (
    <div className="max-w-[900px] mx-auto px-5 md:px-8 py-7 pb-24">

      {/* ── Business Unit Header ─────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: `${unit.color}18`, border: `1.5px solid ${unit.color}35` }}
          >
            <Icon className="w-5 h-5" style={{ color: unit.color }} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h2 className="text-[22px] font-semibold text-text-primary tracking-tight leading-none">
                {unit.fullName}
              </h2>
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                style={isActive
                  ? { color: "#22C55E", backgroundColor: "#22C55E18" }
                  : { color: "#6b7280", backgroundColor: "#6b728018" }}
              >
                {isActive ? "Active" : "Standby"}
              </span>
            </div>
            <p className="text-[13px] text-text-muted leading-relaxed max-w-[540px] mb-3">
              {unit.mission}
            </p>
            {/* Revenue engine flow */}
            <div className="flex items-center gap-1 flex-wrap">
              {unit.revenueEngine.split("→").map((stage, i, arr) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="text-[10px] text-text-ghost px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.04]">
                    {stage.trim()}
                  </span>
                  {i < arr.length - 1 && (
                    <ArrowRight className="w-2.5 h-2.5 text-text-ghost/40 flex-shrink-0" />
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={onDispatch}
          className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07] text-text-secondary text-[12px] font-medium hover:bg-white/[0.07] transition-all"
        >
          <Zap className="w-3.5 h-3.5" />
          Dispatch
        </button>
      </div>

      <div className="h-px bg-white/[0.05] mb-8" />

      <div className="space-y-10">

        {/* ── Current Objective ──────────────────────────────── */}
        <section>
          <SectionLabel text="Current Objective" />
          {data.dbTeam?.currentFocus || data.dbTeam?.objective ? (
            <div
              className="px-4 py-3.5 rounded-xl border"
              style={{ borderColor: `${unit.color}25`, background: `${unit.color}08` }}
            >
              <p className="text-[14px] text-text-primary leading-relaxed">
                {data.dbTeam.currentFocus ?? data.dbTeam.objective}
              </p>
            </div>
          ) : (
            <p className="text-[13px] text-text-muted">
              No objective set. Dispatch work to define the current focus.
            </p>
          )}
        </section>

        {/* ── Opportunity Pipeline ────────────────────────────── */}
        <section>
          <SectionLabel
            text="Opportunity Pipeline"
            count={totalOpps > 0 ? totalOpps : undefined}
            countColor={unit.color}
          />
          {portfolio === null ? (
            <p className="text-[13px] text-text-ghost italic">Loading pipeline…</p>
          ) : totalOpps === 0 ? (
            <p className="text-[13px] text-text-muted">
              No opportunities in pipeline yet. The team will discover and validate opportunities autonomously.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Funnel stages */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Discovered",  value: portfolio.discovered,  color: "#6b7280",  desc: "Identified, not yet validated" },
                  { label: "Validating",  value: portfolio.researching,  color: "#F59E0B",  desc: "Under research and scoring" },
                  { label: "Approved",    value: portfolio.approved,     color: "#22C55E",  desc: "Ready for execution" },
                ].map(({ label, value, color, desc }) => (
                  <div key={label}
                    className="px-3 py-3 rounded-xl border border-white/[0.05] bg-white/[0.02] space-y-1.5">
                    <p className="text-[22px] font-mono font-semibold leading-none" style={{ color }}>
                      {value}
                    </p>
                    <p className="text-[10px] font-semibold text-text-secondary">{label}</p>
                    <p className="text-[9px] text-text-ghost leading-tight">{desc}</p>
                  </div>
                ))}
              </div>

              {/* Pipeline value + rejected/archived */}
              <div className="flex items-center gap-4 px-3 py-2.5 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                <div className="flex-1">
                  <p className="text-[9px] text-text-ghost uppercase tracking-wide">Pipeline Value</p>
                  <p className="text-[15px] font-mono font-semibold" style={{ color: unit.color }}>
                    {pipelineTotal > 0 ? fmtEuro(pipelineTotal) : "—"}
                  </p>
                </div>
                <div className="w-px h-8 bg-white/[0.05]" />
                <div className="flex gap-4">
                  <div>
                    <p className="text-[9px] text-text-ghost uppercase tracking-wide">Rejected</p>
                    <p className="text-[15px] font-mono font-semibold text-[#EF4444]">{portfolio.rejected}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-text-ghost uppercase tracking-wide">Success Rate</p>
                    <p className="text-[15px] font-mono font-semibold leading-none"
                      style={{ color: portfolio.successRate !== null ? (portfolio.successRate >= 60 ? "#22C55E" : portfolio.successRate >= 40 ? "#F59E0B" : "#EF4444") : "#6b7280" }}>
                      {portfolio.successRate !== null ? `${portfolio.successRate}%` : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── Active Work ─────────────────────────────────────── */}
        <section>
          <SectionLabel
            text="Active Work"
            count={data.assignments.length > 0 ? data.assignments.length : undefined}
            countColor={unit.color}
          />
          {!loaded ? (
            <p className="text-[13px] text-text-ghost italic">Loading…</p>
          ) : data.assignments.length === 0 ? (
            <p className="text-[13px] text-text-muted">
              No active work. Use Dispatch to give this team a task, or trigger the autonomous engine.
            </p>
          ) : (
            <div className="space-y-0">
              {data.assignments.map((a, i) => (
                <div
                  key={a.id}
                  className={cn("flex items-start gap-3 py-3", i < data.assignments.length - 1 && "border-b border-white/[0.03]")}
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2" style={{ backgroundColor: unit.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-text-secondary leading-snug">{a.title}</p>
                    {a.startedAt && (
                      <p className="text-[10px] text-text-ghost mt-0.5">Started {timeAgo(a.startedAt)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Outputs (split for Automation Sales) ───────────── */}
        {isAutomation ? (
          <>
            <section>
              <SectionLabel text="Prospects &amp; Leads" count={leadOutputs.length > 0 ? leadOutputs.length : undefined} countColor={unit.color} />
              {leadOutputs.length === 0 ? (
                <p className="text-[13px] text-text-muted">No leads generated yet.</p>
              ) : (
                <OutputList outputs={leadOutputs} color={unit.color} pendingOutputIds={pendingOutputIds} onSendToDecide={onSendToDecide} />
              )}
            </section>
            <section>
              <SectionLabel text="Automation Proposals &amp; Designs" count={systemOutputs.length > 0 ? systemOutputs.length : undefined} countColor={unit.color} />
              {systemOutputs.length === 0 ? (
                <p className="text-[13px] text-text-muted">
                  No proposals designed yet. The team designs complete automation solutions for qualified prospects.
                </p>
              ) : (
                <OutputList outputs={systemOutputs} color={unit.color} pendingOutputIds={pendingOutputIds} onSendToDecide={onSendToDecide} />
              )}
            </section>
          </>
        ) : (
          <section>
            <SectionLabel
              text={isCrypto ? "Research &amp; Trade Theses" : "Work Output"}
              count={generalOutputs.length > 0 ? generalOutputs.length : undefined}
              countColor={unit.color}
            />
            {generalOutputs.length === 0 ? (
              <p className="text-[13px] text-text-muted">No outputs produced yet.</p>
            ) : (
              <OutputList outputs={generalOutputs} color={unit.color} pendingOutputIds={pendingOutputIds} onSendToDecide={onSendToDecide} />
            )}
          </section>
        )}

        {/* ── Revenue Impact ──────────────────────────────────── */}
        <section>
          <SectionLabel text="Revenue Impact" />
          {liveRevenue === 0 && pipeline === 0 ? (
            <p className="text-[13px] text-text-muted">
              No revenue attributed yet. Approved opportunities will generate the first entries.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-[13px] text-text-secondary leading-relaxed">
                {liveRevenue > 0 && pipeline > 0
                  ? `${fmtEuro(liveRevenue)} in live revenue with ${fmtEuro(pipeline)} in qualified pipeline.`
                  : liveRevenue > 0
                  ? `${fmtEuro(liveRevenue)} in active monthly revenue.`
                  : `${fmtEuro(pipeline)} in pipeline — nothing live yet.`}
              </p>
              <div className="flex items-end gap-8">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.1em] text-text-ghost mb-1">Live Revenue</p>
                  <p className="text-[20px] font-mono font-semibold leading-none" style={{ color: "#22C55E" }}>
                    {liveRevenue > 0 ? fmtEuro(liveRevenue) : "—"}
                  </p>
                </div>
                <div className="w-px h-8 bg-white/[0.05] mb-0.5" />
                <div>
                  <p className="text-[9px] uppercase tracking-[0.1em] text-text-ghost mb-1">Pipeline</p>
                  <p className="text-[20px] font-mono font-semibold leading-none text-text-muted">
                    {pipeline > 0 ? fmtEuro(pipeline) : "—"}
                  </p>
                </div>
                {portfolio?.revenueAttributed && portfolio.revenueAttributed > 0 && (
                  <>
                    <div className="w-px h-8 bg-white/[0.05] mb-0.5" />
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.1em] text-text-ghost mb-1">Total Attributed</p>
                      <p className="text-[20px] font-mono font-semibold leading-none" style={{ color: unit.color }}>
                        {fmtEuro(portfolio.revenueAttributed)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ── Recent Wins ─────────────────────────────────────── */}
        {portfolio && portfolio.recentWins.length > 0 && (
          <section>
            <SectionLabel text="Recent Wins" countColor="#22C55E" count={portfolio.recentWins.length} />
            <div className="space-y-0">
              {portfolio.recentWins.map((win, i) => (
                <div key={i} className={cn("flex items-center gap-3 py-2.5", i < portfolio.recentWins.length - 1 && "border-b border-white/[0.03]")}>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-text-secondary leading-snug truncate">{win.title}</p>
                    <p className="text-[10px] text-text-ghost mt-0.5">{win.status.replace(/_/g, " ")}</p>
                  </div>
                  {win.estimatedRevenue && win.estimatedRevenue > 0 && (
                    <span className="text-[12px] font-mono text-[#22C55E] flex-shrink-0">
                      {fmtEuro(win.estimatedRevenue)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Recent Failures ─────────────────────────────────── */}
        {portfolio && portfolio.recentFailures.length > 0 && (
          <section>
            <SectionLabel text="Rejected Opportunities" countColor="#EF4444" count={portfolio.recentFailures.length} />
            <div className="space-y-0">
              {portfolio.recentFailures.map((fail, i) => (
                <div key={i} className={cn("flex items-center gap-3 py-2.5", i < portfolio.recentFailures.length - 1 && "border-b border-white/[0.03]")}>
                  <TrendingDown className="w-3.5 h-3.5 text-[#EF4444] flex-shrink-0" />
                  <p className="text-[13px] text-text-muted leading-snug truncate flex-1">{fail.title}</p>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444] flex-shrink-0">
                    Rejected
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-text-ghost mt-3 leading-relaxed">
              These are stored in team memory. The autonomous engine will not re-propose them.
            </p>
          </section>
        )}

        {/* ── Growth Recommendations ──────────────────────────── */}
        {growthRecs.length > 0 && (
          <section>
            <SectionLabel text="Growth Recommendations" />
            <div className="space-y-2">
              {growthRecs.map((rec, i) => (
                <div key={i} className="flex items-start gap-3 px-3 py-3 rounded-xl border border-white/[0.05] bg-white/[0.02]">
                  <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: unit.color }} />
                  <p className="text-[13px] text-text-secondary leading-snug">{rec}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── KPIs ────────────────────────────────────────────── */}
        <section>
          <SectionLabel text="Key Performance Indicators" />
          <div className="grid grid-cols-2 gap-2">
            {unit.kpis.map((kpi, i) => (
              <div key={i} className="px-3 py-2.5 rounded-xl border border-white/[0.04] bg-white/[0.02]">
                <p className="text-[12px] text-text-muted leading-snug">{kpi}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-text-ghost mt-2.5 leading-relaxed">
            <span className="text-text-muted font-medium">Approval boundary: </span>
            {unit.approvalBoundary}.
          </p>
        </section>

        {/* ── Pending Approvals ───────────────────────────────── */}
        <section>
          <SectionLabel
            text="Pending Decisions"
            count={data.approvals.length > 0 ? data.approvals.length : undefined}
            countColor="#EF4444"
          />
          {data.approvals.length === 0 ? (
            <p className="text-[13px] text-text-muted">No decisions waiting from this business unit.</p>
          ) : (
            <div className="space-y-2.5">
              {data.approvals.slice(0, 4).map(a => (
                <div key={a.id} className="flex items-center gap-3 py-2.5 border-b border-white/[0.03] last:border-0">
                  <div className={cn("w-[3px] h-8 rounded-full flex-shrink-0",
                    a.priority === "urgent" ? "bg-[#EF4444]" : "bg-[#F59E0B]")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-text-secondary leading-snug truncate">{a.title}</p>
                    <p className="text-[10px] text-text-ghost mt-0.5">
                      {a.decisionType?.replace(/_/g, " ")} · {timeAgo(a.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={onNavigateDecide}
                    className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-[11px] font-medium hover:bg-[#EF4444]/15 transition-all"
                  >
                    Review <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {data.approvals.length > 4 && (
                <button onClick={onNavigateDecide}
                  className="text-[11px] text-text-ghost hover:text-text-muted transition-colors flex items-center gap-1 pt-1">
                  +{data.approvals.length - 4} more in Decide <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </section>

        {/* ── Crypto: Trading Mode ────────────────────────────── */}
        {isCrypto && (
          <TradingModeSection
            mode={tradingMode}
            onModeChange={onTradingModeChange}
          />
        )}

      </div>
    </div>
  );
}

// ── OutputList ─────────────────────────────────────────────────────────

function OutputList({
  outputs, color, pendingOutputIds, onSendToDecide,
}: {
  outputs: WorkforceOutput[];
  color: string;
  pendingOutputIds?: Set<string>;
  onSendToDecide?: (output: WorkforceOutput) => void;
}) {
  const shown = outputs.slice(0, 6);
  return (
    <div>
      {shown.map((o, i) => {
        const statusColor =
          o.status === "completed" || o.status === "approved" ? "#22C55E" :
          o.status === "in_review" ? "#F59E0B" : "#6b7280";
        const StatusIcon =
          o.status === "completed" || o.status === "approved" ? CheckCircle2 :
          o.status === "in_review" ? Clock : Circle;
        const alreadyInDecide = pendingOutputIds?.has(o.id) ?? false;
        const canSend = !alreadyInDecide &&
          (o.status === "completed" || o.status === "approved") &&
          !!onSendToDecide;
        return (
          <div key={o.id} className={cn("flex items-start gap-3 py-3", i < shown.length - 1 && "border-b border-white/[0.03]")}>
            <StatusIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: statusColor }} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-text-secondary leading-snug truncate">{o.title}</p>
              <p className="text-[10px] text-text-ghost mt-0.5">
                {outputLabel(o.outputType)} · {timeAgo(o.createdAt)}
              </p>
            </div>
            {alreadyInDecide ? (
              <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded text-[#EF4444] bg-[#EF4444]/10">
                In Decide
              </span>
            ) : canSend ? (
              <button
                onClick={() => onSendToDecide(o)}
                className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-text-ghost border border-white/[0.06] hover:border-white/[0.12] hover:text-text-muted transition-all"
              >
                <Scale className="w-3 h-3" /> Decide
              </button>
            ) : null}
          </div>
        );
      })}
      {outputs.length > 6 && (
        <p className="text-[11px] text-text-ghost pt-2">+{outputs.length - 6} more outputs</p>
      )}
    </div>
  );
}

// ── TradingModeSection ─────────────────────────────────────────────────

function TradingModeSection({
  mode, onModeChange,
}: {
  mode: TradingMode;
  onModeChange: (m: TradingMode) => void;
}) {
  const [maxPosition, setMaxPosition] = useState("");
  const [dailyLimit,  setDailyLimit]  = useState("");
  const current = TRADING_MODES.find(m => m.id === mode)!;

  return (
    <section>
      <SectionLabel text="Trading Mode" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
        {TRADING_MODES.map(m => (
          <button
            key={m.id}
            onClick={() => !m.locked && onModeChange(m.id)}
            disabled={m.locked}
            className={cn(
              "flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-center transition-all",
              m.locked && "opacity-50 cursor-not-allowed",
              !m.locked && mode === m.id
                ? "border-[#00D4FF]/30 bg-[#00D4FF]/10"
                : !m.locked
                ? "border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.03]"
                : "border-white/[0.04]"
            )}
          >
            {m.locked ? (
              <Lock className="w-3.5 h-3.5 text-text-ghost" />
            ) : m.id === "research" ? (
              <FlaskConical className="w-3.5 h-3.5" style={{ color: mode === m.id ? "#00D4FF" : undefined }} />
            ) : m.id === "paper" ? (
              <Briefcase className="w-3.5 h-3.5" style={{ color: mode === m.id ? "#00D4FF" : undefined }} />
            ) : m.id === "approval" ? (
              <Scale className="w-3.5 h-3.5" style={{ color: mode === m.id ? "#00D4FF" : undefined }} />
            ) : (
              <Zap className="w-3.5 h-3.5 text-text-ghost" />
            )}
            <p className={cn("text-[10px] font-semibold", mode === m.id && !m.locked ? "text-[#00D4FF]" : "text-text-ghost")}>
              {m.label}
            </p>
          </button>
        ))}
      </div>

      <div className="px-4 py-3 rounded-xl border border-[#00D4FF]/15 bg-[#00D4FF]/05 mb-5">
        <p className="text-[12px] text-[#00D4FF] font-medium mb-0.5">{current.label} Mode</p>
        <p className="text-[12px] text-text-muted">{current.description}</p>
      </div>

      <div className="space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-ghost">Risk Controls</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-text-ghost uppercase tracking-wide mb-1.5">
              Max Position Size
            </label>
            <input
              type="text"
              value={maxPosition}
              onChange={e => setMaxPosition(e.target.value)}
              placeholder="e.g. €500"
              className="w-full bg-[#080d1a] border border-white/[0.08] rounded-xl px-3 py-2 text-[13px] text-text-primary placeholder:text-text-ghost focus:outline-none focus:border-[#00D4FF]/30 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] text-text-ghost uppercase tracking-wide mb-1.5">
              Daily Loss Limit
            </label>
            <input
              type="text"
              value={dailyLimit}
              onChange={e => setDailyLimit(e.target.value)}
              placeholder="e.g. €200"
              className="w-full bg-[#080d1a] border border-white/[0.08] rounded-xl px-3 py-2 text-[13px] text-text-primary placeholder:text-text-ghost focus:outline-none focus:border-[#00D4FF]/30 transition-colors"
            />
          </div>
        </div>
        <p className="text-[10px] text-text-ghost leading-relaxed">
          Risk controls apply to all trading modes except Research. Autonomous execution requires controls to be configured and remains locked until explicitly enabled.
        </p>
      </div>
    </section>
  );
}

// ── QuickDispatchModal ─────────────────────────────────────────────────

function QuickDispatchModal({
  team, unitName, unitColor, onClose, onDispatched,
}: {
  team: WorkforceTeam | null;
  unitName: string;
  unitColor: string;
  onClose: () => void;
  onDispatched: () => void;
}) {
  const [prompt,  setPrompt]  = useState("");
  const [loading, setLoading] = useState(false);

  async function dispatch() {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const body: Record<string, string> = { title: prompt.trim(), priority: "medium", senderType: "operator" };
      if (team?.id) body.teamId = team.id;
      const r = await fetch("/api/assignments", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-ghost mb-0.5">Dispatch work to</p>
            <h2 className="text-[15px] font-semibold text-text-primary">{unitName}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-ghost hover:text-text-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="h-px bg-white/[0.05] mb-4" />
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] text-text-ghost uppercase tracking-[0.08em] mb-2">
              What outcome do you need?
            </label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe the business outcome you want this unit to produce…"
              rows={4}
              className="w-full bg-[#080d1a] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-text-primary placeholder:text-text-ghost resize-none focus:outline-none focus:border-white/[0.15] transition-colors leading-relaxed"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={dispatch}
              disabled={!prompt.trim() || loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: `${unitColor}20`,
                border:     `1px solid ${unitColor}35`,
                color:      unitColor,
              }}
            >
              <Zap className="w-3.5 h-3.5" />
              {loading ? "Dispatching…" : "Dispatch"}
            </button>
            <button onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/[0.07] text-text-ghost text-[13px] hover:bg-white/[0.03] transition-all">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
