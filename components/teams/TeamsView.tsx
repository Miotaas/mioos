"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { WorkforceTeam, Assignment, WorkforceOutput, MioProject } from "@/types";
import {
  ShoppingBag, Search, UserCheck, Megaphone, FileText,
  Settings2, Headphones, Code2, Crown, Loader2, Send,
} from "lucide-react";

// ── Department config (local copy — do NOT import from WorkforceView) ──────────

const DEPT_CONFIG: Record<string, { label: string; color: string }> = {
  commerce:    { label: "Commerce",    color: "#10b981" },
  research:    { label: "Research",    color: "#6366f1" },
  sales:       { label: "Sales",       color: "#00D4FF" },
  marketing:   { label: "Marketing",   color: "#f59e0b" },
  content:     { label: "Content",     color: "#8b5cf6" },
  operations:  { label: "Operations",  color: "#94a3b8" },
  support:     { label: "Support",     color: "#06b6d4" },
  development: { label: "Development", color: "#a78bfa" },
  executive:   { label: "Executive",   color: "#fbbf24" },
};

const DEPT_ICONS: Record<string, React.ElementType> = {
  commerce:    ShoppingBag,
  research:    Search,
  sales:       UserCheck,
  marketing:   Megaphone,
  content:     FileText,
  operations:  Settings2,
  support:     Headphones,
  development: Code2,
  executive:   Crown,
};

// ── Humanise output types ────────────────────────────────────────────────────

function humaniseOutputType(raw: string): string {
  const map: Record<string, string> = {
    research:            "Research",
    product_candidate:   "Product candidate",
    prospect:            "Prospect",
    campaign:            "Campaign",
    content:             "Content",
    automation:          "Automation",
    tool:                "Tool",
    mvp:                 "MVP",
    support_insight:     "Support insight",
    process_improvement: "Process improvement",
    revenue_opportunity: "Revenue opportunity",
    approval_request:    "Approval request",
    briefing_note:       "Briefing note",
  };
  return map[raw] ?? raw.replace(/_/g, " ");
}

// ── Time helper ───────────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMins < 1)    return "just now";
  if (diffMins < 60)   return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ── Status dot colours for assignments ───────────────────────────────────────

const ASSIGNMENT_STATUS_COLOR: Record<string, string> = {
  pending:   "#64748b",
  active:    "#10b981",
  review:    "#f59e0b",
  completed: "#6366f1",
  archived:  "#64748b",
};

// ── Tab type ─────────────────────────────────────────────────────────────────

type Tab = "active" | "dispatch" | "discoveries";

// ── Component ────────────────────────────────────────────────────────────────

