"use client";

import { useEffect, useState } from "react";
import {
  Agent, AgentMessage, AgentDelegation,
  AgentWorkspace, WorkspaceMemberRole, AgentScorecard, ResearchRequest,
} from "@/types";
import { cn } from "@/lib/utils";
import {
  Users, MessageSquare, GitFork, Briefcase, ChevronRight,
  ArrowRight, Clock, CheckCircle2, AlertCircle, Circle,
  Loader2, Plus, RefreshCw, Crown, BarChart2,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-accent-amber/10 text-accent-amber",
  accepted:  "bg-accent-cyan/10 text-accent-cyan",
  running:   "bg-accent-violet/10 text-accent-violet",
  completed: "bg-accent-green/10 text-accent-green",
  failed:    "bg-accent-red/10 text-accent-red",
  cancelled: "bg-white/[0.06] text-text-ghost",
  unread:    "bg-accent-cyan/10 text-accent-cyan",
  read:      "bg-white/[0.04] text-text-ghost",
  archived:  "bg-white/[0.03] text-text-ghost",
};

const PRIORITY_COLORS: Record<string, string> = {
  low:      "text-text-ghost",
  medium:   "text-accent-cyan",
  high:     "text-accent-amber",
  critical: "text-accent-red",
};

const ROLE_COLORS: Record<WorkspaceMemberRole, string> = {
  executive:  "bg-accent-amber/10 text-accent-amber",
  researcher: "bg-accent-cyan/10 text-accent-cyan",
  validator:  "bg-accent-violet/10 text-accent-violet",
  planner:    "bg-accent-green/10 text-accent-green",
  reviewer:   "bg-accent-purple/10 text-accent-purple",
  observer:   "bg-white/[0.06] text-text-ghost",
};

const AUTHORITY_LABELS: Record<string, string> = {
  coordinate: "Coordinator",
  delegate:   "Delegator",
  research:   "Researcher",
  review:     "Reviewer",
  observe:    "Observer",
};

// ── sub-components ────────────────────────────────────────────────

