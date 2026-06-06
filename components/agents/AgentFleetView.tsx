"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import type { AgentHealthRecord, FleetHealthSummary } from "@/types";
import {
  HeartPulse, Bot, CheckCircle2, AlertTriangle, XCircle,
  Clock, TrendingUp, Database, Wrench, Network, ShieldCheck,
  ArrowRight, RefreshCw,
} from "lucide-react";

// ── color maps ───────────────────────────────────────────────
const HEALTH_CFG = {
  healthy: { label: "Healthy",  color: "#10b981", bg: "#10b98115", border: "#10b98125", dot: "bg-accent-green" },
  warning: { label: "Warning",  color: "#f59e0b", bg: "#f59e0b15", border: "#f59e0b25", dot: "bg-accent-amber" },
  offline: { label: "Offline",  color: "#ef4444", bg: "#ef444415", border: "#ef444425", dot: "bg-accent-red"   },
} as const;

const PRESSURE_CFG = {
  low:    { label: "Low",    color: "#475569", bg: "#47556920" },
  medium: { label: "Medium", color: "#f59e0b", bg: "#f59e0b18" },
  high:   { label: "High",   color: "#ef4444", bg: "#ef444418" },
} as const;

const TYPE_COLOR: Record<string, string> = {
  strategy: "#6366f1", research: "#8b5cf6", lead_generation: "#3b82f6",
  outreach: "#06b6d4", project_management: "#10b981", custom: "#475569",
};

// ── helpers ──────────────────────────────────────────────────
function fmtRelative(date: string | null): string {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function fmtExact(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-GB", {
    day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

function ScoreRing({ value, size = 72 }: { value: number; size?: number }) {
  const r      = (size - 8) / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - value / 100);
  const color  = value >= 70 ? "#10b981" : value >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── sub-components ────────────────────────────────────────────
function SummaryCard({
  label, value, color, bg, border,
}: { label: string; value: number; color: string; bg: string; border: string }) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center rounded-xl py-4 px-2 border"
      style={{ background: bg, borderColor: border }}
    >
      <p className="text-3xl font-bold font-mono leading-none mb-1" style={{ color }}>{value}</p>
      <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
    </div>
  );
}

function RateBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 rounded-full bg-white/[0.05] overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-mono tabular-nums" style={{ color }}>{value}%</span>
    </div>
  );
}

function AgentCard({ record, onDetail }: { record: AgentHealthRecord; onDetail: () => void }) {
  const hCfg   = HEALTH_CFG[record.healthStatus];
  const pCfg   = PRESSURE_CFG[record.approvalPressure];
  const tColor = TYPE_COLOR[record.agentType] ?? "#475569";

  return (
    <div
      className="rounded-xl border bg-surface-1 p-4 flex flex-col gap-3 hover:border-white/[0.1] transition-all cursor-pointer group"
      style={{ borderColor: hCfg.border }}
      onClick={onDetail}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onDetail(); } }}
    >
      {/* Top row: status + name */}
      <div className="flex items-start gap-2.5">
        <div className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-1.5", hCfg.dot)} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-text-primary truncate group-hover:text-white transition-colors">{record.name}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-[9px] px-1.5 py-0.5 rounded font-medium capitalize" style={{ color: tColor, background: `${tColor}18` }}>
              {record.agentType.replace("_", " ")}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ color: hCfg.color, background: hCfg.bg }}>
              {hCfg.label}
            </span>
          </div>
        </div>
        <ArrowRight className="w-3 h-3 text-text-ghost opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
      </div>

      {/* Run stats */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-text-muted">Last run</span>
          <span className="text-[10px] text-text-secondary tabular-nums">{fmtRelative(record.lastRunAt)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-text-muted">Success rate</span>
          <span className="text-[10px] font-mono text-accent-green tabular-nums">{record.successRate}%</span>
        </div>
        {record.totalRuns > 0 && (
          <RateBar value={record.successRate} color="#10b981" />
        )}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-text-muted">Total runs</span>
          <span className="text-[10px] font-mono text-text-secondary tabular-nums">{record.totalRuns}</span>
        </div>
      </div>

      {/* Bottom row: approval pressure + counts */}
      <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ color: pCfg.color, background: pCfg.bg }}>
            {pCfg.label} pressure
          </span>
          {record.pendingApprovalCount > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-amber/15 text-accent-amber font-mono">
              {record.pendingApprovalCount} pending
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-text-ghost">
          {record.memoryCount > 0   && <span className="text-[9px] font-mono">{record.memoryCount}m</span>}
          {record.toolCount > 0     && <span className="text-[9px] font-mono">{record.toolCount}t</span>}
          {record.workflowCount > 0 && <span className="text-[9px] font-mono">{record.workflowCount}w</span>}
        </div>
      </div>
    </div>
  );
}

