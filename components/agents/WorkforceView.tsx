"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { Agent, WorkforceTeam, WorkforceApproval, MioProject, MioGoal, RevenueEntry, Assignment, WorkforceOutput } from "@/types";
import {
  ShoppingBag, Search, UserCheck, Megaphone, FileText,
  Settings2, Headphones, Code2, ChevronRight, ArrowRight,
  Crown, GitBranch, Plus, MessageSquare, Send, Eye, Loader2, Zap,
} from "lucide-react";
import { OutputViewer } from "@/components/workforce/OutputViewer";

const DEPARTMENTS = [
  {
    id: "commerce",
    label: "Commerce Team",
    types: ["digital_commerce", "fulfillment"],
    icon: ShoppingBag,
    color: "#10b981",
    description: "Sources and validates product and service opportunities.",
  },
  {
    id: "research",
    label: "Research Team",
    types: ["research"],
    icon: Search,
    color: "#6366f1",
    description: "Discovers opportunities, markets and business ideas.",
  },
  {
    id: "sales",
    label: "Sales Team",
    types: ["sales", "lead_generation", "outreach"],
    icon: UserCheck,
    color: "#00D4FF",
    description: "Converts validated opportunities into customers.",
  },
  {
    id: "marketing",
    label: "Marketing Team",
    types: ["ads"],
    icon: Megaphone,
    color: "#f59e0b",
    description: "Creates demand and market awareness.",
  },
  {
    id: "content",
    label: "Content Team",
    types: ["content", "writing"],
    icon: FileText,
    color: "#8b5cf6",
    description: "Produces assets that support growth.",
  },
  {
    id: "operations",
    label: "Operations Team",
    types: ["strategy", "project_management", "custom"],
    icon: Settings2,
    color: "#94a3b8",
    description: "Delivers and improves execution.",
  },
  {
    id: "support",
    label: "Support Team",
    types: ["support"],
    icon: Headphones,
    color: "#06b6d4",
    description: "Resolves issues and improves customer experience.",
  },
  {
    id: "development",
    label: "Development Team",
    types: ["development", "dev", "engineering"],
    icon: Code2,
    color: "#a78bfa",
    description: "Builds products, automations and solutions.",
  },
  {
    id: "executive",
    label: "Executive",
    types: ["ceo"],
    icon: Crown,
    color: "#fbbf24",
    description: "Allocates capital, priorities and attention.",
  },
] as const;

function fmtTime(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMins < 1)    return "just now";
  if (diffMins < 60)   return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function describeOutcome(status: string, deptId: string): string {
  if (status === "running") {
    if (deptId === "sales")      return "Scanning for new prospects";
    if (deptId === "research")   return "Conducting market research";
    if (deptId === "commerce")   return "Researching product opportunities";
    if (deptId === "marketing")  return "Drafting campaign strategy";
    if (deptId === "executive")  return "Reviewing strategic goals";
    return "Working on a task";
  }
  if (status === "completed") {
    if (deptId === "sales")       return "Generated new prospect leads";
    if (deptId === "research")    return "Delivered market intelligence";
    if (deptId === "commerce")    return "Validated product opportunity";
    if (deptId === "marketing")   return "Created campaign draft";
    if (deptId === "content")     return "Published content draft";
    if (deptId === "development") return "Delivered a build";
    if (deptId === "executive")   return "Updated strategic brief";
    return "Completed task";
  }
  if (status === "failed") return "Encountered an error";
  return "Task scheduled";
}