export function TeamsView() {
  const [tab, setTab] = useState<Tab>("active");

  // Shared data
  const [teams, setTeams]         = useState<WorkforceTeam[]>([]);
  const [assignments, setAssign]  = useState<Assignment[]>([]);
  const [projects, setProjects]   = useState<MioProject[]>([]);
  const [outputs, setOutputs]     = useState<WorkforceOutput[]>([]);
  const [loading, setLoading]     = useState(true);

  // Dispatch form state
  const [dispatchText, setDispatchText]   = useState("");
  const [dispatchTeam, setDispatchTeam]   = useState("");
  const [dispatchProject, setDispatchProject] = useState("");
  const [dispatching, setDispatching]     = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/workforce/teams").then(r => r.json()).catch(() => []),
      fetch("/api/assignments").then(r => r.json()).catch(() => []),
      fetch("/api/projects").then(r => r.json()).catch(() => []),
      fetch("/api/workforce/outputs").then(r => r.json()).catch(() => []),
    ]).then(([tm, ass, projs, outs]) => {
      setTeams(Array.isArray(tm) ? tm : []);
      setAssign(Array.isArray(ass) ? ass : []);
      setProjects(Array.isArray(projs) ? projs : []);
      setOutputs(Array.isArray(outs) ? outs : []);
      setLoading(false);
    });
  }, []);

  // ── Derived ──────────────────────────────────────────────────────

  const activeTeams = teams; // show all but visually indicate inactive

  const discoveries = outputs
    .filter(o => o.status === "completed" || o.status === "approved")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);

  // Auto-dismiss dispatch success banner
  useEffect(() => {
    if (!dispatchSuccess) return;
    const t = setTimeout(() => setDispatchSuccess(false), 3000);
    return () => clearTimeout(t);
  }, [dispatchSuccess]);

  // ── Dispatch submit ───────────────────────────────────────────────

  async function handleDispatch() {
    if (!dispatchText.trim()) return;
    setDispatching(true);
    setDispatchError(null);
    try {
      const body: Record<string, unknown> = {
        title: dispatchText.trim(),
        priority: "medium",
      };
      if (dispatchTeam)    body.teamId    = dispatchTeam;
      if (dispatchProject) body.projectId = dispatchProject;

      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to dispatch");

      // Refresh assignments
      const updated = await fetch("/api/assignments").then(r => r.json()).catch(() => []);
      if (Array.isArray(updated)) setAssign(updated);

      setDispatchText("");
      setDispatchTeam("");
      setDispatchProject("");
      setDispatchSuccess(true);
    } catch {
      setDispatchError("Something went wrong. Please try again.");
    } finally {
      setDispatching(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="h-full overflow-y-auto bg-[#08101e]">
      <div className="max-w-[1100px] mx-auto px-5 md:px-10 py-8 md:py-12 pb-28 md:pb-12">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] text-text-ghost font-medium tracking-[0.12em] uppercase mb-2">
            Company
          </p>
          <h1 className="text-[32px] md:text-[40px] font-semibold text-text-primary tracking-tight leading-tight mb-2">
            Teams
          </h1>
          <p className="text-[15px] text-text-secondary">
            {loading
              ? "Loading teams…"
              : `${teams.filter(t => t.status === "active").length} active · ${assignments.filter(a => ["pending","active","review"].includes(a.status)).length} assignments in progress`
            }
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8">
          {(["active", "dispatch", "discoveries"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[13px] font-medium transition-all",
                tab === t
                  ? "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/25"
                  : "text-text-ghost hover:text-text-secondary border border-transparent"
              )}
            >
              {t === "active" ? "Active Work" : t === "dispatch" ? "Dispatch" : "Discoveries"}
            </button>
          ))}
        </div>

        {/* ── Tab: Active Work ─────────────────────────────────────── */}
        {tab === "active" && (
          <ActiveWorkTab
            teams={activeTeams}
            assignments={assignments}
            loading={loading}
          />
        )}

        {/* ── Tab: Dispatch ────────────────────────────────────────── */}
        {tab === "dispatch" && (
          <DispatchTab
            teams={teams}
            projects={projects}
            dispatchText={dispatchText}
            dispatchTeam={dispatchTeam}
            dispatchProject={dispatchProject}
            dispatching={dispatching}
            dispatchSuccess={dispatchSuccess}
            dispatchError={dispatchError}
            onTextChange={setDispatchText}
            onTeamChange={setDispatchTeam}
            onProjectChange={setDispatchProject}
            onSubmit={handleDispatch}
          />
        )}

        {/* ── Tab: Discoveries ─────────────────────────────────────── */}
        {tab === "discoveries" && (
          <DiscoveriesTab
            outputs={discoveries}
            loading={loading}
          />
        )}

      </div>
    </div>
  );
}

// ── Active Work Tab ───────────────────────────────────────────────────────────