// ── main view ─────────────────────────────────────────────────
export function AgentFleetView() {
  const { setActiveView } = useAppStore();
  const [agents,  setAgents]  = useState<AgentHealthRecord[]>([]);
  const [summary, setSummary] = useState<FleetHealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<"all" | "healthy" | "warning" | "offline">("all");

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch("/api/agents/fleet");
      const data = await res.json();
      setAgents(Array.isArray(data.agents)   ? data.agents   : []);
      setSummary(data.summary ?? null);
    } catch {
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = agents.filter(a => filter === "all" || a.healthStatus === filter);
  const scoreColor = !summary ? "#475569"
    : summary.fleetHealthScore >= 70 ? "#10b981"
    : summary.fleetHealthScore >= 45 ? "#f59e0b"
    : "#ef4444";

  return (
    <div className="h-full overflow-y-auto bg-void">
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-5 pb-20 md:pb-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium text-text-ghost uppercase tracking-widest mb-1">
              MioOS · Agent OS
            </p>
            <h1 className="text-[22px] font-semibold text-text-primary tracking-tight leading-none">
              Agent Fleet <span className="text-accent-cyan">Health</span>
            </h1>
            <p className="text-sm text-text-muted mt-1.5">
              {loading
                ? "Loading fleet data…"
                : summary
                  ? `${summary.total} agent${summary.total !== 1 ? "s" : ""} · ${summary.healthy} healthy · ${summary.warning} warning · ${summary.offline} offline`
                  : "No agents configured."
              }
            </p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-text-muted hover:text-text-secondary text-xs transition-all flex-shrink-0"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>

        {/* Score + Summary row */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Fleet Health Score */}
            <div className="rounded-xl border border-white/[0.06] bg-surface-1 p-4 flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <ScoreRing value={summary.fleetHealthScore} size={64} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-bold font-mono" style={{ color: scoreColor }}>
                    {summary.fleetHealthScore}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary leading-none mb-1">
                  {summary.fleetHealthScore >= 70 ? "Fleet healthy"
                    : summary.fleetHealthScore >= 45 ? "Needs attention"
                    : "Fleet at risk"}
                </p>
                <p className="text-[10px] text-text-muted">Fleet Health Score</p>
              </div>
            </div>

            <SummaryCard
              label="Healthy"
              value={summary.healthy}
              color="#10b981"
              bg="#10b98110"
              border="#10b98125"
            />
            <SummaryCard
              label="Warning"
              value={summary.warning}
              color="#f59e0b"
              bg="#f59e0b10"
              border="#f59e0b25"
            />
            <SummaryCard
              label="Offline"
              value={summary.offline}
              color="#ef4444"
              bg="#ef444410"
              border="#ef444425"
            />
          </div>
        )}

        {/* Filter bar */}
        {agents.length > 0 && (
          <div className="flex items-center gap-1.5">
            <HeartPulse className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
            {(["all", "healthy", "warning", "offline"] as const).map((f) => {
              const count = f === "all" ? agents.length : agents.filter(a => a.healthStatus === f).length;
              const cfg   = f === "all" ? null : HEALTH_CFG[f];
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "text-xs px-2.5 py-1.5 rounded-lg border capitalize transition-all",
                    filter === f
                      ? "border-white/[0.12] text-text-primary bg-white/[0.05]"
                      : "border-white/[0.04] text-text-muted hover:text-text-secondary",
                  )}
                  style={filter === f && cfg ? { borderColor: `${cfg.color}40`, color: cfg.color } : {}}
                >
                  {f === "all" ? `All (${count})` : `${f} (${count})`}
                </button>
              );
            })}
          </div>
        )}

        {/* Empty states */}
        {loading && (
          <div className="text-center py-16">
            <HeartPulse className="w-8 h-8 mx-auto mb-3 text-text-ghost animate-pulse" />
            <p className="text-sm text-text-muted">Loading fleet health data…</p>
          </div>
        )}

        {!loading && agents.length === 0 && (
          <div className="text-center py-16">
            <Bot className="w-8 h-8 mx-auto mb-3 text-text-ghost" />
            <p className="text-sm text-text-muted">No agents configured yet.</p>
            <button onClick={() => setActiveView("agent-registry")} className="text-xs text-accent-cyan mt-2 hover:underline">
              Create your first agent
            </button>
          </div>
        )}

        {!loading && agents.length > 0 && filtered.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-accent-green" />
            <p className="text-sm text-text-muted">No {filter} agents.</p>
          </div>
        )}

        {/* Agent grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {filtered.map((record) => (
              <AgentCard
                key={record.id}
                record={record}
                onDetail={() => setActiveView("agent-registry")}
              />
            ))}
          </div>
        )}

        {/* Legend */}
        {!loading && agents.length > 0 && (
          <div className="flex items-start gap-6 px-4 py-3.5 rounded-xl bg-surface-1 border border-white/[0.06]">
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider flex-shrink-0 mt-0.5">Legend</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2 flex-1">
              {(["healthy", "warning", "offline"] as const).map((h) => {
                const cfg = HEALTH_CFG[h];
                const rule = h === "healthy"
                  ? "Active · last run ≤24 h · failure rate ≤20 %"
                  : h === "warning"
                    ? "Last run >24 h or failure rate >20 %"
                    : "Disabled, or no successful run in 7 days";
                return (
                  <div key={h} className="flex items-start gap-2">
                    <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1", cfg.dot)} />
                    <div>
                      <p className="text-[10px] font-medium" style={{ color: cfg.color }}>{cfg.label}</p>
                      <p className="text-[9px] text-text-ghost leading-relaxed">{rule}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
