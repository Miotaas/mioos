"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { Agent, FleetHealthSummary, AgentTeamOverview, ExecutiveLoopOverview } from "@/types";
import {
  Bot, Zap, ArrowRight, CheckCircle2, AlertCircle,
  TrendingUp, Clock, Users, Target, ChevronRight,
} from "lucide-react";

function fmtTime(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMins < 1)    return "just now";
  if (diffMins < 60)   return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function AgentOverviewView() {
  const { setActiveView } = useAppStore();

  const [agents, setAgents]             = useState<Agent[]>([]);
  const [fleetSummary, setFleet]        = useState<FleetHealthSummary | null>(null);
  const [teamOverview, setTeam]         = useState<AgentTeamOverview | null>(null);
  const [execLoop, setExecLoop]         = useState<ExecutiveLoopOverview | null>(null);
  const [pendingApprovals, setApprovals] = useState<number>(0);
  const [briefing, setBriefing]         = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/agents").then(r => r.json()).catch(() => []),
      fetch("/api/agents/fleet").then(r => r.json()).catch(() => null),
      fetch("/api/agent-team-overview").then(r => r.json()).catch(() => null),
      fetch("/api/executive-loop/overview").then(r => r.json()).catch(() => null),
      fetch("/api/approvals").then(r => r.json()).catch(() => []),
      fetch("/api/briefings").then(r => r.json()).catch(() => []),
    ]).then(([ag, fleet, team, exec, ap, br]) => {
      setAgents(Array.isArray(ag) ? ag : []);
      setFleet(fleet?.summary ?? null);
      if (team && typeof team.activeWorkspaces === "number") setTeam(team);
      if (exec && Array.isArray(exec.activeGoals)) setExecLoop(exec);
      const pending = Array.isArray(ap) ? ap.filter((a: { status: string }) => a.status === "pending").length : 0;
      setApprovals(pending);
      const briefings = Array.isArray(br) ? br : [];
      if (briefings.length > 0) setBriefing(briefings[0]?.summary ?? null);
    });
  }, []);

  const activeAgents  = agents.filter(a => a.status === "active");
  const runningAgents = agents.filter(a => a.runs?.some((r) => r.status === "running"));
  const recentRuns = agents
    .flatMap(a => (a.runs ?? []).map(r => ({ ...r, agentName: a.name })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const fleetScore   = fleetSummary?.fleetHealthScore ?? null;
  const fleetColor   = fleetScore != null
    ? fleetScore >= 70 ? "#10b981" : fleetScore >= 45 ? "#f59e0b" : "#ef4444"
    : "#94a3b8";

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-6 md:py-10 pb-28 md:pb-10 space-y-6">

        {/* Header */}
        <div>
          <p className="text-[11px] text-text-ghost uppercase tracking-[0.1em] mb-1">Agent OS</p>
          <h1 className="text-2xl md:text-3xl font-semibold text-text-primary tracking-tight">Overview</h1>
        </div>

        {/* Status row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatusCard
            label="Active Agents"
            value={String(activeAgents.length)}
            sub={`of ${agents.length} total`}
            color="#00D4FF"
            icon={<Bot className="w-4 h-4" />}
            onClick={() => setActiveView("agents")}
          />
          <StatusCard
            label="Running Now"
            value={String(runningAgents.length)}
            sub="in progress"
            color="#10b981"
            icon={<Zap className="w-4 h-4" />}
            onClick={() => setActiveView("activity")}
          />
          <StatusCard
            label="Approvals"
            value={String(pendingApprovals)}
            sub="waiting"
            color={pendingApprovals > 0 ? "#f59e0b" : "#94a3b8"}
            icon={<Clock className="w-4 h-4" />}
            onClick={() => setActiveView("activity")}
          />
          {fleetScore != null ? (
            <StatusCard
              label="Fleet Health"
              value={`${fleetScore}/100`}
              sub={fleetScore >= 70 ? "Healthy" : fleetScore >= 45 ? "Warning" : "Critical"}
              color={fleetColor}
              icon={<TrendingUp className="w-4 h-4" />}
              onClick={() => setActiveView("agents")}
            />
          ) : (
            <StatusCard
              label="Team Goals"
              value={String(execLoop?.activeGoals.length ?? 0)}
              sub="active"
              color="#8b5cf6"
              icon={<Target className="w-4 h-4" />}
              onClick={() => setActiveView("operations")}
            />
          )}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Agent list */}
          <div className="md:col-span-2 rounded-2xl border border-white/[0.06] bg-[#0e1324] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
              <div className="flex items-center gap-2">
                <Bot className="w-3.5 h-3.5 text-[#00D4FF]" />
                <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.1em]">Agent Team</span>
              </div>
              <button
                onClick={() => setActiveView("agents")}
                className="flex items-center gap-1 text-[11px] text-text-ghost hover:text-text-muted transition-colors"
              >
                Manage <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {agents.length === 0 ? (
                <div className="py-10 text-center">
                  <Bot className="w-6 h-6 text-text-ghost mx-auto mb-2 opacity-30" />
                  <p className="text-[12px] text-text-muted">No agents configured yet.</p>
                  <button
                    onClick={() => setActiveView("agents")}
                    className="text-[11px] text-[#00D4FF] mt-1 hover:opacity-80 transition-opacity"
                  >
                    Set up your first agent →
                  </button>
                </div>
              ) : agents.map(agent => {
                const lastRun = (agent.runs ?? [])
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                const isRunning = lastRun?.status === "running";
                return (
                  <div
                    key={agent.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      isRunning          ? "bg-[#00D4FF] animate-pulse-slow" :
                      agent.status === "active" ? "bg-accent-green" :
                      "bg-text-ghost"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-text-primary leading-none">{agent.name}</p>
                      <p className="text-[11px] text-text-muted mt-0.5">{agent.agentType ?? "General"}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={cn(
                        "text-[11px] font-medium",
                        isRunning ? "text-[#00D4FF]" :
                        agent.status === "active" ? "text-accent-green" :
                        "text-text-ghost"
                      )}>
                        {isRunning ? "Running" : agent.status === "active" ? "Active" : "Idle"}
                      </p>
                      {lastRun && (
                        <p className="text-[10px] text-text-ghost mt-0.5">{fmtTime(lastRun.createdAt)}</p>
                      )}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-text-ghost flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Strategic Briefing */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0e1324] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.1em]">Latest Briefing</span>
              </div>
              <div className="p-4">
                {briefing ? (
                  <p className="text-[12px] text-text-secondary leading-relaxed line-clamp-5">{briefing}</p>
                ) : (
                  <p className="text-[12px] text-text-ghost italic">No briefing yet. Run a strategy agent to generate one.</p>
                )}
              </div>
            </div>

            {/* Team overview */}
            {teamOverview && (
              <div className="rounded-2xl border border-white/[0.06] bg-[#0e1324] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.05]">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-[#00D4FF]" />
                    <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.1em]">Coordination</span>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-2 gap-3">
                  <MiniStat label="Active Workspaces" value={teamOverview.activeWorkspaces} />
                  <MiniStat label="Delegations" value={teamOverview.activeDelegations} alert={teamOverview.activeDelegations > 0} />
                  <MiniStat label="Unread Messages" value={teamOverview.unreadMessages} alert={teamOverview.unreadMessages > 0} />
                  <MiniStat label="Done Today" value={teamOverview.completedDelegationsToday} />
                </div>
              </div>
            )}

            {/* Executive goals */}
            {execLoop && execLoop.activeGoals.length > 0 && (
              <div className="rounded-2xl border border-white/[0.06] bg-[#0e1324] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.05]">
                  <div className="flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-[#00D4FF]" />
                    <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.1em]">Agent Goals</span>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  {execLoop.activeGoals.slice(0, 3).map(goal => (
                    <div key={goal.id} className="px-3 py-2.5 rounded-xl border border-white/[0.04] bg-white/[0.02]">
                      <p className="text-[12px] text-text-primary font-medium leading-snug line-clamp-2">{goal.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1 rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-[#00D4FF]"
                            style={{ width: `${goal.targetValue && goal.targetValue > 0 ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) : 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-text-ghost font-mono">
                          {goal.targetValue && goal.targetValue > 0 ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent runs */}
        {recentRuns.length > 0 && (
          <div className="rounded-2xl border border-white/[0.06] bg-[#0e1324] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
              <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.1em]">Recent Runs</span>
              <button
                onClick={() => setActiveView("activity")}
                className="flex items-center gap-1 text-[11px] text-text-ghost hover:text-text-muted transition-colors"
              >
                Full history <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.04]">
              {recentRuns.map(run => (
                <div key={run.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                    run.status === "completed" ? "bg-accent-green" :
                    run.status === "running"   ? "bg-[#00D4FF] animate-pulse-slow" :
                    run.status === "failed"    ? "bg-accent-red" : "bg-text-ghost"
                  )} />
                  <p className="text-[12px] text-text-secondary flex-1 truncate">
                    <span className="text-text-primary font-medium">{(run as { agentName: string }).agentName}</span>
                    {" · "}{run.status}
                  </p>
                  <span className="text-[10px] text-text-ghost tabular-nums whitespace-nowrap">
                    {fmtTime(run.completedAt ?? run.startedAt ?? run.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusCard({
  label, value, sub, color, icon, onClick,
}: {
  label: string; value: string; sub: string; color: string;
  icon: React.ReactNode; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-white/[0.06] bg-[#0e1324] p-4 text-left hover:border-white/[0.10] hover:bg-[#111827] transition-all group"
    >
      <div className="flex items-center gap-2 mb-3" style={{ color }}>
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-ghost">{label}</span>
      </div>
      <p className="text-2xl font-bold font-mono leading-none mb-1" style={{ color }}>{value}</p>
      <p className="text-[11px] text-text-muted">{sub}</p>
    </button>
  );
}

function MiniStat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3">
      <p className={cn("text-lg font-bold font-mono leading-none", alert ? "text-accent-amber" : "text-text-primary")}>{value}</p>
      <p className="text-[10px] text-text-ghost mt-0.5">{label}</p>
    </div>
  );
}