function StatChip({ icon, label, value, alert }: {
  icon: React.ReactNode; label: string; value: number; alert?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-surface-2 border border-white/[0.06]">
      <span className={cn("opacity-60", alert && value > 0 ? "opacity-100 text-accent-amber" : "")}>{icon}</span>
      <div>
        <p className={cn("text-lg font-bold font-mono leading-none", alert && value > 0 ? "text-accent-amber" : "text-text-primary")}>
          {value}
        </p>
        <p className="text-[9px] text-text-ghost uppercase tracking-widest mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function SectionHeader({ label, count, color }: { label: string; count?: number; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-widest">{label}</h3>
      {count !== undefined && (
        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded", color ?? "bg-white/[0.06] text-text-ghost")}>
          {count}
        </span>
      )}
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-8 rounded-xl border border-dashed border-white/[0.06]">
      <p className="text-xs text-text-ghost">{text}</p>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────

export function AgentTeamView() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [workspaces, setWorkspaces] = useState<AgentWorkspace[]>([]);
  const [delegations, setDelegations] = useState<AgentDelegation[]>([]);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [scorecards, setScorecards] = useState<AgentScorecard[]>([]);
  const [researchRequests, setResearchRequests] = useState<ResearchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [expandedWorkspace, setExpandedWorkspace] = useState<string | null>(null);

  const agentMap = new Map(agents.map(a => [a.id, a]));

  async function loadAll() {
    setLoading(true);
    try {
      const [ag, ws, del, msg, sc, rr] = await Promise.all([
        fetch("/api/agents").then(r => r.json()).catch(() => []),
        fetch("/api/agent-workspaces").then(r => r.json()).catch(() => []),
        fetch("/api/agent-delegations?take=30").then(r => r.json()).catch(() => []),
        fetch("/api/agent-messages?take=30").then(r => r.json()).catch(() => []),
        fetch("/api/agent-scorecards?latestOnly=true&take=20").then(r => r.json()).catch(() => []),
        fetch("/api/research-requests?take=20").then(r => r.json()).catch(() => []),
      ]);
      setAgents(Array.isArray(ag) ? ag : []);
      setWorkspaces(Array.isArray(ws) ? ws : []);
      setDelegations(Array.isArray(del) ? del : []);
      setMessages(Array.isArray(msg) ? msg : []);
      setScorecards(Array.isArray(sc) ? sc : []);
      setResearchRequests(Array.isArray(rr) ? rr : []);
    } finally {
      setLoading(false);
    }
  }

  async function seedExecutiveAgent() {
    setSeeding(true);
    try {
      await fetch("/api/agents/seed", { method: "POST" });
      await loadAll();
    } finally {
      setSeeding(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const activeWorkspaces = workspaces.filter(w => w.status === "active");
  const activeDelegations = delegations.filter(d => ["pending", "accepted", "running"].includes(d.status));
  const completedDelegations = delegations.filter(d => d.status === "completed");
  const unreadMessages = messages.filter(m => m.status === "unread");
  const executiveAgent = agents.find(a => a.slug === "executive-agent");
  const activeResearch = researchRequests.filter(r => ["pending", "running"].includes(r.status));
  const completedResearch = researchRequests.filter(r => r.status === "completed");

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-text-ghost animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Agent Team</h1>
            <p className="text-xs text-text-muted mt-0.5">Multi-agent coordination infrastructure</p>
          </div>
          <div className="flex items-center gap-2">
            {!executiveAgent && (
              <button
                onClick={seedExecutiveAgent}
                disabled={seeding}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-amber/10 border border-accent-amber/20 text-accent-amber text-xs font-medium hover:bg-accent-amber/15 transition-all"
              >
                {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crown className="w-3.5 h-3.5" />}
                Seed Executive Agent
              </button>
            )}
            <button
              onClick={loadAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-text-secondary text-xs font-medium hover:bg-white/[0.06] transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-3">
          <StatChip icon={<Briefcase className="w-4 h-4" />} label="Active Workspaces" value={activeWorkspaces.length} />
          <StatChip icon={<GitFork className="w-4 h-4" />} label="Active Delegations" value={activeDelegations.length} alert />
          <StatChip icon={<MessageSquare className="w-4 h-4" />} label="Unread Messages" value={unreadMessages.length} alert />
          <StatChip icon={<CheckCircle2 className="w-4 h-4" />} label="Completed" value={completedDelegations.length} />
          <StatChip icon={<Users className="w-4 h-4" />} label="Agents" value={agents.length} />
          <StatChip icon={<BarChart2 className="w-4 h-4" />} label="Active Research" value={activeResearch.length} alert={activeResearch.length > 0} />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left: Workspaces + Delegations */}
          <div className="lg:col-span-2 space-y-5">

            {/* Workspaces */}
            <div>
              <SectionHeader
                label="Workspaces"
                count={activeWorkspaces.length}
                color="bg-accent-cyan/10 text-accent-cyan"
              />
              {activeWorkspaces.length === 0 ? (
                <EmptyCard text="No active workspaces. Create one to start collaborating." />
              ) : (
                <div className="space-y-3">
                  {activeWorkspaces.map(ws => {
                    const expanded = expandedWorkspace === ws.id;
                    const activities = (ws.activities ?? []).slice(0, 5);
                    return (
                      <div key={ws.id} className="rounded-xl border border-white/[0.06] bg-surface-1 overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-2 h-2 rounded-full bg-accent-green flex-shrink-0" />
                              <p className="text-sm font-semibold text-text-primary truncate">{ws.name}</p>
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-accent-cyan/10 text-accent-cyan flex-shrink-0">
                                {ws.workspaceType}
                              </span>
                            </div>
                            <span className="text-[9px] text-text-ghost flex-shrink-0 ml-2">{fmtDate(ws.createdAt)}</span>
                          </div>

                          {ws.description && (
                            <p className="text-xs text-text-muted mb-3 leading-relaxed">{ws.description}</p>
                          )}

                          {/* Members */}
                          {(ws.members ?? []).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {(ws.members ?? []).map(m => {
                                const agent = agentMap.get(m.agentId);
                                return (
                                  <div key={m.id} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-2 border border-white/[0.04]">
                                    <span className={cn("text-[8px] font-bold px-1 py-0.5 rounded", ROLE_COLORS[m.role as WorkspaceMemberRole] ?? "bg-white/[0.06] text-text-ghost")}>
                                      {m.role.slice(0, 3).toUpperCase()}
                                    </span>
                                    <span className="text-[10px] text-text-secondary">{agent?.name ?? m.agentId.slice(0, 8)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Activity toggle */}
                          {activities.length > 0 && (
                            <button
                              onClick={() => setExpandedWorkspace(expanded ? null : ws.id)}
                              className="flex items-center gap-1 text-[10px] text-text-ghost hover:text-text-secondary transition-colors"
                            >
                              <ChevronRight className={cn("w-3 h-3 transition-transform", expanded && "rotate-90")} />
                              {activities.length} recent activit{activities.length > 1 ? "ies" : "y"}
                            </button>
                          )}
                        </div>

                        {/* Activity feed */}
                        {expanded && activities.length > 0 && (
                          <div className="border-t border-white/[0.04] px-4 pb-4 pt-3 space-y-2">
                            {activities.map(act => (
                              <div key={act.id} className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan/40 mt-1.5 flex-shrink-0" />
                                <div>
                                  <p className="text-[10px] text-text-secondary leading-snug">{act.summary}</p>
                                  <p className="text-[9px] text-text-ghost mt-0.5">{timeAgo(act.createdAt)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Delegations */}
            <div>
              <SectionHeader
                label="Delegations"
                count={delegations.length}
                color="bg-accent-violet/10 text-accent-violet"
              />
              {delegations.length === 0 ? (
                <EmptyCard text="No delegations yet. Agents will create these when coordinating work." />
              ) : (
                <div className="space-y-2">
                  {delegations.slice(0, 10).map(d => {
                    const from = agentMap.get(d.assignedByAgentId);
                    const to = agentMap.get(d.assignedToAgentId);
                    return (
                      <div key={d.id} className="rounded-xl border border-white/[0.06] bg-surface-1 p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] text-text-muted flex-shrink-0">{from?.name ?? "Unknown"}</span>
                            <ArrowRight className="w-3 h-3 text-text-ghost flex-shrink-0" />
                            <span className="text-[10px] font-medium text-text-secondary flex-shrink-0">{to?.name ?? "Unknown"}</span>
                          </div>
                          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0", STATUS_COLORS[d.status] ?? "bg-white/[0.06] text-text-ghost")}>
                            {d.status}
                          </span>
                        </div>
                        <p className="text-xs text-text-primary leading-snug mb-2 line-clamp-2">{d.objective}</p>
                        {d.expectedOutput && (
                          <p className="text-[10px] text-text-muted mb-2">Expected: {d.expectedOutput}</p>
                        )}
                        {d.result && (
                          <p className="text-[10px] text-accent-green leading-snug line-clamp-2">✓ {d.result}</p>
                        )}
                        {d.error && (
                          <p className="text-[10px] text-accent-red leading-snug line-clamp-1">✗ {d.error}</p>
                        )}
                        <p className="text-[9px] text-text-ghost mt-1">{timeAgo(d.createdAt)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Messages + Agent Roles */}
          <div className="space-y-5">

            {/* Messages */}
            <div>
              <SectionHeader
                label="Messages"
                count={messages.length}
                color={unreadMessages.length > 0 ? "bg-accent-amber/10 text-accent-amber" : undefined}
              />
              {messages.length === 0 ? (
                <EmptyCard text="No messages. Agents will communicate here." />
              ) : (
                <div className="space-y-2">
                  {messages.slice(0, 8).map(msg => {
                    const from = agentMap.get(msg.fromAgentId);
                    const to = agentMap.get(msg.toAgentId);
                    return (
                      <div key={msg.id} className={cn(
                        "rounded-xl border p-3 transition-colors",
                        msg.status === "unread"
                          ? "border-accent-cyan/20 bg-accent-cyan/[0.03]"
                          : "border-white/[0.05] bg-surface-1"
                      )}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-5 h-5 rounded-full bg-accent-cyan/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-[8px] font-bold text-accent-cyan">
                                {(from?.name ?? "?")[0].toUpperCase()}
                              </span>
                            </div>
                            <span className="text-[10px] text-text-muted truncate">
                              {from?.name ?? "Unknown"} → {to?.name ?? "Unknown"}
                            </span>
                          </div>
                          <span className={cn("text-[8px] flex-shrink-0 ml-1", PRIORITY_COLORS[msg.priority])}>
                            {msg.priority !== "medium" ? msg.priority.toUpperCase() : ""}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-text-primary leading-snug mb-0.5 line-clamp-1">{msg.subject}</p>
                        <p className="text-[10px] text-text-muted leading-snug line-clamp-2">{msg.content}</p>
                        <p className="text-[9px] text-text-ghost mt-1">{timeAgo(msg.createdAt)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Agent Roles */}
            <div>
              <SectionHeader label="Agent Roster" count={agents.length} />
              {agents.length === 0 ? (
                <EmptyCard text="No agents configured." />
              ) : (
                <div className="space-y-2">
                  {agents.map(agent => (
                    <div key={agent.id} className="rounded-xl border border-white/[0.06] bg-surface-1 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-text-primary truncate">{agent.name}</p>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          {agent.role && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-accent-violet/10 text-accent-violet">
                              {agent.role.toUpperCase()}
                            </span>
                          )}
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full flex-shrink-0",
                            agent.status === "active" ? "bg-accent-green" : "bg-text-ghost"
                          )} />
                        </div>
                      </div>
                      {agent.mission && (
                        <p className="text-[10px] text-text-muted leading-snug line-clamp-2">{agent.mission}</p>
                      )}
                      {agent.authorityLevel && (
                        <p className="text-[9px] text-text-ghost mt-1">
                          {AUTHORITY_LABELS[agent.authorityLevel] ?? agent.authorityLevel}
                        </p>
                      )}
                      {!agent.role && !agent.mission && (
                        <p className="text-[9px] text-text-ghost italic">No role assigned</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Pending work summary */}
        {activeDelegations.length > 0 && (
          <div className="rounded-xl border border-accent-violet/20 bg-accent-violet/[0.03] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-3.5 h-3.5 text-accent-violet" />
              <p className="text-xs font-semibold text-accent-violet uppercase tracking-widest">Pending Work</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {activeDelegations.slice(0, 6).map(d => {
                const to = agentMap.get(d.assignedToAgentId);
                return (
                  <div key={d.id} className="flex items-start gap-2 p-2 rounded-lg bg-surface-2">
                    {d.status === "running"
                      ? <Loader2 className="w-3 h-3 text-accent-violet mt-0.5 flex-shrink-0 animate-spin" />
                      : <Circle className="w-3 h-3 text-accent-amber mt-0.5 flex-shrink-0" />
                    }
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-text-secondary truncate">{to?.name ?? "Unknown agent"}</p>
                      <p className="text-[9px] text-text-ghost leading-snug line-clamp-2">{d.objective}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed today */}
        {completedDelegations.length > 0 && (
          <div>
            <SectionHeader
              label="Completed Delegations"
              count={completedDelegations.length}
              color="bg-accent-green/10 text-accent-green"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {completedDelegations.slice(0, 4).map(d => {
                const from = agentMap.get(d.assignedByAgentId);
                const to = agentMap.get(d.assignedToAgentId);
                return (
                  <div key={d.id} className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.05] bg-surface-1">
                    <CheckCircle2 className="w-4 h-4 text-accent-green mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-text-muted mb-0.5">
                        {from?.name ?? "Unknown"} → {to?.name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-text-secondary leading-snug line-clamp-2">{d.objective}</p>
                      {d.result && (
                        <p className="text-[10px] text-accent-green mt-1 line-clamp-2">{d.result}</p>
                      )}
                      {d.completedAt && (
                        <p className="text-[9px] text-text-ghost mt-1">{timeAgo(d.completedAt)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Agent Scorecards */}
        {scorecards.length > 0 && (
          <div>
            <SectionHeader
              label="Agent Scorecards"
              count={scorecards.length}
              color="bg-accent-violet/10 text-accent-violet"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {scorecards.map(sc => {
                const agent = agentMap.get(sc.agentId);
                const overallColor =
                  sc.overallScore >= 7 ? "#10b981"
                  : sc.overallScore >= 4 ? "#f59e0b"
                  : "#ef4444";
                return (
                  <div key={sc.id} className="rounded-xl border border-white/[0.06] bg-surface-1 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-text-primary truncate">
                        {agent?.name ?? sc.agentId.slice(0, 10) + "…"}
                      </p>
                      <span
                        className="text-lg font-bold font-mono leading-none flex-shrink-0 ml-2"
                        style={{ color: overallColor }}
                      >
                        {sc.overallScore}
                        <span className="text-[10px] text-text-ghost font-normal">/10</span>
                      </span>
                    </div>
                    <div className="space-y-2">
                      {(
                        [
                          { label: "Reliability", value: sc.reliabilityScore, color: "#6366f1" },
                          { label: "Execution",   value: sc.executionScore,   color: "#06b6d4" },
                          { label: "Quality",     value: sc.qualityScore,     color: "#10b981" },
                          { label: "Usefulness",  value: sc.usefulnessScore,  color: "#f59e0b" },
                        ] as const
                      ).map(dim => (
                        <div key={dim.label} className="flex items-center gap-2">
                          <span className="text-[9px] text-text-ghost w-16 flex-shrink-0">{dim.label}</span>
                          <div className="flex-1 h-1 rounded-full bg-white/[0.05]">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${(dim.value / 10) * 100}%`, backgroundColor: dim.color }}
                            />
                          </div>
                          <span className="text-[9px] font-mono text-text-muted w-5 text-right flex-shrink-0">
                            {dim.value}
                          </span>
                        </div>
                      ))}
                    </div>
                    {sc.summary && (
                      <p className="text-[9px] text-text-ghost mt-2 leading-snug line-clamp-2">{sc.summary}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Research Requests */}
        {researchRequests.length > 0 && (
          <div>
            <SectionHeader
              label="Research Requests"
              count={researchRequests.length}
              color="bg-accent-amber/10 text-accent-amber"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {researchRequests.slice(0, 9).map(req => {
                const statusColor =
                  req.status === "completed" ? "bg-accent-green/10 text-accent-green"
                  : req.status === "running" ? "bg-accent-violet/10 text-accent-violet"
                  : req.status === "failed" ? "bg-accent-red/10 text-accent-red"
                  : "bg-accent-amber/10 text-accent-amber";
                const priorityColor =
                  req.priority === "critical" ? "text-accent-red"
                  : req.priority === "high" ? "text-accent-amber"
                  : req.priority === "medium" ? "text-accent-cyan"
                  : "text-text-ghost";
                return (
                  <div key={req.id} className="rounded-xl border border-white/[0.06] bg-surface-1 p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-xs font-semibold text-text-primary leading-snug line-clamp-2 flex-1">
                        {req.title}
                      </p>
                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0", statusColor)}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-muted leading-snug line-clamp-2 mb-2">
                      {req.objective}
                    </p>
                    {req.resultSummary && (
                      <p className="text-[10px] text-accent-green leading-snug line-clamp-2 mb-1">
                        ✓ {req.resultSummary}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className={cn("text-[9px] font-medium uppercase", priorityColor)}>
                        {req.priority}
                      </span>
                      {req.requestedByAgent && (
                        <span className="text-[9px] text-text-ghost">
                          by {req.requestedByAgent.name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {completedResearch.length > 0 && (
              <p className="text-[10px] text-text-ghost mt-2 text-center">
                {completedResearch.length} completed · {activeResearch.length} pending
              </p>
            )}
          </div>
        )}

        {/* Empty state — no team activity yet */}
        {agents.length > 0 && workspaces.length === 0 && delegations.length === 0 && messages.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/[0.08] p-10 text-center">
            <Users className="w-8 h-8 text-text-ghost mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium text-text-secondary mb-1">Team is configured but idle</p>
            <p className="text-xs text-text-muted">Run agents to generate delegations, messages, and workspace activity.</p>
          </div>
        )}

        {agents.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/[0.08] p-10 text-center">
            <AlertCircle className="w-8 h-8 text-text-ghost mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium text-text-secondary mb-1">No agents configured</p>
            <p className="text-xs text-text-muted mb-3">Create agents in the Agent Registry, then seed the Executive Agent to start.</p>
          </div>
        )}

      </div>
    </div>
  );
}
