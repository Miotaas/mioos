"use client";

import { useEffect, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/Button";
import type { Agent, AgentRun, ParsedProposedAction } from "@/types";
import {
  FileBarChart, RefreshCw, ChevronLeft, ChevronRight,
  Clock, Zap, List, Lightbulb, TrendingUp, ShieldAlert,
  Star, Target, CheckCircle2,
} from "lucide-react";

// ── extended output shape ─────────────────────────────────────────
type BriefingOutput = {
  summary?: string;
  executiveSummary?: string;
  recommendations?: string[];
  insights?: string[];
  proposedActions?: ParsedProposedAction[];
  priorities?: string[];
  risks?: string[];
  opportunities?: string[];
};

type BriefingRun = AgentRun & { agentName: string };

// ── helpers ───────────────────────────────────────────────────────
function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString("en-GB", {
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDateShort(d: string): string {
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function parseBriefingOutput(raw: string | null): BriefingOutput | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (typeof p === "object" && p !== null) return p as BriefingOutput;
    return null;
  } catch {
    return null;
  }
}

function hasContent(out: BriefingOutput): boolean {
  return !!(
    out.summary || out.executiveSummary ||
    (out.recommendations?.length ?? 0) > 0 ||
    (out.insights?.length ?? 0) > 0 ||
    (out.proposedActions?.length ?? 0) > 0 ||
    (out.priorities?.length ?? 0) > 0 ||
    (out.risks?.length ?? 0) > 0 ||
    (out.opportunities?.length ?? 0) > 0
  );
}

const STATUS_COLOR: Record<string, string> = {
  completed: "#10b981",
  running:   "#06b6d4",
  pending:   "#f59e0b",
  failed:    "#ef4444",
};

// ── main component ────────────────────────────────────────────────
export function StrategicBriefingView() {
  const { showToast, setActiveView } = useAppStore();
  const [strategyAgents, setStrategyAgents] = useState<Agent[]>([]);
  const [briefings, setBriefings] = useState<BriefingRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [triggering, setTriggering] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const agents: Agent[] = await fetch("/api/agents").then(r => r.json()).catch(() => []);
      const list = Array.isArray(agents) ? agents : [];
      const strategies = list.filter(a => a.agentType === "strategy");
      setStrategyAgents(strategies);

      const runArrays = await Promise.all(
        strategies.map(a =>
          fetch(`/api/agents/${a.id}/runs`)
            .then(r => r.json())
            .then((runs: AgentRun[]) =>
              (Array.isArray(runs) ? runs : []).map(r => ({ ...r, agentName: a.name }))
            )
            .catch(() => [] as BriefingRun[])
        )
      );

      const all: BriefingRun[] = runArrays
        .flat()
        .filter(r => r.status === "completed" && r.output)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setBriefings(all);
      setCurrentIndex(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function triggerRun() {
    if (strategyAgents.length === 0) return;
    setTriggering(true);
    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: strategyAgents[0].id }),
      });
      if (!res.ok) throw new Error("Trigger failed");
      showToast("Strategy Agent triggered — results will appear in Run History");
      await load();
    } catch {
      showToast("Failed to trigger agent", "error");
    } finally {
      setTriggering(false);
    }
  }

  const current = briefings[currentIndex] ?? null;
  const parsed = current ? parseBriefingOutput(current.output) : null;
  const statusColor = current ? (STATUS_COLOR[current.status] ?? "#94a3b8") : "#94a3b8";

  return (
    <div className="h-full overflow-y-auto bg-void">
      <div className="max-w-[860px] mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-5 pb-20 md:pb-6">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium text-text-ghost uppercase tracking-widest mb-1">Agent OS · Intelligence</p>
            <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">
              Strategic <span className="text-accent-cyan">Briefing</span>
            </h1>
            <p className="text-xs text-text-muted mt-1.5">
              {loading
                ? "Loading briefings..."
                : briefings.length === 0
                  ? "No briefings generated yet."
                  : `${briefings.length} briefing${briefings.length !== 1 ? "s" : ""} · Showing ${currentIndex + 1} of ${briefings.length}`
              }
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-white/[0.08] text-text-muted hover:text-text-secondary text-xs transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              Refresh
            </button>
            {strategyAgents.length > 0 && (
              <Button variant="primary" size="sm" onClick={triggerRun} disabled={triggering}>
                <Zap className="w-3.5 h-3.5" />
                {triggering ? "Triggering…" : "Run Strategy Agent"}
              </Button>
            )}
          </div>
        </div>

        {/* ── Loading ─────────────────────────────────────────── */}
        {loading && (
          <div className="text-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin mx-auto mb-3" />
            <p className="text-xs text-text-muted">Loading briefings…</p>
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────── */}
        {!loading && briefings.length === 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-surface-1 py-16 flex flex-col items-center text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center mb-4">
              <FileBarChart className="w-7 h-7 text-accent-cyan opacity-60" />
            </div>
            <p className="text-sm font-medium text-text-secondary mb-1">No strategic briefing generated yet.</p>
            <p className="text-xs text-text-muted mb-6 max-w-sm">
              {strategyAgents.length === 0
                ? "No Strategy-type agents found. Create one in the Agent Registry first."
                : "Run the Daily Strategy Agent to generate your first briefing. Output will appear here once the run completes."
              }
            </p>
            {strategyAgents.length > 0 && (
              <Button variant="primary" size="sm" onClick={triggerRun} disabled={triggering}>
                <Zap className="w-3.5 h-3.5" />
                {triggering ? "Triggering…" : "Run Daily Strategy Agent"}
              </Button>
            )}
            {strategyAgents.length === 0 && (
              <button
                onClick={() => setActiveView("agents")}
                className="text-xs text-accent-cyan hover:underline"
              >
                Open Agent Registry →
              </button>
            )}
          </div>
        )}

        {/* ── Briefing content ─────────────────────────────────── */}
        {!loading && current && (
          <div className="space-y-4">

            {/* Meta + navigation bar */}
            <div className="rounded-xl border border-white/[0.06] bg-surface-1 px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center flex-shrink-0">
                  <FileBarChart className="w-4 h-4 text-accent-cyan" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{current.agentName}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Clock className="w-3 h-3 text-text-ghost flex-shrink-0" />
                    <p className="text-[10px] text-text-muted">
                      {fmtDateTime(current.completedAt ?? current.createdAt)}
                    </p>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                      style={{ color: statusColor, background: `${statusColor}18` }}
                    >
                      {current.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => setCurrentIndex(i => Math.min(briefings.length - 1, i + 1))}
                  disabled={currentIndex >= briefings.length - 1}
                  className="p-3 md:p-2 rounded-lg bg-surface-2 border border-white/[0.06] text-text-muted hover:text-text-secondary disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                  title="Older briefing"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] text-text-ghost tabular-nums w-12 text-center">
                  {currentIndex + 1} / {briefings.length}
                </span>
                <button
                  onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                  disabled={currentIndex <= 0}
                  className="p-3 md:p-2 rounded-lg bg-surface-2 border border-white/[0.06] text-text-muted hover:text-text-secondary disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                  title="Newer briefing"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Structured output */}
            {parsed && hasContent(parsed) ? (
              <>
                {/* Executive Summary */}
                {(parsed.executiveSummary || parsed.summary) && (
                  <BriefingSection
                    icon={<Star className="w-4 h-4 text-accent-amber" />}
                    title="Executive Summary"
                  >
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {parsed.executiveSummary ?? parsed.summary}
                    </p>
                  </BriefingSection>
                )}

                {/* Top Priorities */}
                {(parsed.priorities?.filter(Boolean).length ?? 0) > 0 && (
                  <BriefingSection
                    icon={<Target className="w-4 h-4 text-accent-red" />}
                    title="Top Priorities"
                  >
                    <ol className="space-y-2.5">
                      {parsed.priorities!.filter(Boolean).map((p, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold font-mono bg-accent-red/15 text-accent-red flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-sm text-text-secondary leading-relaxed">{p}</span>
                        </li>
                      ))}
                    </ol>
                  </BriefingSection>
                )}

                {/* Risks */}
                {(parsed.risks?.filter(Boolean).length ?? 0) > 0 && (
                  <BriefingSection
                    icon={<ShieldAlert className="w-4 h-4 text-accent-amber" />}
                    title="Risks"
                  >
                    <ul className="space-y-2.5">
                      {parsed.risks!.filter(Boolean).map((r, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-text-secondary">
                          <span className="text-accent-amber flex-shrink-0 mt-0.5">⚠</span>
                          <span className="leading-relaxed">{r}</span>
                        </li>
                      ))}
                    </ul>
                  </BriefingSection>
                )}

                {/* Opportunities */}
                {(parsed.opportunities?.filter(Boolean).length ?? 0) > 0 && (
                  <BriefingSection
                    icon={<TrendingUp className="w-4 h-4 text-accent-green" />}
                    title="Opportunities"
                  >
                    <ul className="space-y-2.5">
                      {parsed.opportunities!.filter(Boolean).map((o, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-text-secondary">
                          <span className="text-accent-green flex-shrink-0 mt-0.5">→</span>
                          <span className="leading-relaxed">{o}</span>
                        </li>
                      ))}
                    </ul>
                  </BriefingSection>
                )}

                {/* Recommendations */}
                {(parsed.recommendations?.filter(Boolean).length ?? 0) > 0 && (
                  <BriefingSection
                    icon={<Lightbulb className="w-4 h-4 text-accent-cyan" />}
                    title="Recommendations"
                  >
                    <ul className="space-y-2.5">
                      {parsed.recommendations!.filter(Boolean).map((r, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-text-secondary">
                          <span className="text-accent-cyan flex-shrink-0 mt-0.5">→</span>
                          <span className="leading-relaxed">{r}</span>
                        </li>
                      ))}
                    </ul>
                  </BriefingSection>
                )}

                {/* Insights */}
                {(parsed.insights?.filter(Boolean).length ?? 0) > 0 && (
                  <BriefingSection
                    icon={<List className="w-4 h-4 text-accent-violet" />}
                    title="Insights"
                  >
                    <div className="flex flex-wrap gap-2">
                      {parsed.insights!.filter(Boolean).map((ins, i) => (
                        <span
                          key={i}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-accent-violet/10 border border-accent-violet/20 text-accent-violet"
                        >
                          {ins}
                        </span>
                      ))}
                    </div>
                  </BriefingSection>
                )}

                {/* Proposed Actions */}
                {(parsed.proposedActions?.length ?? 0) > 0 && (
                  <BriefingSection
                    icon={<Zap className="w-4 h-4 text-accent-amber" />}
                    title={`Proposed Actions (${parsed.proposedActions!.length})`}
                  >
                    <div className="space-y-2">
                      {parsed.proposedActions!.map((action, i) => (
                        <div
                          key={i}
                          className="px-3 py-2.5 bg-surface-3 border border-accent-amber/15 rounded-lg"
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-amber/15 text-accent-amber font-medium font-mono">
                              {action.actionType}
                            </span>
                            {action.targetEntity && (
                              <span className="text-[10px] text-text-ghost">{action.targetEntity}</span>
                            )}
                          </div>
                          <p className="text-xs text-text-secondary">{action.description}</p>
                          {action.reason && (
                            <p className="text-[10px] text-text-muted mt-0.5">{action.reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </BriefingSection>
                )}
              </>
            ) : (
              // Raw output fallback
              <BriefingSection
                icon={<List className="w-4 h-4 text-text-muted" />}
                title="Output"
              >
                {current.output ? (
                  <pre className="text-xs text-text-secondary font-mono leading-relaxed whitespace-pre-wrap break-words max-h-[600px] overflow-y-auto">
                    {current.output}
                  </pre>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-text-muted py-2">
                    <CheckCircle2 className="w-4 h-4 text-accent-green flex-shrink-0" />
                    Run completed but no output was recorded.
                  </div>
                )}
              </BriefingSection>
            )}

            {/* Briefing history */}
            {briefings.length > 1 && (
              <div className="rounded-xl border border-white/[0.06] bg-surface-1 overflow-hidden">
                <div className="px-4 pt-3.5 pb-3 border-b border-white/[0.04]">
                  <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">
                    Briefing History
                  </span>
                </div>
                <div className="divide-y divide-white/[0.03]">
                  {briefings.map((b, i) => (
                    <button
                      key={b.id}
                      onClick={() => setCurrentIndex(i)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]",
                        i === currentIndex && "bg-accent-cyan/[0.04]"
                      )}
                    >
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full flex-shrink-0",
                        i === currentIndex ? "bg-accent-cyan" : "bg-text-ghost"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-xs font-medium truncate",
                          i === currentIndex ? "text-accent-cyan" : "text-text-secondary"
                        )}>
                          {b.agentName}
                        </p>
                        <p className="text-[10px] text-text-ghost">{fmtDateShort(b.completedAt ?? b.createdAt)}</p>
                      </div>
                      {i === 0 && (
                        <span className="text-[9px] text-accent-green font-medium flex-shrink-0">Latest</span>
                      )}
                      {i === currentIndex && i !== 0 && (
                        <span className="text-[9px] text-accent-cyan font-medium flex-shrink-0">Viewing</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────

function BriefingSection({ icon, title, children }: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-surface-1 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-3 border-b border-white/[0.04]">
        {icon}
        <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">
          {title}
        </span>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}
