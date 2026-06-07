"use client";

import { useEffect, useState, ReactNode } from "react";
import {
  MioNode, MioTask, MioGoal, MioCapture, MioNote,
  Agent, AgentRun, ApprovalQueueItem, AgentMemory,
  FleetHealthSummary, CommerceOpportunity, Prospect, CampaignDraft,
  ExecutionOverview, IntelligenceOverview, AgentTeamOverview, ExecutiveLoopOverview,
} from "@/types";
import { cn, formatRelativeDate } from "@/lib/utils";
import { normalizeTask, normalizeGoal, isOverdue, formatRelativeDeadline } from "@/lib/normalize";
import { useAppStore } from "@/store/appStore";
import {
  AlertCircle, ArrowRight, CheckCircle2, Activity,
  TrendingUp, Brain, Clock, Shield, BookOpen, Inbox,
  Bot, Circle, ChevronRight, DollarSign, BarChart2,
  Layers, Star, FileBarChart, HeartPulse, ShoppingCart, Zap, Users,
} from "lucide-react";

// ── local API shapes ─────────────────────────────────────────────
interface BizLead {
  id: string;
  status: string;
  companyName: string;
  nextActionDate?: string | null;
  estimatedValue?: number | null;
  updatedAt: string;
  createdAt: string;
}
interface BizDeployment { id: string; status: string; monthlyPrice?: number | null; updatedAt: string; }
interface BizIssue { id: string; status: string; severity: string; title: string; updatedAt: string; }

type RunWithAgent = AgentRun & { agentName: string };

// ── helpers ──────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function fmtEuro(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}k`;
  return `€${Math.round(n)}`;
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.min(hi, Math.max(lo, n));
}