export function WorkforceView() {
  const { setActiveView } = useAppStore();
  const [agents, setAgents]               = useState<Agent[]>([]);
  const [teams, setTeams]                 = useState<WorkforceTeam[]>([]);
  const [projects, setProjects]           = useState<MioProject[]>([]);
  const [goals, setGoals]                 = useState<MioGoal[]>([]);
  const [revenueEntries, setRevEntries]   = useState<RevenueEntry[]>([]);
  const [wfApprovalsList, setWfApprovals] = useState<WorkforceApproval[]>([]);
  const [pendingApprovals, setPending]    = useState(0);
  const [assignments, setAssignments]           = useState<Assignment[]>([]);
  const [selectedDeptId, setSelectedDeptId]     = useState<string | null>(null);
  const [selectedAssId, setSelectedAssId]       = useState<string | null>(null);
  const [showNewAssignment, setShowNewAssign]   = useState(false);
  const [newAssignTitle, setNewAssignTitle]     = useState("");
  const [newAssignDesc, setNewAssignDesc]       = useState("");
  const [newAssignPriority, setNewAssignPriority] = useState("medium");
  const [chatInput, setChatInput]               = useState("");
  const [submitting, setSubmitting]             = useState(false);
  const [loading, setLoading]                   = useState(true);
  const [viewingOutput, setViewingOutput]       = useState<WorkforceOutput | null>(null);
  const [executingAssId, setExecutingAssId]     = useState<string | null>(null);
  const [execStep, setExecStep]                 = useState(0);
  const [wfPerf, setWfPerf] = useState<{
    totalActiveAssignments: number;
    completedThisWeek: number;
    outputsThisWeek: number;
    pendingApprovals: number;
    teams: { teamId: string; teamName: string; departmentType: string; completedThisWeek: number; completedThisMonth: number; outputsThisWeek: number; pendingApprovals: number }[];
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/agents").then(r => r.json()).catch(() => []),
      fetch("/api/approvals").then(r => r.json()).catch(() => []),
      fetch("/api/workforce/teams").then(r => r.json()).catch(() => []),
      fetch("/api/workforce-approvals?status=pending").then(r => r.json()).catch(() => []),
      fetch("/api/projects").then(r => r.json()).catch(() => []),
      fetch("/api/goals").then(r => r.json()).catch(() => []),
      fetch("/api/revenue-entries").then(r => r.json()).catch(() => []),
      fetch("/api/assignments").then(r => r.json()).catch(() => []),
    ]).then(([ag, ap, tm, wap, projs, gl, rev, ass]) => {
      setAgents(Array.isArray(ag) ? ag : []);
      setTeams(Array.isArray(tm) ? tm : []);
      setProjects(Array.isArray(projs) ? projs : []);
      setGoals(Array.isArray(gl) ? gl : []);
      setRevEntries(Array.isArray(rev) ? rev : []);
      setAssignments(Array.isArray(ass) ? ass : []);
      const wfList = Array.isArray(wap) ? wap : [];
      setWfApprovals(wfList);
      const agentPending = Array.isArray(ap)
        ? ap.filter((a: { status: string }) => a.status === "pending").length
        : 0;
      setPending(agentPending + wfList.length);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetch("/api/executive/workforce")
      .then(r => r.json())
      .then(d => { if (d && !d.error) setWfPerf(d); })
      .catch(() => {});
  }, []);

  // Advance fake execution progress steps while an assignment is executing
  useEffect(() => {
    if (!executingAssId) { setExecStep(0); return; }
    const steps = 4;
    if (execStep >= steps - 1) return;
    const t = setTimeout(() => setExecStep(s => s + 1), 700);
    return () => clearTimeout(t);
  }, [executingAssId, execStep]);

  const activeAgents = agents.filter(a => a.status === "active").length;
  const runningNow   = agents.filter(a => a.runs?.some(r => r.status === "running")).length;
  const totalRuns    = agents.reduce((s, a) => s + (a.runs?.length ?? 0), 0);

  return (
    <>
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-5 md:px-10 py-8 md:py-12 pb-28 md:pb-12">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] text-text-ghost font-medium tracking-[0.12em] uppercase mb-2">
            Company
          </p>
          <h1 className="text-[32px] md:text-[40px] font-semibold text-text-primary tracking-tight leading-tight mb-2">
            Departments
          </h1>
          <p className="text-[15px] text-text-secondary">
            {loading
              ? "Loading departments…"
              : (() => {
                  const activeDepts = teams.filter(t => t.status === "active").length;
                  const outcomes = wfPerf?.outputsThisWeek ?? 0;
                  const base = activeDepts > 0
                    ? `${activeDepts} department${activeDepts !== 1 ? "s" : ""} active`
                    : activeAgents > 0
                    ? `${activeAgents} department${activeAgents !== 1 ? "s" : ""} configured`
                    : "Departments become active when agents are assigned.";
                  return outcomes > 0
                    ? `${base} · ${outcomes} outcome${outcomes !== 1 ? "s" : ""} this week`
                    : base;
                })()}
            {pendingApprovals > 0 && (
              <>
                {" · "}
                <button
                  onClick={() => setActiveView("inbox")}
                  className="text-accent-amber hover:opacity-80 transition-opacity"
                >
                  {pendingApprovals} approval{pendingApprovals !== 1 ? "s" : ""} waiting
                </button>
              </>
            )}
          </p>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="rounded-2xl bg-[#0d1220] border border-white/[0.05] p-4 md:p-5">
            <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] mb-2">Departments</p>
            <p className="text-[36px] font-bold font-mono text-[#00D4FF]">{teams.length || DEPARTMENTS.length}</p>
          </div>
          <div className="rounded-2xl bg-[#0d1220] border border-white/[0.05] p-4 md:p-5">
            <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] mb-2">Working Now</p>
            <p className="text-[36px] font-bold font-mono text-accent-green">{runningNow}</p>
          </div>
          <button
            onClick={() => setActiveView("inbox")}
            className="rounded-2xl bg-[#0d1220] border border-white/[0.05] p-4 md:p-5 text-left hover:border-accent-amber/20 transition-colors group"
          >
            <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] mb-2">Approvals</p>
            <p className={cn(
              "text-[36px] font-bold font-mono transition-colors",
              pendingApprovals > 0 ? "text-accent-amber" : "text-text-muted"
            )}>
              {pendingApprovals}
            </p>
          </button>
        </div>

        {/* Department grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {DEPARTMENTS.map(dept => {
            const deptAgents = agents.filter(a => {
              const type = (a.agentType ?? "").toLowerCase();
              return dept.types.some(t => type === t || type.includes(t));
            });

            const team = teams.find(t => t.departmentType === dept.id);
            const latestOutput = (team?.outputs?.[0] ?? null) as WorkforceOutput | null;
            const teamActiveAssignments = team
              ? assignments.filter(a => a.teamId === team.id && ["pending","active","review"].includes(a.status)).length
              : 0;

            const activeCount = deptAgents.filter(a => a.status === "active").length;
            const lastRun = deptAgents
              .flatMap(a => a.runs ?? [])
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

            const isRunning = lastRun?.status === "running";
            const isActive  = team?.status === "active";
            const isEmpty   = !team && deptAgents.length === 0;

            return (
              <div
                key={dept.id}
                className={cn(
                  "rounded-2xl border bg-[#0d1220] p-5 md:p-6 transition-colors",
                  isEmpty
                    ? "border-white/[0.03] opacity-50 cursor-default"
                    : selectedDeptId === dept.id
                    ? "border-[#00D4FF]/25 cursor-pointer"
                    : "border-white/[0.05] hover:border-white/[0.08] cursor-pointer"
                )}
                onClick={() => !isEmpty && setSelectedDeptId(prev => prev === dept.id ? null : dept.id)}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: `${dept.color}18`,
                      border: `1px solid ${dept.color}30`,
                    }}
                  >
                    <dept.icon className="w-5 h-5" style={{ color: dept.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-[14px] font-semibold text-text-primary">{dept.label}</h3>
                      {isRunning && (
                        <span className="flex items-center gap-1 text-[10px] text-accent-green font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse-slow" />
                          Working
                        </span>
                      )}
                      {!isRunning && isActive && (
                        <span className="flex items-center gap-1 text-[10px] text-text-ghost">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-green/60" />
                          Active
                        </span>
                      )}
                      {isEmpty && (
                        <span className="text-[10px] text-text-ghost italic">Not configured</span>
                      )}
                    </div>

                    {team?.currentFocus ? (
                      <p className="text-[12px] text-text-muted">{team.currentFocus}</p>
                    ) : (
                      <p className="text-[12px] text-text-muted">{dept.description}</p>
                    )}

                    {latestOutput && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          latestOutput.status === "completed" || latestOutput.status === "approved" ? "bg-accent-green" :
                          latestOutput.status === "in_progress" || latestOutput.status === "handed_off" ? "bg-[#00D4FF]" :
                          latestOutput.status === "in_review" ? "bg-accent-amber" :
                          "bg-text-ghost"
                        )} />
                        <p className="text-[12px] text-text-secondary flex-1 truncate">
                          {latestOutput.title}
                        </p>
                        <span className="text-[11px] text-text-ghost flex-shrink-0">
                          {fmtTime(latestOutput.createdAt)}
                        </span>
                      </div>
                    )}

                    {!latestOutput && lastRun && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          lastRun.status === "completed" ? "bg-accent-green" :
                          lastRun.status === "running"   ? "bg-[#00D4FF] animate-pulse-slow" :
                          lastRun.status === "failed"    ? "bg-accent-red" : "bg-text-ghost"
                        )} />
                        <p className="text-[12px] text-text-secondary flex-1">
                          {describeOutcome(lastRun.status, dept.id)}
                        </p>
                        <span className="text-[11px] text-text-ghost flex-shrink-0">
                          {fmtTime(lastRun.completedAt ?? lastRun.startedAt ?? lastRun.createdAt)}
                        </span>
                      </div>
                    )}
                    {teamActiveAssignments > 0 && (
                      <div className="mt-2 flex items-center gap-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-cyan/5 text-accent-cyan/70 border border-accent-cyan/10">
                          {teamActiveAssignments} assignment{teamActiveAssignments !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Team detail panel */}
        {selectedDeptId && (() => {
          const dept = DEPARTMENTS.find(d => d.id === selectedDeptId);
          const team = teams.find(t => t.departmentType === selectedDeptId);
          if (!dept) return null;
          const latestOutput = (team?.outputs?.[0] ?? null) as WorkforceOutput | null;
          const outputProject = latestOutput?.projectId
            ? projects.find(p => p.id === latestOutput.projectId)
            : null;
          const teamApprovals = team
            ? wfApprovalsList.filter(a => a.sourceTeamId === team.id && a.status === "pending")
            : [];
          const linkedGoal    = latestOutput?.goalId
            ? goals.find(g => g.id === latestOutput.goalId) ?? null
            : null;
          const linkedRevenue = latestOutput?.revenueEntryId
            ? revenueEntries.find(r => r.id === latestOutput.revenueEntryId) ?? null
            : null;
          const teamAssignments = team
            ? assignments.filter(a => a.teamId === team.id && a.status !== "archived")
            : [];
          const activeAssignmentCount = teamAssignments.filter(a => ["pending","active","review"].includes(a.status)).length;

          // 5E: Build output lifecycle timeline from timestamps
          type TimelineStep = { label: string; done: boolean; time: string | null };
          const outputTimeline: TimelineStep[] = latestOutput ? [
            { label: "Created",           done: true,                               time: latestOutput.createdAt },
            { label: "Submitted",         done: !!latestOutput.reviewedAt,          time: latestOutput.reviewedAt },
            { label: "Approved",          done: !!latestOutput.approvedAt,          time: latestOutput.approvedAt },
            { label: "Handed off",        done: latestOutput.status === "handed_off" || latestOutput.status === "in_progress" || latestOutput.status === "completed", time: latestOutput.ownerTeamId ? latestOutput.updatedAt : null },
            { label: "Completed",         done: !!latestOutput.completedAt,         time: latestOutput.completedAt },
          ] : [];
          return (
            <div className="rounded-2xl border border-[#00D4FF]/[0.12] bg-[#0a1120] p-5 md:p-6 mb-8">
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${dept.color}18`, border: `1px solid ${dept.color}30` }}
                >
                  <dept.icon className="w-4 h-4" style={{ color: dept.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-[14px] font-semibold text-text-primary">{dept.label}</h3>
                    {team?.status === "active" && (
                      <span className="flex items-center gap-1 text-[10px] text-accent-green font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-green/60" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-text-muted leading-relaxed">{team?.objective ?? dept.description}</p>
                </div>
                <button
                  onClick={() => setSelectedDeptId(null)}
                  className="text-text-ghost hover:text-text-muted transition-colors flex-shrink-0 p-1"
                >
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {team?.currentFocus && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] mb-1.5">Current Focus</p>
                    <p className="text-[12px] text-text-secondary leading-relaxed">{team.currentFocus}</p>
                  </div>
                )}
                {latestOutput && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] mb-1.5">Latest Output</p>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full flex-shrink-0",
                        latestOutput.status === "completed" || latestOutput.status === "approved" ? "bg-accent-green" :
                        latestOutput.status === "in_progress" || latestOutput.status === "handed_off" ? "bg-[#00D4FF]" :
                        latestOutput.status === "in_review" ? "bg-accent-amber" : "bg-text-ghost"
                      )} />
                      <p className="text-[12px] text-text-secondary flex-1 truncate">{latestOutput.title}</p>
                    </div>
                    <p className="text-[11px] text-text-ghost">
                      {latestOutput.outputType.replace(/_/g, " ")} · {latestOutput.status.replace(/_/g, " ")} · {fmtTime(latestOutput.createdAt)}
                    </p>
                    {outputProject && (
                      <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded bg-accent-violet/10 text-accent-violet border border-accent-violet/20">
                        {outputProject.name}
                      </span>
                    )}
                    {/* Ownership: originating vs current owner */}
                    {latestOutput.ownerTeamId && latestOutput.ownerTeamId !== latestOutput.teamId && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <GitBranch className="w-2.5 h-2.5 text-text-ghost" />
                        <p className="text-[10px] text-text-ghost">
                          Handed to {teams.find(t => t.id === latestOutput.ownerTeamId)?.name ?? "another team"}
                        </p>
                      </div>
                    )}
                    {/* Goal + revenue links (5G, 5H) */}
                    {linkedGoal && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
                          Goal: {linkedGoal.title}
                        </span>
                        <span className="text-[10px] text-text-ghost">{linkedGoal.progress}%</span>
                      </div>
                    )}
                    {linkedRevenue && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/20">
                          Revenue: {linkedRevenue.title}
                        </span>
                      </div>
                    )}
                    {/* Advance output status */}
                    {latestOutput.status === "draft" && (
                      <button
                        onClick={async () => {
                          await fetch(`/api/workforce/outputs/${latestOutput.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "in_review" }),
                          });
                          const updated = await fetch("/api/workforce/teams").then(r => r.json());
                          if (Array.isArray(updated)) setTeams(updated);
                        }}
                        className="mt-2 text-[10px] px-2 py-1 rounded bg-accent-amber/10 text-accent-amber border border-accent-amber/20 hover:bg-accent-amber/15 transition-all"
                      >
                        Submit for review →
                      </button>
                    )}
                    {latestOutput.status === "in_review" && (
                      <button
                        onClick={async () => {
                          await fetch(`/api/workforce/outputs/${latestOutput.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "approved" }),
                          });
                          const updated = await fetch("/api/workforce/teams").then(r => r.json());
                          if (Array.isArray(updated)) setTeams(updated);
                        }}
                        className="mt-2 text-[10px] px-2 py-1 rounded bg-accent-green/10 text-accent-green border border-accent-green/20 hover:bg-accent-green/15 transition-all"
                      >
                        Approve output →
                      </button>
                    )}
                    {(latestOutput.content || latestOutput.description) && (
                      <button
                        onClick={() => setViewingOutput(latestOutput)}
                        className="mt-2 flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-accent-cyan/5 text-accent-cyan border border-accent-cyan/10 hover:bg-accent-cyan/10 transition-all"
                      >
                        <Eye className="w-2.5 h-2.5" /> View Output
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 5E: Output lifecycle timeline */}
              {latestOutput && outputTimeline.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] mb-2">Output timeline</p>
                  <div className="flex items-center gap-0">
                    {outputTimeline.map((step, i) => (
                      <div key={step.label} className="flex items-center">
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            "w-2 h-2 rounded-full border",
                            step.done
                              ? "bg-accent-green border-accent-green"
                              : "bg-transparent border-white/20"
                          )} />
                          <p className={cn(
                            "text-[9px] mt-1 whitespace-nowrap",
                            step.done ? "text-accent-green" : "text-text-ghost"
                          )}>
                            {step.label}
                          </p>
                          {step.time && step.done && (
                            <p className="text-[8px] text-text-ghost">{fmtTime(step.time)}</p>
                          )}
                        </div>
                        {i < outputTimeline.length - 1 && (
                          <div className={cn(
                            "h-px w-8 mb-4 mx-0.5",
                            outputTimeline[i + 1].done ? "bg-accent-green/40" : "bg-white/[0.08]"
                          )} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {teamApprovals.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-accent-amber/[0.04] border border-accent-amber/15">
                  <p className="text-[10px] text-accent-amber uppercase tracking-[0.1em] mb-2">
                    {teamApprovals.length} pending approval{teamApprovals.length !== 1 ? "s" : ""}
                  </p>
                  <div className="space-y-1.5">
                    {teamApprovals.map(a => (
                      <div key={a.id} className="flex items-center justify-between gap-3">
                        <p className="text-[12px] text-text-secondary truncate flex-1">{a.title}</p>
                        <button
                          onClick={() => setActiveView("inbox")}
                          className="text-[11px] text-accent-amber hover:opacity-80 transition-opacity flex-shrink-0"
                        >
                          Review →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6C/6D/6E: Assignments section */}
              {team && (
                <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em]">
                      Assignments
                      {activeAssignmentCount > 0 && (
                        <span className="ml-1.5 text-accent-cyan">({activeAssignmentCount} active)</span>
                      )}
                    </p>
                    {!showNewAssignment && (
                      <button
                        onClick={() => { setShowNewAssign(true); setSelectedAssId(null); }}
                        className="flex items-center gap-1 text-[10px] text-accent-cyan hover:opacity-80 transition-opacity"
                      >
                        <Plus className="w-2.5 h-2.5" /> New
                      </button>
                    )}
                  </div>

                  {/* 6D: New assignment form */}
                  {showNewAssignment && (
                    <div className="mb-2.5 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] space-y-1.5">
                      <input
                        type="text"
                        placeholder="Assignment title..."
                        value={newAssignTitle}
                        onChange={e => setNewAssignTitle(e.target.value)}
                        className="w-full bg-transparent text-[12px] text-text-primary placeholder:text-text-ghost outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Description (optional)"
                        value={newAssignDesc}
                        onChange={e => setNewAssignDesc(e.target.value)}
                        className="w-full bg-transparent text-[11px] text-text-secondary placeholder:text-text-ghost outline-none"
                      />
                      <div className="flex items-center gap-2 pt-0.5">
                        <select
                          value={newAssignPriority}
                          onChange={e => setNewAssignPriority(e.target.value)}
                          className="bg-white/[0.04] text-[10px] text-text-secondary rounded px-1.5 py-0.5 border border-white/[0.06] outline-none"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                        <button
                          disabled={!newAssignTitle.trim() || submitting}
                          onClick={async () => {
                            if (!newAssignTitle.trim()) return;
                            setSubmitting(true);
                            try {
                              const res = await fetch("/api/assignments", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  title: newAssignTitle.trim(),
                                  description: newAssignDesc.trim() || null,
                                  teamId: team.id,
                                  priority: newAssignPriority,
                                }),
                              });
                              const newAss = await res.json();
                              if (newAss?.id) {
                                setExecutingAssId(newAss.id);
                                setExecStep(0);
                                await fetch(`/api/assignments/${newAss.id}/execute`, { method: "POST" }).catch(() => {});
                                setExecutingAssId(null);
                              }
                              const [updAss, updTeams] = await Promise.all([
                                fetch("/api/assignments").then(r => r.json()).catch(() => []),
                                fetch("/api/workforce/teams").then(r => r.json()).catch(() => []),
                              ]);
                              if (Array.isArray(updAss))   setAssignments(updAss);
                              if (Array.isArray(updTeams)) setTeams(updTeams);
                              setNewAssignTitle(""); setNewAssignDesc(""); setNewAssignPriority("medium");
                              setShowNewAssign(false);
                            } finally { setSubmitting(false); setExecutingAssId(null); }
                          }}
                          className="ml-auto text-[10px] px-2 py-0.5 rounded bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 hover:bg-accent-cyan/15 disabled:opacity-40 transition-all"
                        >
                          {submitting ? <><Loader2 className="w-2.5 h-2.5 inline animate-spin mr-1" />Executing…</> : "Assign & Execute →"}
                        </button>
                        <button
                          onClick={() => setShowNewAssign(false)}
                          className="text-[10px] text-text-ghost hover:text-text-muted transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Execution progress indicator */}
                  {executingAssId && (() => {
                    const EXEC_STEPS = ["Creating assignment", "Generating output", "Evaluating rules", "Finalizing"];
                    return (
                      <div className="mb-2 p-2.5 rounded-lg bg-accent-cyan/[0.04] border border-accent-cyan/10">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Loader2 className="w-3 h-3 text-accent-cyan animate-spin" />
                          <p className="text-[11px] text-accent-cyan font-medium">
                            {EXEC_STEPS[execStep] ?? "Completing"}…
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {EXEC_STEPS.map((_, i) => (
                            <div
                              key={i}
                              className={cn(
                                "h-0.5 flex-1 rounded-full transition-all duration-500",
                                i <= execStep ? "bg-accent-cyan" : "bg-white/[0.08]"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {teamAssignments.length === 0 && !showNewAssignment && !executingAssId && (
                    <p className="text-[11px] text-text-ghost">No assignments yet. Create one to get started.</p>
                  )}

                  {/* Assignment list + 6E chat thread */}
                  <div className="space-y-1">
                    {teamAssignments.map(a => {
                      const isSelected = selectedAssId === a.id;
                      const STATUS_DOT_C: Record<string, string> = {
                        pending: "#64748b", active: "#10b981", review: "#f59e0b", completed: "#6366f1", archived: "#64748b",
                      };
                      const PRIORITY_C: Record<string, string> = {
                        urgent: "text-accent-red", high: "text-accent-amber", medium: "text-text-ghost", low: "text-text-ghost",
                      };
                      return (
                        <div key={a.id}>
                          <button
                            onClick={() => { setSelectedAssId(prev => prev === a.id ? null : a.id); setShowNewAssign(false); }}
                            className={cn(
                              "w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all",
                              isSelected ? "bg-accent-cyan/5 border border-accent-cyan/15" : "hover:bg-white/[0.02]"
                            )}
                          >
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_DOT_C[a.status] ?? "#64748b" }} />
                            <p className="text-[12px] text-text-secondary flex-1 truncate">{a.title}</p>
                            {a.priority !== "medium" && (
                              <span className={cn("text-[10px] capitalize flex-shrink-0", PRIORITY_C[a.priority] ?? "text-text-ghost")}>
                                {a.priority}
                              </span>
                            )}
                            <span className="text-[10px] text-text-ghost capitalize flex-shrink-0">{a.status}</span>
                            {(a.messages?.length ?? 0) > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] text-text-ghost flex-shrink-0">
                                <MessageSquare className="w-2.5 h-2.5" /> {a.messages!.length}
                              </span>
                            )}
                          </button>

                          {/* 6E: Assignment detail + chat */}
                          {isSelected && (
                            <div className="mt-1 mb-1 ml-3 pl-3 border-l border-white/[0.08]">
                              {a.description && (
                                <p className="text-[11px] text-text-muted mb-2 leading-relaxed">{a.description}</p>
                              )}
                              {/* Status actions */}
                              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                                {a.status === "pending" && (
                                  <button
                                    disabled={executingAssId === a.id}
                                    onClick={async () => {
                                      setExecutingAssId(a.id);
                                      setExecStep(0);
                                      await fetch(`/api/assignments/${a.id}/execute`, { method: "POST" });
                                      setExecutingAssId(null);
                                      const [upd, updTeams] = await Promise.all([
                                        fetch("/api/assignments").then(r => r.json()).catch(() => []),
                                        fetch("/api/workforce/teams").then(r => r.json()).catch(() => []),
                                      ]);
                                      if (Array.isArray(upd))      setAssignments(upd);
                                      if (Array.isArray(updTeams)) setTeams(updTeams);
                                    }}
                                    className="text-[10px] px-2 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/20 hover:bg-accent-green/15 disabled:opacity-40 transition-all"
                                  >
                                    {executingAssId === a.id
                                      ? <><Loader2 className="w-2.5 h-2.5 inline animate-spin mr-1" />Executing…</>
                                      : "⚡ Execute →"
                                    }
                                  </button>
                                )}
                                {a.status === "active" && (
                                  <button
                                    onClick={async () => {
                                      await fetch(`/api/assignments/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "review" }) });
                                      const upd = await fetch("/api/assignments").then(r => r.json());
                                      if (Array.isArray(upd)) setAssignments(upd);
                                    }}
                                    className="text-[10px] px-2 py-0.5 rounded bg-accent-amber/10 text-accent-amber border border-accent-amber/20 hover:bg-accent-amber/15 transition-all"
                                  >Send for review →</button>
                                )}
                                {a.status === "review" && (
                                  <button
                                    onClick={async () => {
                                      await fetch(`/api/assignments/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "completed" }) });
                                      const upd = await fetch("/api/assignments").then(r => r.json());
                                      if (Array.isArray(upd)) setAssignments(upd);
                                    }}
                                    className="text-[10px] px-2 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/20 hover:bg-accent-green/15 transition-all"
                                  >Mark complete ✓</button>
                                )}
                                {(a.status === "completed" || a.status === "review") && team && (() => {
                                  const rel = (team.outputs ?? []).find(o =>
                                    (o as WorkforceOutput).title === a.title
                                  ) as WorkforceOutput | undefined;
                                  if (!rel) return null;
                                  return (
                                    <button
                                      onClick={() => setViewingOutput(rel)}
                                      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-accent-cyan/5 text-accent-cyan border border-accent-cyan/10 hover:bg-accent-cyan/10 transition-all"
                                    >
                                      <Eye className="w-2.5 h-2.5" /> View Output
                                    </button>
                                  );
                                })()}
                              </div>
                              {/* Message thread */}
                              {(a.messages?.length ?? 0) > 0 && (
                                <div className="space-y-1.5 mb-2 max-h-36 overflow-y-auto">
                                  {a.messages!.map(msg => (
                                    <div key={msg.id} className={cn(
                                      "px-2 py-1.5 rounded-lg text-[11px]",
                                      msg.senderType === "operator" ? "bg-accent-cyan/5 text-accent-cyan/90" :
                                      msg.senderType === "system"   ? "bg-white/[0.02] text-text-ghost italic" :
                                      "bg-white/[0.03] text-text-secondary"
                                    )}>
                                      <p className="text-[9px] text-text-ghost mb-0.5 uppercase tracking-wide">
                                        {msg.senderType === "operator" ? "You" : msg.senderType === "system" ? "System" : "Team"}
                                        {" · "}{fmtTime(msg.createdAt)}
                                      </p>
                                      {msg.content}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Send message input */}
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  placeholder="Message to team..."
                                  value={chatInput}
                                  onChange={e => setChatInput(e.target.value)}
                                  onKeyDown={async (e) => {
                                    if (e.key !== "Enter" || !chatInput.trim() || submitting) return;
                                    setSubmitting(true);
                                    await fetch(`/api/assignments/${a.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: chatInput.trim(), senderType: "operator" }) });
                                    const upd = await fetch("/api/assignments").then(r => r.json());
                                    if (Array.isArray(upd)) setAssignments(upd);
                                    setChatInput(""); setSubmitting(false);
                                  }}
                                  className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-2 py-1 text-[11px] text-text-secondary placeholder:text-text-ghost outline-none focus:border-accent-cyan/20 transition-colors"
                                />
                                <button
                                  disabled={!chatInput.trim() || submitting}
                                  onClick={async () => {
                                    if (!chatInput.trim() || submitting) return;
                                    setSubmitting(true);
                                    await fetch(`/api/assignments/${a.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: chatInput.trim(), senderType: "operator" }) });
                                    const upd = await fetch("/api/assignments").then(r => r.json());
                                    if (Array.isArray(upd)) setAssignments(upd);
                                    setChatInput(""); setSubmitting(false);
                                  }}
                                  className="flex-shrink-0 p-1.5 rounded-lg bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 hover:bg-accent-cyan/15 disabled:opacity-40 transition-all"
                                >
                                  <Send className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Workforce Performance — lazy loaded */}
        {(() => {
          if (!wfPerf) {
            return null;
          }
          const activeTeams = wfPerf.teams.filter(t => t.completedThisWeek > 0 || t.outputsThisWeek > 0 || t.completedThisMonth > 0);
          if (activeTeams.length === 0 && wfPerf.completedThisWeek === 0) return null;
          return (
            <div className="rounded-2xl border border-white/[0.05] bg-[#0d1220] overflow-hidden mb-5">
              <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
                <span className="text-[13px] font-semibold text-text-primary">Department Outcomes</span>
                <div className="flex items-center gap-4 text-[11px] text-text-ghost">
                  <span><span className="text-text-secondary font-medium">{wfPerf.completedThisWeek}</span> done this week</span>
                  <span><span className="text-text-secondary font-medium">{wfPerf.outputsThisWeek}</span> outputs</span>
                  {wfPerf.pendingApprovals > 0 && (
                    <span className="text-accent-amber"><span className="font-medium">{wfPerf.pendingApprovals}</span> pending approval{wfPerf.pendingApprovals !== 1 ? "s" : ""}</span>
                  )}
                </div>
              </div>
              {activeTeams.length > 0 && (
                <div className="divide-y divide-white/[0.03]">
                  {activeTeams.map(t => (
                    <div key={t.teamId} className="flex items-center gap-4 px-5 py-3">
                      <p className="text-[12px] text-text-secondary font-medium flex-1 truncate">{t.teamName}</p>
                      <div className="flex items-center gap-3 text-[11px] text-text-ghost flex-shrink-0">
                        {t.completedThisWeek > 0 && (
                          <span><span className="text-accent-green font-medium">{t.completedThisWeek}</span> completed</span>
                        )}
                        {t.outputsThisWeek > 0 && (
                          <span><span className="text-[#00D4FF] font-medium">{t.outputsThisWeek}</span> output{t.outputsThisWeek !== 1 ? "s" : ""}</span>
                        )}
                        {t.pendingApprovals > 0 && (
                          <span className="text-accent-amber"><span className="font-medium">{t.pendingApprovals}</span> pending</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Company-wide Activity Feed */}
        {(() => {
          const activityItems = assignments
            .filter(a => a.status !== "archived")
            .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())
            .slice(0, 10);

          if (activityItems.length === 0) return null;

          const STATUS_DOT: Record<string, string> = {
            pending:   "#64748b",
            active:    "#10b981",
            review:    "#f59e0b",
            completed: "#6366f1",
          };
          const STATUS_VERB: Record<string, string> = {
            pending:   "queued",
            active:    "working on",
            review:    "submitted for review",
            completed: "completed",
          };

          return (
            <div className="rounded-2xl border border-white/[0.05] bg-[#0d1220] overflow-hidden mb-5">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse-slow" />
                  <span className="text-[13px] font-semibold text-text-primary">Company Activity</span>
                </div>
                <button
                  onClick={() => setActiveView("requests")}
                  className="flex items-center gap-1.5 text-[11px] text-[#00D4FF] hover:opacity-80 transition-opacity font-medium"
                >
                  <Zap className="w-3 h-3" /> New request
                </button>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {activityItems.map(a => {
                  const dept  = a.team?.departmentType ?? "";
                  const deptDef = DEPARTMENTS.find(d => d.id === dept);
                  const color = deptDef?.color ?? "#64748b";
                  const Icon  = deptDef?.icon;

                  return (
                    <div key={a.id} className="flex items-center gap-3.5 px-5 py-3 hover:bg-white/[0.015] transition-colors">
                      <div
                        className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          a.status === "active" && "animate-pulse-slow"
                        )}
                        style={{ background: STATUS_DOT[a.status] ?? "#64748b" }}
                      />
                      {Icon && (
                        <div
                          className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}
                        >
                          <Icon className="w-2.5 h-2.5" style={{ color }} />
                        </div>
                      )}
                      <p className="text-[12px] text-text-secondary flex-1 leading-snug">
                        <span className="text-text-primary font-medium">{a.team?.name ?? "AI Team"}</span>
                        {" "}{STATUS_VERB[a.status] ?? a.status}{" "}
                        <span className="text-text-muted">"{a.title}"</span>
                      </p>
                      <span className="text-[10px] text-text-ghost flex-shrink-0 tabular-nums">
                        {fmtTime(a.updatedAt ?? a.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Footer — manage agents */}
        <div className="flex items-center justify-between py-4 px-5 rounded-2xl border border-white/[0.04] bg-[#0d1220]">
          <div>
            <p className="text-[13px] text-text-secondary font-medium">Manage individual agents</p>
            <p className="text-[11px] text-text-muted mt-0.5">
              {agents.length} configured · {totalRuns} total runs
            </p>
          </div>
          <button
            onClick={() => setActiveView("agents")}
            className="flex items-center gap-2 text-[12px] text-[#00D4FF] hover:opacity-80 transition-opacity font-medium"
          >
            Agent Registry <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>

    {viewingOutput && (
      <OutputViewer output={viewingOutput} onClose={() => setViewingOutput(null)} />
    )}
    </>
  );
}
