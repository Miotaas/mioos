"use client";

import { useEffect, useState } from "react";
import { MioProject, ProjectStatus, WorkforceOutput, Assignment, WorkforceApproval, RevenueEntry, MioGoal } from "@/types";
import { cn } from "@/lib/utils";
import {
  FolderOpen, AlertTriangle, TrendingUp, ArrowRight, Zap, FileOutput,
  ChevronRight, ClipboardList, MessageSquare,
} from "lucide-react";

function fmtTime(date: string): string {
  const d = new Date(date), now = new Date();
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMins < 1)    return "just now";
  if (diffMins < 60)   return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const STATUS_DOT: Record<ProjectStatus, string> = {
  active: "#22c55e",
  paused: "#f59e0b",
  blocked: "#ef4444",
  completed: "#6366f1",
  archived: "#64748b",
};

const PRIORITY_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  urgent: { bg: "bg-accent-red/10", text: "text-accent-red", label: "Urgent" },
  high:   { bg: "bg-accent-amber/10", text: "text-accent-amber", label: "High" },
  medium: { bg: "bg-accent-violet/10", text: "text-accent-violet", label: "Medium" },
  low:    { bg: "bg-white/[0.04]", text: "text-text-muted", label: "Low" },
};

const PROJECT_TYPE_BADGE: Record<string, { label: string; bg: string; text: string; border: string }> = {
  venture:    { label: "Venture",    bg: "bg-accent-green/10",  text: "text-accent-green",  border: "border-accent-green/20" },
  initiative: { label: "Initiative", bg: "bg-accent-violet/10", text: "text-accent-violet", border: "border-accent-violet/20" },
};

const STAGE_BADGE: Record<string, { label: string; text: string }> = {
  exploring:  { label: "Exploring",  text: "text-text-ghost" },
  validating: { label: "Validating", text: "text-accent-amber" },
  building:   { label: "Building",   text: "text-accent-cyan" },
  live:       { label: "Live",       text: "text-accent-green" },
  paused:     { label: "Paused",     text: "text-text-muted" },
  killed:     { label: "Killed",     text: "text-accent-red" },
};

function teamColor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("commerce") || n.includes("ecommerce") || n.includes("fulfillment")) return "#22C55E";
  if (n.includes("sales") || n.includes("outreach") || n.includes("automation") || n.includes("lead")) return "#8B5CF6";
  if (n.includes("youtube") || n.includes("content") || n.includes("video") || n.includes("media")) return "#F97316";
  if (n.includes("crypto") || n.includes("trading") || n.includes("finance") || n.includes("research") || n.includes("stock")) return "#00D4FF";
  return "#6366f1";
}