function isToday(date: string | null | undefined): boolean {
  if (!date) return false;
  const d = new Date(date), t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

function fmtFeedTime(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  const hhmm = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const yest = new Date(now); yest.setDate(yest.getDate() - 1);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${hhmm} · ${diffMins}m`;
  if (d.toDateString() === now.toDateString()) return `${hhmm} · ${Math.floor(diffMins / 60)}h`;
  if (d.toDateString() === yest.toDateString()) return `Yesterday ${hhmm}`;
  return `${d.toLocaleDateString("en-GB", { weekday: "short" })} ${hhmm}`;
}

// ── main component ───────────────────────────────────────────────
export function DashboardHome() {
  const { setActiveView } = useAppStore();

  type ViewId = Parameters<typeof setActiveView>[0];
  type MItem = { label: string; sub?: string; tier: "critical" | "important" | "optional"; view: ViewId };
  type FItem = { label: string; sub: string; view: ViewId; urgent?: boolean; score: number };
  type FeedItem = { id: string; type: "run" | "approval" | "memory"; agentName: string; action: string; status: string; time: string; urgent?: boolean };

  const [nodes, setNodes] = useState<MioNode[]>([]);
  const [tasks, setTasks] = useState<MioTask[]>([]);
  const [goals, setGoals] = useState<MioGoal[]>([]);
  const [captures, setCaptures] = useState<MioCapture[]>([]);
  const [notes, setNotes] = useState<MioNote[]>([]);
  const [leads, setLeads] = useState<BizLead[]>([]);
  const [deployments, setDeployments] = useState<BizDeployment[]>([]);
  const [issues, setIssues] = useState<BizIssue[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [approvals, setApprovals] = useState<ApprovalQueueItem[]>([]);
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [fleetSummary, setFleetSummary] = useState<FleetHealthSummary | null>(null);
  const [opportunities, setOpportunities] = useState<CommerceOpportunity[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [campaignDrafts, setCampaignDrafts] = useState<CampaignDraft[]>([]);
  const [executionOverview, setExecutionOverview] = useState<ExecutionOverview | null>(null);
  const [intelligence, setIntelligence] = useState<IntelligenceOverview | null>(null);
  const [agentTeamOverview, setAgentTeamOverview] = useState<AgentTeamOverview | null>(null);
  const [execLoopOverview, setExecLoopOverview] = useState<ExecutiveLoopOverview | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/nodes").then(r => r.json()).catch(() => []),
      fetch("/api/tasks").then(r => r.json()).catch(() => []),
      fetch("/api/goals").then(r => r.json()).catch(() => []),
      fetch("/api/capture").then(r => r.json()).catch(() => []),
      fetch("/api/notes").then(r => r.json()).catch(() => []),
    ]).then(([n, t, g, c, nt]) => {
      setNodes(Array.isArray(n) ? n : []);
      setTasks((Array.isArray(t) ? t : []).map(normalizeTask));
      setGoals((Array.isArray(g) ? g : []).map(normalizeGoal));
      setCaptures(Array.isArray(c) ? c : []);
      setNotes(Array.isArray(nt) ? nt : []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/leads").then(r => r.json()).catch(() => []),
      fetch("/api/deployments").then(r => r.json()).catch(() => []),
      fetch("/api/support").then(r => r.json()).catch(() => []),
      fetch("/api/agents").then(r => r.json()).catch(() => []),
      fetch("/api/approvals").then(r => r.json()).catch(() => []),
      fetch("/api/agent-memory").then(r => r.json()).catch(() => []),
      fetch("/api/agents/fleet").then(r => r.json()).catch(() => null),
      fetch("/api/commerce/opportunities").then(r => r.json()).catch(() => []),
      fetch("/api/commerce/prospects").then(r => r.json()).catch(() => []),
      fetch("/api/commerce/campaigns").then(r => r.json()).catch(() => []),
    ]).then(([l, d, i, ag, ap, mem, fleet, opp, pros, camps]) => {
      setLeads(Array.isArray(l) ? l : []);
      setDeployments(Array.isArray(d) ? d : []);
      setIssues(Array.isArray(i) ? i : []);
      setAgents(Array.isArray(ag) ? ag : []);
      setApprovals(Array.isArray(ap) ? ap : []);
      setMemories(Array.isArray(mem) ? mem : []);
      setFleetSummary(fleet?.summary ?? null);
      setOpportunities(Array.isArray(opp) ? opp : []);
      setProspects(Array.isArray(pros) ? pros : []);
      setCampaignDrafts(Array.isArray(camps) ? camps : []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/execution-overview").then(r => r.json()).then(data => {
      if (data && typeof data.pendingExecutions === "number") setExecutionOverview(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/intelligence-overview").then(r => r.json()).then(data => {
      if (data && typeof data.insightCount === "number") setIntelligence(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/agent-team-overview").then(r => r.json()).then(data => {
      if (data && typeof data.activeWorkspaces === "number") setAgentTeamOverview(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/executive-loop/overview").then(r => r.json()).then(data => {
      if (data && Array.isArray(data.activeGoals)) setExecLoopOverview(data);
    }).catch(() => {});
  }, []);

  // ── tasks ──────────────────────────────────────────────────────
  const now = new Date();
  const openTasks = tasks.filter(t => t.status !== "done" && t.status !== "cancelled");
  const overdueTasks = openTasks.filter(t => isOverdue(t.dueDate));
  const inProgressTasks = tasks.filter(t => t.status === "in_progress");
  const completedToday = tasks.filter(t => t.status === "done" && isToday(t.completedAt));
  const urgentTasks = openTasks.filter(t => t.priority === "urgent");
  const blockedTasks = openTasks.filter(t => t.status === "blocked");

  // ── goals ──────────────────────────────────────────────────────
  const activeGoals = goals.filter(g => g.status === "active");
  const avgGoalProgress = activeGoals.length > 0
    ? Math.round(activeGoals.reduce((a, g) => a + g.progress, 0) / activeGoals.length)
    : 0;
  const stalledGoals = activeGoals.filter(g => g.progress < 20);

  // ── captures ───────────────────────────────────────────────────
  const inboxCaptures = captures.filter(c => c.status === "inbox");
  const processedCaptures = captures.filter(c => c.status === "processed");
  const newCapturesToday = captures.filter(c => isToday(c.createdAt));

  // ── nodes ──────────────────────────────────────────────────────
  const activeProjects = nodes.filter(n => n.type === "project" && n.status === "active");
  const blockedProjects = nodes.filter(n => n.type === "project" && n.status === "blocked");

  // ── leads ──────────────────────────────────────────────────────
  const ACTIVE_STATUSES = ["new", "contacted", "qualified", "demo_scheduled", "demo_completed", "proposal_sent", "pilot_active"];
  const activeLeads = leads.filter(l => ACTIVE_STATUSES.includes(l.status));
  const overdueFollowUps = activeLeads.filter(l => l.nextActionDate && new Date(l.nextActionDate) < now);
  const pilotsActive = leads.filter(l => l.status === "pilot_active");
  const discoveryLeads = leads.filter(l => ["new", "contacted"].includes(l.status));
  const totalPipelineValue = activeLeads.reduce((s, l) => s + (l.estimatedValue ?? 0), 0);

  // ── deployments + issues ───────────────────────────────────────
  const liveDeployments = deployments.filter(d => d.status === "live");
  const openIssues = issues.filter(i => i.status !== "resolved" && i.status !== "archived");
  const criticalIssues = openIssues.filter(i => i.severity === "critical" || i.severity === "high");

  // ── agents + approvals ─────────────────────────────────────────
  const activeAgents = agents.filter(a => a.status === "active");
  const pendingApprovals = approvals.filter(a => a.status === "pending");

  const recentRuns: RunWithAgent[] = agents
    .flatMap(a => (a.runs ?? []).map(r => ({ ...r, agentName: a.name })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  const newMemoriesToday = memories.filter(m => isToday(m.createdAt));

  // ── commerce autopilot ─────────────────────────────────────────
  const COMMERCE_ACTION_TYPES = ["create_opportunity","create_prospect","create_campaign_draft","create_fulfillment_flow","convert_prospect_to_lead","prepare_outreach","prepare_ad_campaign","prepare_stripe_offer","prepare_delivery_email"];
  const activeOpportunities = opportunities.filter(o => !["archived","rejected"].includes(o.status));
  const activeProspects = prospects.filter(p => ["discovered","qualified"].includes(p.status));
  const activeCampaigns = campaignDrafts.filter(c => ["draft","pending_approval"].includes(c.status));
  const commerceApprovals = pendingApprovals.filter(a => COMMERCE_ACTION_TYPES.includes(a.actionType));
  const estimatedCommercePipeline = opportunities
    .filter(o => ["approved","testing","live"].includes(o.status))
    .reduce((s, o) => s + (o.estimatedRevenue ?? 0), 0);

  // ── strategic briefing (latest strategy agent run) ────────────
  const strategyAgentRun = agents
    .filter(a => a.agentType === "strategy")
    .flatMap(a => (a.runs ?? []))
    .filter(r => r.status === "completed" && r.output)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;

  let briefingSummary: string | null = null;
  if (strategyAgentRun?.output) {
    try {
      const bp = JSON.parse(strategyAgentRun.output) as Record<string, unknown>;
      const recs = bp.recommendations as string[] | undefined;
      briefingSummary = recs?.[0] ?? (bp.summary as string | undefined) ?? null;
    } catch {
      const raw = strategyAgentRun.output;
      briefingSummary = raw.length > 110 ? raw.substring(0, 107) + "…" : raw;
    }
  }

  // ── revenue radar stages ───────────────────────────────────────
  const radarStages = [
    { label: "Discovery",  statuses: ["new", "contacted"],                        color: "#6366f1" },
    { label: "Demo",       statuses: ["demo_scheduled", "demo_completed"],         color: "#8b5cf6" },
    { label: "Proposal",   statuses: ["qualified", "proposal_sent"],               color: "#3b82f6" },
    { label: "Pilot",      statuses: ["pilot_active"],                             color: "#06b6d4" },
    { label: "Won",        statuses: ["won"],                                      color: "#10b981" },
  ].map(s => {
    const sl = leads.filter(l => s.statuses.includes(l.status));
    return { ...s, count: sl.length, value: sl.reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0) };
  });

  // ── agent activity feed ────────────────────────────────────────
  const feedItems: FeedItem[] = [
    ...recentRuns.map(r => ({
      id: r.id,
      type: "run" as const,
      agentName: r.agentName,
      action: r.status === "completed" ? "Completed run" : r.status === "failed" ? "Run failed" : r.status === "running" ? "Currently running" : "Run queued",
      status: r.status,
      time: r.completedAt ?? r.startedAt ?? r.createdAt,
    })),
    ...pendingApprovals.map(a => ({
      id: a.id,
      type: "approval" as const,
      agentName: a.agentRun?.agent?.name ?? "Agent",
      action: `Needs approval: ${a.actionType}`,
      status: "pending",
      time: a.createdAt,
      urgent: true,
    })),
    ...memories.slice(0, 4).map(m => ({
      id: m.id,
      type: "memory" as const,
      agentName: agents.find(a => a.id === m.agentId)?.name ?? "Agent",
      action: `Memory stored: ${m.title}`,
      status: "created",
      time: m.createdAt,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);

  // ── business health scores ─────────────────────────────────────
  const overdueInProjects = overdueTasks.filter(t => activeProjects.some(p => t.nodeId === p.id)).length;
  const projectsScore = clamp(
    50
    + (activeProjects.length > 0 ? 20 : 0)
    + (blockedProjects.length === 0 ? 20 : -20 * blockedProjects.length)
    + (overdueInProjects === 0 ? 10 : -5 * overdueInProjects)
  );
  const salesScore = clamp(
    30
    + (activeLeads.length > 0 ? 15 : 0)
    + (totalPipelineValue > 0 ? 20 : 0)
    + (overdueFollowUps.length === 0 ? 15 : Math.max(-20, -5 * overdueFollowUps.length))
    + (liveDeployments.length > 0 ? 20 : 0)
  );
  const operationsScore = clamp(
    70
    + (criticalIssues.length === 0 ? 15 : -15 * criticalIssues.length)
    + (openIssues.length <= 2 ? 5 : -5 * (openIssues.length - 2))
    + (activeAgents.length > 0 ? 10 : 0)
  );
  const knowledgeScore = clamp(
    20
    + Math.min(30, nodes.length * 2)
    + Math.min(25, notes.length * 3)
    + (inboxCaptures.length === 0 ? 15 : 0)
    + Math.min(10, memories.length)
  );
  const overallScore = Math.round((projectsScore + salesScore + operationsScore + knowledgeScore) / 4);

  // ── mission control ────────────────────────────────────────────
  const missionItems: MItem[] = [];

  overdueTasks.slice(0, 3).forEach(t =>
    missionItems.push({ label: t.title, sub: formatRelativeDeadline(t.dueDate), tier: "critical", view: "tasks" })
  );
  criticalIssues.slice(0, 2).forEach(i =>
    missionItems.push({ label: i.title, sub: `${i.severity} severity`, tier: "critical", view: "support" })
  );
  if (pendingApprovals.length > 0)
    missionItems.push({ label: `${pendingApprovals.length} approval${pendingApprovals.length > 1 ? "s" : ""} pending`, sub: "Agent actions awaiting your decision", tier: "critical", view: "approvals" });

  urgentTasks.slice(0, 2).forEach(t =>
    missionItems.push({ label: t.title, sub: "Urgent priority", tier: "important", view: "tasks" })
  );
  overdueFollowUps.slice(0, 2).forEach(l =>
    missionItems.push({ label: `Follow up: ${l.companyName}`, sub: formatRelativeDate(l.nextActionDate), tier: "important", view: "leads" })
  );
  blockedTasks.slice(0, 1).forEach(t =>
    missionItems.push({ label: t.title, sub: "Blocked — needs unblocking", tier: "important", view: "tasks" })
  );

  if (inboxCaptures.length > 0)
    missionItems.push({ label: `Process ${inboxCaptures.length} inbox capture${inboxCaptures.length > 1 ? "s" : ""}`, tier: "optional", view: "capture" });
  stalledGoals.slice(0, 1).forEach(g =>
    missionItems.push({ label: g.title, sub: `${g.progress}% — stalled`, tier: "optional", view: "goals" })
  );
  if (pilotsActive.length > 0)
    missionItems.push({ label: `Review ${pilotsActive.length} active pilot${pilotsActive.length > 1 ? "s" : ""}`, sub: "Check pilot progress", tier: "optional", view: "pipeline" });

  // ── recommended focus ──────────────────────────────────────────
  const focusCandidates: FItem[] = [];

  if (overdueTasks.length > 0)
    focusCandidates.push({ label: `Clear ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}`, sub: "Blocking your velocity", view: "tasks", urgent: true, score: 100 });
  if (pendingApprovals.length > 0)
    focusCandidates.push({ label: `Review ${pendingApprovals.length} pending approval${pendingApprovals.length > 1 ? "s" : ""}`, sub: "Agents waiting on your decision", view: "approvals", urgent: true, score: 95 });
  if (overdueFollowUps.length > 0)
    focusCandidates.push({ label: `Contact ${overdueFollowUps.length} overdue lead${overdueFollowUps.length > 1 ? "s" : ""}`, sub: "Follow-up date has passed", view: "leads", urgent: true, score: 90 });
  if (criticalIssues.length > 0)
    focusCandidates.push({ label: `Resolve ${criticalIssues.length} critical issue${criticalIssues.length > 1 ? "s" : ""}`, sub: "High/critical severity open", view: "support", urgent: true, score: 88 });
  if (pilotsActive.length > 0)
    focusCandidates.push({ label: `Check ${pilotsActive.length} active pilot${pilotsActive.length > 1 ? "s" : ""}`, sub: "Review progress and client feedback", view: "pipeline", score: 70 });
  if (inboxCaptures.length > 0)
    focusCandidates.push({ label: `Process ${inboxCaptures.length} inbox capture${inboxCaptures.length > 1 ? "s" : ""}`, sub: "Ideas and notes waiting for action", view: "capture", score: 60 });
  if (activeGoals.length > 0 && avgGoalProgress < 40)
    focusCandidates.push({ label: "Update goal progress", sub: `${avgGoalProgress}% avg — needs attention`, view: "goals", score: 55 });
  if (inProgressTasks.length > 0)
    focusCandidates.push({ label: `Continue ${inProgressTasks.length} in-progress task${inProgressTasks.length > 1 ? "s" : ""}`, sub: "Already in motion — keep going", view: "tasks", score: 50 });

  const topFocus = focusCandidates.sort((a, b) => b.score - a.score).slice(0, 5);

  // ── executive briefing ─────────────────────────────────────────
  const alertItems: string[] = [];
  if (overdueTasks.length > 0)    alertItems.push(`${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}`);
  if (overdueFollowUps.length > 0) alertItems.push(`${overdueFollowUps.length} overdue follow-up${overdueFollowUps.length > 1 ? "s" : ""}`);
  if (criticalIssues.length > 0)  alertItems.push(`${criticalIssues.length} critical issue${criticalIssues.length > 1 ? "s" : ""}`);
  if (pendingApprovals.length > 0) alertItems.push(`${pendingApprovals.length} pending approval${pendingApprovals.length > 1 ? "s" : ""}`);
  const allClear = alertItems.length === 0;

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  // ── health ring color ──────────────────────────────────────────
  const ringColor = overallScore >= 70 ? "#10b981" : overallScore >= 45 ? "#f59e0b" : "#ef4444";

  return (
    <div className="h-full overflow-y-auto bg-void">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 md:py-6 space-y-3 md:space-y-4 pb-20 md:pb-6">

        {/* ── HEADER ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium text-text-ghost uppercase tracking-widest mb-1.5">
              {today} · Founder Cockpit
            </p>
            <h1 className="text-[22px] font-semibold text-text-primary tracking-tight leading-none">
              {getGreeting()}, <span className="text-accent-purple">Michiel</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {pendingApprovals.length > 0 && (
              <button
                onClick={() => setActiveView("approvals")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-amber/10 border border-accent-amber/25 text-accent-amber text-xs font-medium hover:bg-accent-amber/15 transition-all"
              >
                <Clock className="w-3.5 h-3.5" />
                {pendingApprovals.length} pending
              </button>
            )}
            {inboxCaptures.length > 0 && (
              <button
                onClick={() => setActiveView("capture")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-medium hover:bg-accent-cyan/15 transition-all"
              >
                <Inbox className="w-3.5 h-3.5" />
                {inboxCaptures.length} inbox
              </button>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-green/[0.08] border border-accent-green/20">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse-slow" />
              <span className="text-xs text-accent-green font-medium">System Active</span>
            </div>
          </div>
        </div>

        {/* ── EXECUTIVE BRIEFING ─────────────────────────────────── */}
        <div className={cn(
          "rounded-xl border p-5",
          allClear
            ? "border-accent-green/20 bg-accent-green/[0.04]"
            : overdueTasks.length > 0 || criticalIssues.length > 0
              ? "border-accent-red/15 bg-surface-1"
              : "border-accent-amber/15 bg-surface-1"
        )}>
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
              allClear ? "bg-accent-green/15" : "bg-accent-red/10"
            )}>
              {allClear
                ? <CheckCircle2 className="w-5 h-5 text-accent-green" />
                : <AlertCircle className="w-5 h-5 text-accent-red" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1">Executive Briefing</p>
              <p className="text-sm font-medium text-text-primary">
                {allClear
                  ? "All clear — no blockers, overdue items, or critical issues."
                  : `Attention required: ${alertItems.join(", ")}.`
                }
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {totalPipelineValue > 0
                  ? `${fmtEuro(totalPipelineValue)} in active pipeline · ${liveDeployments.length} live · ${activeAgents.length} agent${activeAgents.length !== 1 ? "s" : ""} active`
                  : `${activeLeads.length} active lead${activeLeads.length !== 1 ? "s" : ""} · ${liveDeployments.length} live · ${activeAgents.length} agent${activeAgents.length !== 1 ? "s" : ""} active`
                }
              </p>
            </div>
            <div className="hidden md:flex items-center gap-4 flex-shrink-0">
              <BriefingStat label="Overdue"    value={overdueTasks.length}     alert={overdueTasks.length > 0} />
              <BriefingStat label="Follow-ups" value={overdueFollowUps.length} alert={overdueFollowUps.length > 0} />
              <BriefingStat label="Approvals"  value={pendingApprovals.length} alert={pendingApprovals.length > 0} />
              <BriefingStat label="Issues"     value={criticalIssues.length}   alert={criticalIssues.length > 0} />
              {totalPipelineValue > 0 && (
                <div className="text-center">
                  <p className="text-base font-bold leading-none mb-0.5 text-accent-purple">{fmtEuro(totalPipelineValue)}</p>
                  <p className="text-[9px] text-text-ghost">Pipeline</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── STRATEGIC BRIEFING WIDGET ──────────────────────────────── */}
        {strategyAgentRun && (
          <div className="rounded-xl border border-accent-cyan/15 bg-accent-cyan/[0.03] px-5 py-3.5 flex items-center gap-4">
            <div className="w-8 h-8 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center flex-shrink-0">
              <FileBarChart className="w-4 h-4 text-accent-cyan" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest mb-0.5">
                Latest Strategic Briefing
              </p>
              {briefingSummary && (
                <p className="text-xs text-text-muted truncate">→ {briefingSummary}</p>
              )}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-[10px] text-text-ghost tabular-nums whitespace-nowrap">
                {formatRelativeDate(strategyAgentRun.completedAt ?? strategyAgentRun.createdAt)}
              </span>
              <button
                onClick={() => setActiveView("strategic-briefing")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-medium hover:bg-accent-cyan/15 transition-all"
              >
                Open <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* ── AGENT FLEET HEALTH WIDGET ─────────────────────────── */}
        {fleetSummary && fleetSummary.total > 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-surface-1 px-5 py-3.5 flex items-center gap-5">
            <div className="flex items-center gap-2 flex-shrink-0">
              <HeartPulse className="w-4 h-4 text-accent-cyan" />
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">
                Fleet Health
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span
                className="text-xl font-bold font-mono leading-none"
                style={{
                  color: fleetSummary.fleetHealthScore >= 70 ? "#10b981"
                    : fleetSummary.fleetHealthScore >= 45 ? "#f59e0b"
                    : "#ef4444",
                }}
              >
                {fleetSummary.fleetHealthScore}
              </span>
              <span className="text-[10px] text-text-ghost">/ 100</span>
            </div>
            <div className="h-4 w-px bg-white/[0.06] flex-shrink-0" />
            <div className="flex items-center gap-4">
              <FleetStat value={fleetSummary.healthy} label="Healthy" color="#10b981" />
              <FleetStat value={fleetSummary.warning} label="Warning" color="#f59e0b" />
              <FleetStat value={fleetSummary.offline} label="Offline" color={fleetSummary.offline > 0 ? "#ef4444" : "#475569"} />
            </div>
            <div className="ml-auto flex-shrink-0">
              <button
                onClick={() => setActiveView("agent-fleet")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-medium hover:bg-accent-cyan/15 transition-all"
              >
                Fleet <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* ── COMMERCE AUTOPILOT WIDGET ─────────────────────────── */}
        <div className="rounded-xl border border-white/[0.06] bg-surface-1 px-5 py-3.5 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-shrink-0">
            <ShoppingCart className="w-4 h-4 text-accent-green" />
            <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Commerce Autopilot</p>
          </div>
          <div className="flex items-center gap-4">
            <CommerceStat label="Opportunities" value={activeOpportunities.length} />
            <CommerceStat label="Prospects" value={activeProspects.length} />
            <CommerceStat label="Campaigns" value={activeCampaigns.length} />
            {commerceApprovals.length > 0 && (
              <CommerceStat label="Pending" value={commerceApprovals.length} alert />
            )}
          </div>
          {estimatedCommercePipeline > 0 && (
            <>
              <div className="h-4 w-px bg-white/[0.06] flex-shrink-0" />
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-accent-green">{fmtEuro(estimatedCommercePipeline)}</span>
                <span className="text-[10px] text-text-ghost">est. pipeline</span>
              </div>
            </>
          )}
          <div className="ml-auto flex-shrink-0">
            <button
              onClick={() => setActiveView("commerce-opportunities")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-green/10 border border-accent-green/20 text-accent-green text-xs font-medium hover:bg-accent-green/15 transition-all"
            >
              Autopilot <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* ── EXECUTION LAYER WIDGET ────────────────────────────── */}
        {executionOverview && (
          <div className="rounded-xl border border-white/[0.06] bg-surface-1 px-5 py-3.5 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Zap className="w-4 h-4 text-accent-cyan" />
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Execution Layer</p>
            </div>
            <div className="flex items-center gap-4">
              <CommerceStat label="Running" value={executionOverview.pendingExecutions} alert={executionOverview.pendingExecutions > 0} />
              <CommerceStat label="Done Today" value={executionOverview.executedToday} />
              <CommerceStat label="Failed" value={executionOverview.failedToday} alert={executionOverview.failedToday > 0} />
              <CommerceStat label="Workflows" value={executionOverview.workflowTriggersToday} />
              <CommerceStat label="Schedules" value={executionOverview.scheduleRunsToday} />
              {executionOverview.memorySuggestionsPending > 0 && (
                <CommerceStat label="Memory Q" value={executionOverview.memorySuggestionsPending} alert />
              )}
            </div>
            <div className="ml-auto flex-shrink-0">
              <button
                onClick={() => setActiveView("approvals")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-medium hover:bg-accent-cyan/15 transition-all"
              >
                Approvals <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* ── INTELLIGENCE PANEL ────────────────────────────────── */}
        {intelligence && (intelligence.insightCount > 0 || intelligence.pendingPatternCount > 0 || intelligence.latestBriefing || intelligence.activeResearch > 0 || intelligence.latestEmailInsight || intelligence.latestCalendarInsight) && (
          <div className="rounded-xl border border-white/[0.06] bg-surface-1 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3 flex items-center justify-between border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-accent-purple" />
                <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Intelligence</p>
                {intelligence.insightCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent-purple/10 text-accent-purple">
                    {intelligence.insightCount} insight{intelligence.insightCount > 1 ? "s" : ""}
                  </span>
                )}
                {intelligence.activeResearch > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent-amber/10 text-accent-amber">
                    {intelligence.activeResearch} research
                  </span>
                )}
              </div>
              <button
                onClick={() => setActiveView("approvals")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-purple/10 border border-accent-purple/20 text-accent-purple text-xs font-medium hover:bg-accent-purple/15 transition-all"
              >
                Review <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.04]">
              {/* Latest Briefing */}
              <div className="p-4">
                <p className="text-[9px] font-semibold text-text-ghost uppercase tracking-widest mb-2">Latest Briefing</p>
                {intelligence.latestBriefing ? (
                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                    {intelligence.latestBriefing.summary}
                  </p>
                ) : (
                  <p className="text-xs text-text-ghost italic">No briefing yet — run an agent to generate one.</p>
                )}
              </div>

              {/* Top Risks + Opportunities */}
              <div className="p-4">
                <div className="mb-3">
                  <p className="text-[9px] font-semibold text-text-ghost uppercase tracking-widest mb-1.5">
                    <span className="text-accent-red">▲</span> Risks
                  </p>
                  {intelligence.topRisks.length > 0 ? (
                    <div className="space-y-1">
                      {intelligence.topRisks.slice(0, 2).map(r => (
                        <p key={r.id} className="text-[10px] text-text-secondary leading-snug line-clamp-2">
                          {r.title}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-text-ghost">No risks detected</p>
                  )}
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-text-ghost uppercase tracking-widest mb-1.5">
                    <span className="text-accent-green">▲</span> Opportunities
                  </p>
                  {intelligence.topOpportunities.length > 0 ? (
                    <div className="space-y-1">
                      {intelligence.topOpportunities.slice(0, 2).map(o => (
                        <p key={o.id} className="text-[10px] text-text-secondary leading-snug line-clamp-2">
                          {o.title}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-text-ghost">No opportunities detected</p>
                  )}
                </div>
              </div>

              {/* External Intelligence */}
              <div className="p-4">
                {(intelligence.latestEmailInsight || intelligence.latestCalendarInsight || intelligence.activeResearch > 0 || intelligence.completedResearch > 0) && (
                  <div className="mb-3">
                    <p className="text-[9px] font-semibold text-text-ghost uppercase tracking-widest mb-1.5">
                      External Awareness
                    </p>
                    <div className="space-y-1">
                      {intelligence.latestEmailInsight && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-accent-violet/10 text-accent-violet">EMAIL</span>
                          <p className="text-[10px] text-text-secondary leading-snug">
                            {intelligence.latestEmailInsight.unreadCount > 0
                              ? `${intelligence.latestEmailInsight.unreadCount} unread`
                              : "Inbox connected"}
                          </p>
                        </div>
                      )}
                      {intelligence.latestCalendarInsight && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-accent-cyan/10 text-accent-cyan">CAL</span>
                          <p className="text-[10px] text-text-secondary leading-snug line-clamp-1">
                            {intelligence.latestCalendarInsight.nextDeadline ?? `${intelligence.latestCalendarInsight.upcomingEvents} upcoming`}
                          </p>
                        </div>
                      )}
                      {(intelligence.activeResearch > 0 || intelligence.completedResearch > 0) && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-accent-amber/10 text-accent-amber">RSCH</span>
                          <p className="text-[10px] text-text-secondary">
                            {intelligence.activeResearch} active · {intelligence.completedResearch} done
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {intelligence.recentPatterns.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[9px] font-semibold text-text-ghost uppercase tracking-widest mb-1.5">
                      Patterns
                      {intelligence.pendingPatternCount > 0 && (
                        <span className="ml-1.5 text-accent-amber">({intelligence.pendingPatternCount} pending)</span>
                      )}
                    </p>
                    <div className="space-y-1">
                      {intelligence.recentPatterns.slice(0, 2).map(p => (
                        <p key={p.id} className="text-[10px] text-text-secondary leading-snug line-clamp-2">
                          {p.title}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {intelligence.recentInsights.length > 0 && (
                  <div>
                    <p className="text-[9px] font-semibold text-text-ghost uppercase tracking-widest mb-1.5">Recent Signals</p>
                    <div className="space-y-1">
                      {intelligence.recentInsights.slice(0, 3).map(i => (
                        <div key={i.id} className="flex items-start gap-1.5">
                          <span className={cn(
                            "text-[8px] font-bold px-1 py-0.5 rounded flex-shrink-0 mt-0.5",
                            i.type === "risk" && "bg-accent-red/10 text-accent-red",
                            i.type === "opportunity" && "bg-accent-green/10 text-accent-green",
                            i.type === "efficiency" && "bg-accent-amber/10 text-accent-amber",
                            i.type === "revenue" && "bg-accent-cyan/10 text-accent-cyan",
                            i.type === "execution" && "bg-accent-violet/10 text-accent-violet",
                          )}>
                            {i.type.slice(0, 3).toUpperCase()}
                          </span>
                          <p className="text-[10px] text-text-secondary leading-snug line-clamp-1">{i.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── AUTONOMOUS TEAM STATUS ───────────────────────────────── */}
        {agentTeamOverview && (
          <div className="rounded-xl border border-white/[0.06] bg-surface-1 px-5 py-3.5 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Users className="w-3.5 h-3.5 text-accent-cyan" />
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Agent Team</p>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <CommerceStat label="Workspaces" value={agentTeamOverview.activeWorkspaces} />
              <CommerceStat label="Delegations" value={agentTeamOverview.activeDelegations} alert={agentTeamOverview.activeDelegations > 0} />
              <CommerceStat label="Unread" value={agentTeamOverview.unreadMessages} alert={agentTeamOverview.unreadMessages > 0} />
              <CommerceStat label="Pending Research" value={agentTeamOverview.pendingResearch} alert={agentTeamOverview.pendingResearch > 0} />
              <CommerceStat label="Done Today" value={agentTeamOverview.completedDelegationsToday} />
            </div>
            <button
              onClick={() => setActiveView("agent-team")}
              className="ml-auto text-[10px] text-text-ghost hover:text-accent-cyan transition-colors flex items-center gap-1 flex-shrink-0"
            >
              View Team <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* ── EXECUTIVE LOOP WIDGET ────────────────────────────── */}
        {execLoopOverview && (execLoopOverview.activeGoals.length > 0 || execLoopOverview.latestRun) && (
          <div className="rounded-xl border border-white/[0.06] bg-surface-1 px-5 py-3.5 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Zap className="w-4 h-4 text-accent-cyan" />
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Executive Loop</p>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <CommerceStat label="Active Goals" value={execLoopOverview.activeGoals.length} alert={execLoopOverview.activeGoals.length === 0} />
              <CommerceStat label="Open Delegations" value={execLoopOverview.openDelegations} alert={execLoopOverview.openDelegations > 0} />
              <CommerceStat label="Pending Reviews" value={execLoopOverview.pendingReviews} alert={execLoopOverview.pendingReviews > 0} />
            </div>
            {(execLoopOverview.topAgent || execLoopOverview.weakestAgent) && (
              <>
                <div className="h-4 w-px bg-white/[0.06] flex-shrink-0" />
                <div className="flex items-center gap-3 text-[10px]">
                  {execLoopOverview.topAgent && (
                    <span className="text-accent-green">
                      ↑ {agents.find(a => a.id === execLoopOverview.topAgent!.agentId)?.name ?? "Top Agent"} {execLoopOverview.topAgent.overallScore}/10
                    </span>
                  )}
                  {execLoopOverview.weakestAgent && execLoopOverview.weakestAgent.agentId !== execLoopOverview.topAgent?.agentId && (
                    <span className="text-accent-amber">
                      ↓ {agents.find(a => a.id === execLoopOverview.weakestAgent!.agentId)?.name ?? "Weakest"} {execLoopOverview.weakestAgent.overallScore}/10
                    </span>
                  )}
                </div>
              </>
            )}
            {execLoopOverview.latestRun && (
              <>
                <div className="h-4 w-px bg-white/[0.06] flex-shrink-0" />
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-medium",
                  execLoopOverview.latestRun.status === "completed" ? "bg-accent-green/10 text-accent-green" :
                  execLoopOverview.latestRun.status === "failed" ? "bg-accent-red/10 text-accent-red" :
                  "bg-accent-amber/10 text-accent-amber"
                )}>
                  {execLoopOverview.latestRun.status}
                </span>
              </>
            )}
            <button
              onClick={() => setActiveView("executive-loop")}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-medium hover:bg-accent-cyan/15 transition-all flex-shrink-0"
            >
              Exec Loop <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* ── ROW 2: Focus + Revenue Radar + Business Health ──────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Recommended Focus */}
          <div className="rounded-xl border border-white/[0.06] bg-surface-1 overflow-hidden">
            <SectionHeader
              icon={<Star className="w-3.5 h-3.5 text-accent-amber" />}
              label="Recommended Focus"
              action={{ label: "Tasks", onClick: () => setActiveView("tasks") }}
            />
            <div className="p-3 space-y-1">
              {topFocus.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="w-5 h-5 text-accent-green" />}
                  text="Nothing critical. Choose what to push forward next."
                />
              ) : topFocus.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setActiveView(item.view)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors text-left group"
                >
                  <span className={cn(
                    "w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 font-mono",
                    item.urgent ? "bg-accent-red/15 text-accent-red" : "bg-white/[0.04] text-text-muted"
                  )}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-primary group-hover:text-white transition-colors truncate">{item.label}</p>
                    <p className="text-[10px] text-text-muted">{item.sub}</p>
                  </div>
                  <ChevronRight className="w-3 h-3 text-text-ghost group-hover:text-text-muted transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Revenue Radar */}
          <div className="rounded-xl border border-white/[0.06] bg-surface-1 overflow-hidden">
            <SectionHeader
              icon={<DollarSign className="w-3.5 h-3.5 text-accent-green" />}
              label="Revenue Radar"
              action={{ label: "Pipeline", onClick: () => setActiveView("pipeline") }}
            />
            <div className="p-4">
              {radarStages.every(s => s.count === 0) ? (
                <EmptyState
                  icon={<TrendingUp className="w-5 h-5 text-text-ghost" />}
                  text="No leads in pipeline."
                  sub="Open Leads to add your first prospect"
                  onSubClick={() => setActiveView("leads")}
                />
              ) : (
                <div className="space-y-3">
                  {radarStages.map(stage => (
                    <div key={stage.label} className="flex items-center gap-3">
                      <span className="w-16 text-[10px] text-text-muted flex-shrink-0">{stage.label}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (stage.count / Math.max(1, activeLeads.length + (leads.filter(l => l.status === "won").length))) * 100)}%`,
                            backgroundColor: stage.color,
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-text-secondary w-3 text-right flex-shrink-0">{stage.count}</span>
                      <span className="text-[10px] text-text-ghost w-10 text-right flex-shrink-0">
                        {stage.value > 0 ? fmtEuro(stage.value) : ""}
                      </span>
                    </div>
                  ))}
                  {totalPipelineValue > 0 && (
                    <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between">
                      <span className="text-[10px] text-text-muted">Total active pipeline</span>
                      <span className="text-base font-bold text-accent-green">{fmtEuro(totalPipelineValue)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Business Health */}
          <div className="rounded-xl border border-white/[0.06] bg-surface-1 overflow-hidden">
            <SectionHeader
              icon={<BarChart2 className="w-3.5 h-3.5 text-accent-blue" />}
              label="Business Health"
            />
            <div className="px-4 pb-4 pt-3">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-3xl font-bold text-text-primary font-mono leading-none">{overallScore}</p>
                  <p className="text-[10px] text-text-muted mt-1">Overall Score</p>
                </div>
                <ScoreRing value={overallScore} size={54} color={ringColor} />
              </div>
              <div className="space-y-2.5">
                <HealthBar label="Projects"   value={projectsScore}   color="#6366f1" />
                <HealthBar label="Sales"      value={salesScore}      color="#10b981" />
                <HealthBar label="Operations" value={operationsScore} color="#3b82f6" />
                <HealthBar label="Knowledge"  value={knowledgeScore}  color="#8b5cf6" />
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 3: Agent Activity + Mission Control ──────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

          {/* Agent Activity Feed */}
          <div className="md:col-span-2 rounded-xl border border-white/[0.06] bg-surface-1 overflow-hidden">
            <SectionHeader
              icon={<Bot className="w-3.5 h-3.5 text-accent-violet" />}
              label="Agent Activity"
              action={{ label: "Agents", onClick: () => setActiveView("agent-dashboard") }}
            />
            <div className="p-3 space-y-0.5">
              {feedItems.length === 0 ? (
                <EmptyState
                  icon={<Bot className="w-5 h-5 text-text-ghost" />}
                  text="No agent activity yet."
                  sub="Trigger an agent to see runs here"
                  onSubClick={() => setActiveView("agent-registry")}
                />
              ) : feedItems.map(item => (
                <div
                  key={`${item.type}-${item.id}`}
                  className={cn(
                    "flex items-start gap-2.5 px-2.5 py-2 rounded-lg transition-colors",
                    item.urgent
                      ? "bg-accent-amber/[0.06] border border-accent-amber/10"
                      : "hover:bg-white/[0.02]"
                  )}
                >
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full mt-[5px] flex-shrink-0",
                    item.status === "completed" ? "bg-accent-green" :
                    item.status === "running"   ? "bg-accent-blue animate-pulse-slow" :
                    item.status === "failed"    ? "bg-accent-red" :
                    item.status === "pending"   ? "bg-accent-amber" :
                    item.status === "created"   ? "bg-accent-violet" :
                    "bg-text-ghost"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-text-secondary truncate">{item.agentName}</p>
                    <p className="text-[10px] text-text-muted truncate">{item.action}</p>
                  </div>
                  <span className="text-[9px] text-text-ghost flex-shrink-0 mt-0.5 tabular-nums whitespace-nowrap">{fmtFeedTime(item.time)}</span>
                </div>
              ))}
              {(activeAgents.length > 0 || memories.length > 0) && (
                <div className="pt-2 mt-1 border-t border-white/[0.04]">
                  <p className="text-[10px] text-text-ghost text-center">
                    {activeAgents.length} active agent{activeAgents.length !== 1 ? "s" : ""}
                    {memories.length > 0 ? ` · ${memories.length} memories stored` : ""}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Mission Control */}
          <div className="md:col-span-3 rounded-xl border border-white/[0.06] bg-surface-1 overflow-hidden">
            <SectionHeader
              icon={<Shield className="w-3.5 h-3.5 text-accent-red" />}
              label="Mission Control"
              action={{ label: "All tasks", onClick: () => setActiveView("tasks") }}
            />
            <div className="p-3">
              {missionItems.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="w-5 h-5 text-accent-green" />}
                  text="Mission clear — no critical or important items right now."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(["critical", "important", "optional"] as const).map(tier => {
                    const items = missionItems.filter(m => m.tier === tier);
                    const cfg = {
                      critical: { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.12)" },
                      important: { label: "Important", color: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.12)" },
                      optional:  { label: "Optional",  color: "#3b82f6", bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.10)" },
                    }[tier];
                    return (
                      <div
                        key={tier}
                        className="rounded-lg p-2.5 space-y-1.5"
                        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                      >
                        <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: cfg.color }}>
                          {cfg.label}
                        </p>
                        {items.length === 0 ? (
                          <p className="text-[10px] text-text-ghost italic">None</p>
                        ) : items.slice(0, 4).map((item, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveView(item.view)}
                            className="w-full text-left group"
                          >
                            <p className="text-[10px] text-text-secondary group-hover:text-text-primary transition-colors leading-tight line-clamp-2">
                              {item.label}
                            </p>
                            {item.sub && (
                              <p className="text-[9px] text-text-ghost mt-0.5">{item.sub}</p>
                            )}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── ROW 4: Knowledge Growth + Daily Review ───────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Knowledge Growth */}
          <div className="rounded-xl border border-white/[0.06] bg-surface-1 overflow-hidden">
            <SectionHeader
              icon={<Brain className="w-3.5 h-3.5 text-accent-purple" />}
              label="Knowledge Growth"
              action={{ label: "Graph", onClick: () => setActiveView("graph") }}
            />
            <div className="p-3 grid grid-cols-2 gap-2">
              <KnowledgeStat label="Graph Nodes"   value={nodes.length}      color="#6366f1" onClick={() => setActiveView("graph")} />
              <KnowledgeStat label="Notes"         value={notes.length}      color="#f59e0b" onClick={() => setActiveView("notes")} />
              <KnowledgeStat
                label="Captures"
                value={captures.length}
                color="#06b6d4"
                onClick={() => setActiveView("capture")}
                sub={`${processedCaptures.length} processed`}
              />
              <KnowledgeStat
                label="Agent Memory"
                value={memories.length}
                color="#8b5cf6"
                onClick={() => setActiveView("agent-memory")}
              />
            </div>
          </div>

          {/* Daily Review */}
          <div className="md:col-span-2 rounded-xl border border-white/[0.06] bg-surface-1 overflow-hidden">
            <SectionHeader
              icon={<Activity className="w-3.5 h-3.5 text-accent-cyan" />}
              label="Daily Review"
            />
            <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              <ReviewCard
                label="Completed"
                value={completedToday.length}
                color="#10b981"
                icon={<CheckCircle2 className="w-4 h-4 text-accent-green" />}
                sub="tasks today"
                onClick={() => setActiveView("tasks")}
              />
              <ReviewCard
                label="Still Open"
                value={openTasks.length}
                color="#3b82f6"
                icon={<Circle className="w-4 h-4 text-accent-blue" />}
                sub="tasks remaining"
                onClick={() => setActiveView("tasks")}
              />
              <ReviewCard
                label="New Insights"
                value={newCapturesToday.length + newMemoriesToday.length}
                color="#f59e0b"
                icon={<BookOpen className="w-4 h-4 text-accent-amber" />}
                sub="captured today"
                onClick={() => setActiveView("capture")}
              />
              <ReviewCard
                label="Opportunities"
                value={discoveryLeads.length}
                color="#8b5cf6"
                icon={<Layers className="w-4 h-4 text-accent-violet" />}
                sub="in discovery"
                onClick={() => setActiveView("leads")}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── sub-components ───────────────────────────────────────────────

function SectionHeader({
  icon, label, action,
}: {
  icon: ReactNode;
  label: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex items-center justify-between px-4 pt-3.5 pb-3 border-b border-white/[0.04]">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">{label}</span>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-secondary transition-colors"
        >
          {action.label}
          <ArrowRight className="w-3 h-3 ml-0.5" />
        </button>
      )}
    </div>
  );
}

function BriefingStat({ label, value, alert }: { label: string; value: number; alert: boolean }) {
  return (
    <div className="text-center">
      <p className={cn("text-xl font-bold font-mono leading-none mb-0.5", alert ? "text-accent-red" : "text-accent-green")}>
        {value}
      </p>
      <p className="text-[9px] text-text-ghost">{label}</p>
    </div>
  );
}

function ScoreRing({ value, size, color }: { value: number; size: number; color: string }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - value / 100);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth="4"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

function HealthBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-text-muted w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-white/[0.05]">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-mono text-text-secondary w-6 text-right flex-shrink-0">{value}</span>
    </div>
  );
}

function KnowledgeStat({
  label, value, color, onClick, sub,
}: { label: string; value: number; color: string; onClick: () => void; sub?: string }) {
  return (
    <button
      onClick={onClick}
      className="p-2.5 rounded-lg text-left transition-colors hover:bg-white/[0.03]"
      style={{ background: `${color}08` }}
    >
      <p className="text-xl font-bold font-mono leading-none mb-1" style={{ color }}>{value}</p>
      <p className="text-[10px] text-text-muted leading-tight">{label}</p>
      {sub && <p className="text-[9px] text-text-ghost">{sub}</p>}
    </button>
  );
}

function ReviewCard({
  label, value, icon, color, sub, onClick,
}: { label: string; value: number; icon: ReactNode; color: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-3 rounded-xl text-left transition-colors hover:bg-white/[0.03] border border-white/[0.04]"
    >
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-[10px] text-text-muted">{label}</span>
      </div>
      <p className="text-2xl font-bold font-mono leading-none" style={{ color }}>{value}</p>
      <p className="text-[10px] text-text-ghost mt-1">{sub}</p>
    </button>
  );
}

function FleetStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-base font-bold font-mono leading-none" style={{ color }}>{value}</span>
      <span className="text-[10px] text-text-ghost">{label}</span>
    </div>
  );
}

function CommerceStat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("text-base font-bold font-mono leading-none", alert ? "text-accent-amber" : "text-text-secondary")}>{value}</span>
      <span className="text-[10px] text-text-ghost">{label}</span>
    </div>
  );
}

function EmptyState({
  icon, text, sub, onSubClick,
}: { icon: ReactNode; text: string; sub?: string; onSubClick?: () => void }) {
  return (
    <div className="py-6 text-center">
      <div className="flex justify-center mb-2 opacity-40">{icon}</div>
      <p className="text-xs text-text-muted">{text}</p>
      {sub && (
        <button
          onClick={onSubClick}
          className="text-[10px] text-text-ghost mt-1 hover:text-text-muted transition-colors"
        >
          {sub}
        </button>
      )}
    </div>
  );
}