function ActiveWorkTab({
  teams,
  assignments,
  loading,
}: {
  teams: WorkforceTeam[];
  assignments: Assignment[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-text-ghost py-12 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-[14px]">Loading teams…</span>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-[15px] text-text-muted">No active teams</p>
        <p className="text-[13px] text-text-ghost mt-1">Teams will appear here once configured.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {teams.map(team => {
        const dept = DEPT_CONFIG[team.departmentType] ?? { label: team.name, color: "#64748b" };
        const Icon = DEPT_ICONS[team.departmentType] ?? Settings2;
        const isActive = team.status === "active";

        const teamAssignments = assignments.filter(
          a => a.teamId === team.id && ["pending", "active", "review"].includes(a.status)
        );
        const shown = teamAssignments.slice(0, 3);
        const overflow = teamAssignments.length - shown.length;

        return (
          <div
            key={team.id}
            className={cn(
              "rounded-2xl border bg-[#0d1220] p-5 transition-colors",
              isActive ? "border-white/[0.05]" : "border-white/[0.03] opacity-60"
            )}
          >
            {/* Team header */}
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  backgroundColor: `${dept.color}18`,
                  border: `1px solid ${dept.color}30`,
                }}
              >
                <Icon className="w-4 h-4" style={{ color: dept.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-[14px] font-semibold text-text-primary truncate">
                    {team.name}
                  </h3>
                  {isActive && (
                    <span className="flex items-center gap-1 text-[10px] text-accent-green font-medium flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-green/70" />
                      Active
                    </span>
                  )}
                  {!isActive && (
                    <span className="text-[10px] text-text-ghost flex-shrink-0 italic">Idle</span>
                  )}
                </div>
                <p className="text-[12px] text-text-muted leading-relaxed">
                  {team.currentFocus ?? "Idle — no active focus"}
                </p>
              </div>
            </div>

            {/* Active assignments */}
            {shown.length > 0 ? (
              <div className="space-y-1.5 mt-3">
                {shown.map(a => (
                  <div key={a.id} className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: ASSIGNMENT_STATUS_COLOR[a.status] ?? "#64748b" }}
                    />
                    <p className="text-[12px] text-text-secondary flex-1 truncate">{a.title}</p>
                    <span className="text-[10px] text-text-ghost capitalize flex-shrink-0">{a.status}</span>
                  </div>
                ))}
                {overflow > 0 && (
                  <p className="text-[11px] text-text-ghost pl-3.5">+{overflow} more</p>
                )}
              </div>
            ) : (
              <p className="text-[12px] text-text-ghost mt-3 italic">No active assignments</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Dispatch Tab ──────────────────────────────────────────────────────────────

function DispatchTab({
  teams,
  projects,
  dispatchText,
  dispatchTeam,
  dispatchProject,
  dispatching,
  dispatchSuccess,
  dispatchError,
  onTextChange,
  onTeamChange,
  onProjectChange,
  onSubmit,
}: {
  teams: WorkforceTeam[];
  projects: MioProject[];
  dispatchText: string;
  dispatchTeam: string;
  dispatchProject: string;
  dispatching: boolean;
  dispatchSuccess: boolean;
  dispatchError: string | null;
  onTextChange: (v: string) => void;
  onTeamChange: (v: string) => void;
  onProjectChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="max-w-[640px]">
      <div className="rounded-2xl border border-white/[0.05] bg-[#0d1220] p-6">
        <h2 className="text-[16px] font-semibold text-text-primary mb-1">Dispatch work to a team</h2>
        <p className="text-[13px] text-text-muted mb-5">
          Describe what you need. A team will pick it up and get started.
        </p>

        {/* What do you need */}
        <div className="mb-4">
          <label className="block text-[11px] text-text-ghost uppercase tracking-[0.1em] mb-2">
            What do you need?
          </label>
          <textarea
            value={dispatchText}
            onChange={e => onTextChange(e.target.value)}
            placeholder="e.g. Research top 5 competitors for Mail Co-Pilot"
            rows={4}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-text-primary placeholder:text-text-ghost outline-none focus:border-accent-cyan/30 transition-colors resize-none leading-relaxed"
          />
        </div>

        {/* Team selector */}
        <div className="mb-4">
          <label className="block text-[11px] text-text-ghost uppercase tracking-[0.1em] mb-2">
            Team (optional)
          </label>
          <select
            value={dispatchTeam}
            onChange={e => onTeamChange(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-[13px] text-text-secondary outline-none focus:border-accent-cyan/30 transition-colors appearance-none"
          >
            <option value="">Auto-route</option>
            {teams.map(t => {
              const dept = DEPT_CONFIG[t.departmentType];
              return (
                <option key={t.id} value={t.id}>
                  {t.name}{dept ? ` (${dept.label})` : ""}
                </option>
              );
            })}
          </select>
        </div>

        {/* Project selector */}
        <div className="mb-6">
          <label className="block text-[11px] text-text-ghost uppercase tracking-[0.1em] mb-2">
            Project (optional)
          </label>
          <select
            value={dispatchProject}
            onChange={e => onProjectChange(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-[13px] text-text-secondary outline-none focus:border-accent-cyan/30 transition-colors appearance-none"
          >
            <option value="">None</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Error */}
        {dispatchError && (
          <p className="text-[12px] text-accent-red mb-4">{dispatchError}</p>
        )}

        {/* Success */}
        {dispatchSuccess && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl bg-accent-green/[0.08] border border-accent-green/20">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green flex-shrink-0" />
            <p className="text-[13px] text-accent-green font-medium">Work dispatched</p>
          </div>
        )}

        {/* Submit */}
        <button
          disabled={!dispatchText.trim() || dispatching}
          onClick={onSubmit}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/25 text-[13px] font-medium hover:bg-accent-cyan/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {dispatching ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Dispatching…
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              Dispatch
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Discoveries Tab ───────────────────────────────────────────────────────────

function DiscoveriesTab({
  outputs,
  loading,
}: {
  outputs: WorkforceOutput[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-text-ghost py-12 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-[14px]">Loading discoveries…</span>
      </div>
    );
  }

  if (outputs.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-[15px] text-text-muted">No discoveries yet.</p>
        <p className="text-[13px] text-text-ghost mt-1">Teams will surface findings here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.05] bg-[#0d1220] overflow-hidden">
      <div className="divide-y divide-white/[0.03]">
        {outputs.map(output => {
          const teamDept = output.team?.departmentType ?? "";
          const dept = DEPT_CONFIG[teamDept];
          const color = dept?.color ?? "#64748b";

          return (
            <div key={output.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.015] transition-colors">
              {/* Status dot */}
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: output.status === "approved" ? "#10b981" : "#6366f1",
                }}
              />

              {/* Team name */}
              <div
                className="text-[11px] font-medium px-2 py-0.5 rounded flex-shrink-0"
                style={{
                  backgroundColor: `${color}18`,
                  color,
                  border: `1px solid ${color}30`,
                }}
              >
                {output.team?.name ?? "Team"}
              </div>

              {/* Output title */}
              <p className="text-[13px] text-text-secondary flex-1 truncate">
                {output.title}
              </p>

              {/* Output type */}
              <span className="text-[11px] text-text-ghost flex-shrink-0 hidden sm:block">
                {humaniseOutputType(output.outputType)}
              </span>

              {/* Timestamp */}
              <span className="text-[11px] text-text-ghost flex-shrink-0 tabular-nums">
                {fmtTime(output.createdAt)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