function inferOwningTeam(projectId: string, allAssignments: Assignment[]): string | null {
  const counts = new Map<string, number>();
  for (const a of allAssignments) {
    if (a.projectId === projectId && a.team?.name) {
      counts.set(a.team.name, (counts.get(a.team.name) ?? 0) + 1);
    }
  }
  if (counts.size === 0) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export function ProjectsView() {
  const [projects, setProjects]       = useState<MioProject[]>([]);
  const [outputs, setOutputs]         = useState<WorkforceOutput[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [approvals, setApprovals]     = useState<WorkforceApproval[]>([]);
  const [revenue, setRevenue]         = useState<RevenueEntry[]>([]);
  const [goals, setGoals]             = useState<MioGoal[]>([]);
  const [loading, setLoading]         = useState(true);
  const [healthMap, setHealthMap]     = useState<Map<string, { status: string; score: number; reasons: string[] }>>(new Map());
  const [statusFilter, setStatusFilter]   = useState<string>("all");
  const [typeFilter, setTypeFilter]       = useState<"all" | "venture" | "initiative">("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [detailTab, setDetailTab]     = useState<"assignments" | "outputs" | "revenue" | "goals">("assignments");

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then(r => r.json()).catch(() => []),
      fetch("/api/workforce/outputs").then(r => r.json()).catch(() => []),
      fetch("/api/assignments").then(r => r.json()).catch(() => []),
      fetch("/api/workforce-approvals").then(r => r.json()).catch(() => []),
      fetch("/api/revenue-entries").then(r => r.json()).catch(() => []),
      fetch("/api/goals").then(r => r.json()).catch(() => []),
    ]).then(([projs, outs, ass, app, rev, gl]) => {
      setProjects(Array.isArray(projs) ? projs : []);
      setOutputs(Array.isArray(outs) ? outs : []);
      setAssignments(Array.isArray(ass) ? ass : []);
      setApprovals(Array.isArray(app) ? app : []);
      setRevenue(Array.isArray(rev) ? rev : []);
      setGoals(Array.isArray(gl) ? gl : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/executive/health")
      .then(r => r.json())
      .then((data: { id: string; health: { status: string; score: number; reasons: string[] } }[]) => {
        if (Array.isArray(data)) {
          setHealthMap(new Map(data.map(p => [p.id, p.health])));
        }
      })
      .catch(() => {});
  }, []);

  const statuses = ["all", ...Array.from(new Set(projects.map((p) => p.status)))];
  const filtered = projects
    .filter(p => statusFilter === "all" || p.status === statusFilter)
    .filter(p => typeFilter === "all" || (p.projectType ?? "initiative") === typeFilter)
    .sort((a, b) => {
      const aIsVenture = (a.projectType ?? "initiative") === "venture" ? 0 : 1;
      const bIsVenture = (b.projectType ?? "initiative") === "venture" ? 0 : 1;
      return aIsVenture - bIsVenture;
    });

  const activeCount = projects.filter((p) => p.status === "active").length;
  const blockedCount = projects.filter((p) => p.blocker).length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-accent-violet" />
            Projects
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Ventures & Initiatives
            <span className="text-text-ghost mx-1.5">·</span>
            {activeCount} active
            {blockedCount > 0 && (
              <span className="text-accent-red ml-1.5">· {blockedCount} blocked</span>
            )}
          </p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2 px-6 py-2.5 border-b border-white/[0.06] overflow-x-auto">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-lg capitalize whitespace-nowrap transition-all",
              statusFilter === s
                ? "bg-accent-violet/15 text-accent-violet border border-accent-violet/25"
                : "text-text-muted hover:text-text-secondary hover:bg-white/[0.04]"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-2 px-6 py-2 border-b border-white/[0.06] overflow-x-auto">
        {(["all", "venture", "initiative"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              "text-xs px-3 py-1 rounded-lg capitalize whitespace-nowrap transition-all",
              typeFilter === t
                ? t === "all"
                  ? "bg-white/[0.08] text-text-secondary border border-white/[0.12]"
                  : t === "venture"
                  ? "bg-accent-green/15 text-accent-green border border-accent-green/25"
                  : "bg-accent-violet/15 text-accent-violet border border-accent-violet/25"
                : "text-text-muted hover:text-text-secondary hover:bg-white/[0.04]"
            )}
          >
            {t === "all" ? "All types" : PROJECT_TYPE_BADGE[t].label}
            {t !== "all" && (
              <span className="ml-1 opacity-60">
                {projects.filter(p => (p.projectType ?? "initiative") === t).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading && <div className="text-center py-12 text-text-muted">Loading projects...</div>}

        {!loading && projects.length === 0 && (
          <div className="text-center py-16">
            <FolderOpen className="w-10 h-10 text-text-ghost mx-auto mb-4" />
            <p className="text-sm text-text-secondary">No projects yet</p>
            <p className="text-xs text-text-muted mt-1">Strategic projects will appear here once created.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {filtered.map((project) => {
            const dotColor = STATUS_DOT[project.status] ?? "#64748b";
            const pb = PRIORITY_BADGE[project.priority ?? "medium"] ?? PRIORITY_BADGE.medium;
            const projectOutputs = outputs
              .filter(o => o.projectId === project.id)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const latestOutput = projectOutputs[0] ?? null;
            const projectAssignments = assignments.filter(a => a.projectId === project.id && a.status !== "archived");
            const owningTeam = inferOwningTeam(project.id, assignments);

            return (
              <div
                key={project.id}
                onClick={() => { setSelectedProjectId(prev => prev === project.id ? null : project.id); setDetailTab("assignments"); }}
                className={cn(
                  "p-5 rounded-xl border bg-surface-2 cursor-pointer transition-all",
                  selectedProjectId === project.id
                    ? "border-accent-violet/30"
                    : "border-white/[0.06] hover:border-accent-violet/20"
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-sm font-semibold text-text-primary leading-tight">{project.name}</p>
                    {project.description && (
                      <p className="text-xs text-text-muted mt-1 line-clamp-2 leading-relaxed">{project.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {owningTeam && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                        style={{ color: teamColor(owningTeam), backgroundColor: `${teamColor(owningTeam)}18`, border: `1px solid ${teamColor(owningTeam)}30` }}
                      >
                        {owningTeam}
                      </span>
                    )}
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: dotColor, boxShadow: `0 0 4px ${dotColor}80` }}
                    />
                    <span className="text-[10px] text-text-muted capitalize">{project.status}</span>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  {project.projectType && PROJECT_TYPE_BADGE[project.projectType] && (() => {
                    const tb = PROJECT_TYPE_BADGE[project.projectType!];
                    return (
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", tb.bg, tb.text, tb.border)}>
                        {tb.label}
                      </span>
                    );
                  })()}
                  {project.stage && STAGE_BADGE[project.stage] && (
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] font-medium", STAGE_BADGE[project.stage].text)}>
                      {STAGE_BADGE[project.stage].label}
                    </span>
                  )}
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", pb.bg, pb.text, "border-current/20")}>
                    {pb.label}
                  </span>
                  {healthMap.get(project.id) && (() => {
                    const h = healthMap.get(project.id)!;
                    const hCls =
                      h.status === "excellent" ? "text-accent-green border-accent-green/20 bg-accent-green/10" :
                      h.status === "good"      ? "text-[#00D4FF] border-[#00D4FF]/20 bg-[#00D4FF]/10" :
                      h.status === "warning"   ? "text-accent-amber border-accent-amber/20 bg-accent-amber/10" :
                      "text-accent-red border-accent-red/20 bg-accent-red/10";
                    return (
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium capitalize", hCls)}>
                        {h.status}
                      </span>
                    );
                  })()}
                  {(project.revenueCount ?? 0) > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/20 flex items-center gap-1">
                      <TrendingUp className="w-2.5 h-2.5" />
                      {project.revenueCount} revenue
                    </span>
                  )}
                  {(project.outputsCount ?? 0) > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" />
                      {project.outputsCount} outputs
                    </span>
                  )}
                  {projectAssignments.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-cyan/5 text-accent-cyan/70 border border-accent-cyan/10 flex items-center gap-1">
                      <ClipboardList className="w-2.5 h-2.5" />
                      {projectAssignments.length} assignment{projectAssignments.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {/* Blocker */}
                {project.blocker && (
                  <div className="flex items-start gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg bg-accent-red/5 border border-accent-red/15">
                    <AlertTriangle className="w-3 h-3 text-accent-red mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-accent-red/90 leading-snug">{project.blocker}</p>
                  </div>
                )}

                {/* Next action */}
                {project.nextAction && (
                  <div className="flex items-start gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <ArrowRight className="w-3 h-3 text-accent-violet mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-text-secondary leading-snug">{project.nextAction}</p>
                  </div>
                )}

                {/* Recent workforce activity (5F) */}
                {latestOutput && (
                  <div className="mt-1 pt-3 border-t border-white/[0.04]">
                    <p className="text-[9px] text-text-ghost uppercase tracking-[0.1em] mb-1.5">Recent activity</p>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full flex-shrink-0",
                        latestOutput.status === "completed" || latestOutput.status === "approved" ? "bg-accent-green" :
                        latestOutput.status === "in_progress" || latestOutput.status === "handed_off" ? "bg-[#00D4FF]" :
                        latestOutput.status === "in_review" ? "bg-accent-amber" : "bg-text-ghost"
                      )} />
                      <FileOutput className="w-3 h-3 text-text-ghost flex-shrink-0" />
                      <p className="text-[11px] text-text-secondary flex-1 truncate">{latestOutput.title}</p>
                      <span className={cn(
                        "text-[9px] px-1 py-0.5 rounded capitalize flex-shrink-0",
                        latestOutput.status === "completed" || latestOutput.status === "approved" ? "bg-accent-green/10 text-accent-green" :
                        latestOutput.status === "in_review" ? "bg-accent-amber/10 text-accent-amber" :
                        "bg-white/[0.04] text-text-ghost"
                      )}>
                        {latestOutput.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    {projectOutputs.length > 1 && (
                      <p className="text-[10px] text-text-ghost mt-1">
                        +{projectOutputs.length - 1} more output{projectOutputs.length - 1 !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 6F: Project Command Center panel */}
        {selectedProjectId && (() => {
          const project = projects.find(p => p.id === selectedProjectId);
          if (!project) return null;
          const pb = PRIORITY_BADGE[project.priority ?? "medium"] ?? PRIORITY_BADGE.medium;
          const projOutputs = outputs.filter(o => o.projectId === project.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          const projAssignments = assignments.filter(a => a.projectId === project.id && a.status !== "archived");
          const projRevenue = revenue.filter(r => r.projectId === project.id);
          const projGoals = goals.filter(g => g.projectId === project.id);
          const projApprovals = approvals.filter(a => a.projectId === project.id && a.status === "pending");
          const STATUS_DOT_A: Record<string, string> = { pending: "#64748b", active: "#10b981", review: "#f59e0b", completed: "#6366f1", archived: "#64748b" };
          const TABS = [
            { id: "assignments" as const, label: `Assignments (${projAssignments.length})` },
            { id: "outputs" as const,     label: `Outputs (${projOutputs.length})` },
            { id: "revenue" as const,     label: `Revenue (${projRevenue.length})` },
            { id: "goals" as const,       label: `Goals (${projGoals.length})` },
          ];
          return (
            <div className="mt-4 p-5 rounded-xl border border-accent-violet/20 bg-surface-2">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_DOT[project.status] ?? "#64748b" }} />
                    <h2 className="text-sm font-semibold text-text-primary">{project.name}</h2>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", pb.bg, pb.text, "border-current/20")}>{pb.label}</span>
                    {projApprovals.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-amber/10 text-accent-amber border border-accent-amber/20">
                        {projApprovals.length} approval{projApprovals.length !== 1 ? "s" : ""} pending
                      </span>
                    )}
                  </div>
                  {project.description && <p className="text-xs text-text-muted leading-relaxed">{project.description}</p>}
                </div>
                <button onClick={() => setSelectedProjectId(null)} className="text-text-ghost hover:text-text-muted transition-colors p-1 flex-shrink-0">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </button>
              </div>

              {/* Tab bar */}
              <div className="flex items-center gap-1 mb-3 overflow-x-auto">
                {TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setDetailTab(t.id)}
                    className={cn(
                      "text-[11px] px-3 py-1.5 rounded-lg whitespace-nowrap transition-all",
                      detailTab === t.id
                        ? "bg-accent-violet/15 text-accent-violet border border-accent-violet/25"
                        : "text-text-muted hover:text-text-secondary hover:bg-white/[0.04]"
                    )}
                  >{t.label}</button>
                ))}
              </div>

              {/* Tab content */}
              {detailTab === "assignments" && (
                <div className="space-y-1.5">
                  {projAssignments.length === 0 && <p className="text-xs text-text-ghost py-2">No assignments linked to this project.</p>}
                  {projAssignments.map(a => (
                    <div key={a.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_DOT_A[a.status] ?? "#64748b" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-text-secondary truncate">{a.title}</p>
                        {a.team && <p className="text-[10px] text-text-ghost">{a.team.name}</p>}
                      </div>
                      <span className="text-[10px] text-text-ghost capitalize flex-shrink-0">{a.status}</span>
                      {(a.messages?.length ?? 0) > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-text-ghost flex-shrink-0">
                          <MessageSquare className="w-2.5 h-2.5" />{a.messages!.length}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {detailTab === "outputs" && (
                <div className="space-y-1.5">
                  {projOutputs.length === 0 && <p className="text-xs text-text-ghost py-2">No workforce outputs linked to this project.</p>}
                  {projOutputs.map(o => (
                    <div key={o.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full flex-shrink-0",
                        o.status === "completed" || o.status === "approved" ? "bg-accent-green" :
                        o.status === "in_progress" || o.status === "handed_off" ? "bg-[#00D4FF]" :
                        o.status === "in_review" ? "bg-accent-amber" : "bg-text-ghost"
                      )} />
                      <FileOutput className="w-3 h-3 text-text-ghost flex-shrink-0" />
                      <p className="text-[12px] text-text-secondary flex-1 truncate">{o.title}</p>
                      <span className="text-[10px] text-text-ghost flex-shrink-0">{fmtTime(o.createdAt)}</span>
                      <span className={cn(
                        "text-[10px] px-1 py-0.5 rounded capitalize flex-shrink-0",
                        o.status === "completed" || o.status === "approved" ? "bg-accent-green/10 text-accent-green" :
                        o.status === "in_review" ? "bg-accent-amber/10 text-accent-amber" : "bg-white/[0.04] text-text-ghost"
                      )}>{o.status.replace(/_/g, " ")}</span>
                    </div>
                  ))}
                </div>
              )}

              {detailTab === "revenue" && (
                <div className="space-y-1.5">
                  {projRevenue.length === 0 && <p className="text-xs text-text-ghost py-2">No revenue entries linked to this project.</p>}
                  {projRevenue.map(r => (
                    <div key={r.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <TrendingUp className="w-3 h-3 text-accent-green flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-text-secondary truncate">{r.title}</p>
                        <p className="text-[10px] text-text-ghost capitalize">{r.revenueType} · {r.status.replace(/_/g, " ")}</p>
                      </div>
                      <span className="text-[12px] font-medium text-accent-green flex-shrink-0">€{r.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {projRevenue.length > 0 && (
                    <div className="mt-2 px-2.5 py-2 rounded-lg bg-accent-green/5 border border-accent-green/10 flex items-center justify-between">
                      <span className="text-[11px] text-text-muted">Total</span>
                      <span className="text-[13px] font-semibold text-accent-green">
                        €{projRevenue.reduce((s, r) => s + r.amount, 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {detailTab === "goals" && (
                <div className="space-y-1.5">
                  {projGoals.length === 0 && <p className="text-xs text-text-ghost py-2">No goals linked to this project.</p>}
                  {projGoals.map(g => (
                    <div key={g.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-text-secondary truncate">{g.title}</p>
                        <p className="text-[10px] text-text-ghost capitalize">{g.status}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="w-16 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full rounded-full bg-accent-purple" style={{ width: `${g.progress ?? 0}%` }} />
                        </div>
                        <span className="text-[10px] text-text-ghost">{g.progress ?? 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
