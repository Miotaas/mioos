"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import {
  Sparkles, Network, Calendar, Wrench, Plug,
  CheckCircle2, Clock, AlertCircle, Play, ChevronRight,
} from "lucide-react";

type Tab = "workflows" | "schedules" | "tools" | "integrations";

interface Workflow {
  id: string;
  name: string;
  status: string;
  triggerType?: string;
  lastRun?: string;
  runCount?: number;
}

interface Schedule {
  id: string;
  name: string;
  status: string;
  cronExpression?: string;
  nextRun?: string;
  lastRun?: string;
}

interface Tool {
  id: string;
  name: string;
  toolType: string;
  status?: string;
  usageCount?: number;
}

function fmtTime(date: string): string {
  if (!date) return "Never";
  const d = new Date(date);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMins < 60)   return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function AutomationView() {
  const { setActiveView } = useAppStore();

  const [tab, setTab]               = useState<Tab>("workflows");
  const [workflows, setWorkflows]   = useState<Workflow[]>([]);
  const [schedules, setSchedules]   = useState<Schedule[]>([]);
  const [tools, setTools]           = useState<Tool[]>([]);
  const [connectors, setConnectors] = useState<{ web: boolean; email: boolean; calendar: boolean }>({
    web: false, email: false, calendar: false,
  });
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/agent-workflows").then(r => r.json()).catch(() => []),
      fetch("/api/agents/schedule").then(r => r.json()).catch(() => []),
      fetch("/api/agents").then(r => r.json()).catch(() => []),
      fetch("/api/connectors/web-search").then(r => r.json()).catch(() => null),
      fetch("/api/connectors/email").then(r => r.json()).catch(() => null),
      fetch("/api/connectors/calendar").then(r => r.json()).catch(() => null),
    ]).then(([wf, sc, ag, web, email, cal]) => {
      setWorkflows(Array.isArray(wf) ? wf : []);
      setSchedules(Array.isArray(sc) ? sc : []);
      const allTools: Tool[] = (Array.isArray(ag) ? ag : []).flatMap((a: { tools?: Tool[] }) => a.tools ?? []);
      setTools(allTools);
      setConnectors({
        web:      web?.status === "connected",
        email:    email?.status === "connected",
        calendar: cal?.status === "connected",
      });
      setLoading(false);
    });
  }, []);

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { id: "workflows",    label: "Workflows",    icon: Network,   count: workflows.length || undefined },
    { id: "schedules",    label: "Schedules",    icon: Calendar,  count: schedules.length || undefined },
    { id: "tools",        label: "Tools",        icon: Wrench,    count: tools.length || undefined },
    { id: "integrations", label: "Integrations", icon: Plug },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1000px] mx-auto px-4 md:px-8 py-6 md:py-10 pb-28 md:pb-10 space-y-6">

        {/* Header */}
        <div>
          <p className="text-[11px] text-text-ghost uppercase tracking-[0.1em] mb-1">Agent OS</p>
          <h1 className="text-2xl md:text-3xl font-semibold text-text-primary tracking-tight">Automation</h1>
          <p className="text-[12px] text-text-muted mt-1">Workflows, schedules, tools, and integrations</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 border-b border-white/[0.06] pb-0">
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-all border-b-2 -mb-[1px]",
                tab === id
                  ? "border-[#00D4FF] text-[#00D4FF]"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {count != null && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-bold",
                  tab === id ? "bg-[#00D4FF]/15 text-[#00D4FF]" : "bg-white/[0.06] text-text-ghost"
                )}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "workflows" && (
          <WorkflowsTab workflows={workflows} loading={loading} />
        )}
        {tab === "schedules" && (
          <SchedulesTab schedules={schedules} loading={loading} />
        )}
        {tab === "tools" && (
          <ToolsTab tools={tools} loading={loading} />
        )}
        {tab === "integrations" && (
          <IntegrationsTab connectors={connectors} onSettings={() => setActiveView("settings")} />
        )}
      </div>
    </div>
  );
}

function WorkflowsTab({ workflows, loading }: { workflows: Workflow[]; loading: boolean }) {
  if (loading) return <LoadingState />;
  if (workflows.length === 0) return (
    <EmptyState
      icon={<Network className="w-6 h-6" />}
      title="No workflows yet"
      sub="Workflows define multi-step agent sequences"
    />
  );

  return (
    <div className="space-y-2">
      {workflows.map(wf => (
        <div
          key={wf.id}
          className="rounded-2xl border border-white/[0.06] bg-[#0e1324] px-5 py-4 flex items-center gap-4 hover:border-white/[0.09] transition-colors"
        >
          <div className={cn(
            "w-2 h-2 rounded-full flex-shrink-0",
            wf.status === "active" ? "bg-accent-green" :
            wf.status === "running" ? "bg-[#00D4FF] animate-pulse-slow" :
            "bg-text-ghost"
          )} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-text-primary">{wf.name}</p>
            <div className="flex items-center gap-3 mt-0.5">
              {wf.triggerType && (
                <span className="text-[11px] text-text-muted font-mono">{wf.triggerType}</span>
              )}
              {wf.lastRun && (
                <span className="text-[11px] text-text-ghost">Last: {fmtTime(wf.lastRun)}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {wf.runCount != null && (
              <span className="text-[11px] text-text-ghost">{wf.runCount} runs</span>
            )}
            <StatusBadge status={wf.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SchedulesTab({ schedules, loading }: { schedules: Schedule[]; loading: boolean }) {
  if (loading) return <LoadingState />;
  if (schedules.length === 0) return (
    <EmptyState
      icon={<Calendar className="w-6 h-6" />}
      title="No schedules configured"
      sub="Schedules run agents automatically at set intervals"
    />
  );

  return (
    <div className="space-y-2">
      {schedules.map(sc => (
        <div
          key={sc.id}
          className="rounded-2xl border border-white/[0.06] bg-[#0e1324] px-5 py-4 flex items-center gap-4 hover:border-white/[0.09] transition-colors"
        >
          <div className={cn(
            "w-2 h-2 rounded-full flex-shrink-0",
            sc.status === "active" ? "bg-accent-green" : "bg-text-ghost"
          )} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-text-primary">{sc.name}</p>
            <div className="flex items-center gap-3 mt-0.5">
              {sc.cronExpression && (
                <span className="text-[11px] text-text-muted font-mono">{sc.cronExpression}</span>
              )}
              {sc.lastRun && (
                <span className="text-[11px] text-text-ghost">Last: {fmtTime(sc.lastRun)}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {sc.nextRun && (
              <div className="text-right">
                <p className="text-[10px] text-text-ghost">Next run</p>
                <p className="text-[11px] text-text-secondary">{fmtTime(sc.nextRun)}</p>
              </div>
            )}
            <StatusBadge status={sc.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ToolsTab({ tools, loading }: { tools: Tool[]; loading: boolean }) {
  if (loading) return <LoadingState />;
  if (tools.length === 0) return (
    <EmptyState
      icon={<Wrench className="w-6 h-6" />}
      title="No tools registered"
      sub="Tools give agents abilities like web search, email, and calendar access"
    />
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {tools.map(tool => (
        <div
          key={tool.id}
          className="rounded-2xl border border-white/[0.06] bg-[#0e1324] px-4 py-3.5 flex items-center gap-3 hover:border-white/[0.09] transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-[#00D4FF]/10 flex items-center justify-center flex-shrink-0">
            <Wrench className="w-3.5 h-3.5 text-[#00D4FF]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-text-primary">{tool.name}</p>
            <p className="text-[11px] text-text-muted">{tool.toolType}</p>
          </div>
          {tool.usageCount != null && (
            <span className="text-[11px] text-text-ghost flex-shrink-0">{tool.usageCount}×</span>
          )}
        </div>
      ))}
    </div>
  );
}

function IntegrationsTab({
  connectors, onSettings,
}: {
  connectors: { web: boolean; email: boolean; calendar: boolean };
  onSettings: () => void;
}) {
  const integrations = [
    {
      id: "web",
      name: "Web Search",
      description: "Agents can search the web for market intelligence",
      connected: connectors.web,
      setup: "Configured via API key in Settings",
    },
    {
      id: "email",
      name: "Email (IMAP)",
      description: "Read and analyze incoming emails for business signals",
      connected: connectors.email,
      setup: "Requires IMAP credentials",
    },
    {
      id: "calendar",
      name: "Calendar",
      description: "Import events via iCal feed for deadline and meeting awareness",
      connected: connectors.calendar,
      setup: "Paste your iCal feed URL in Settings",
    },
    {
      id: "google",
      name: "Google Calendar",
      description: "Sync meetings, deadlines, and events automatically",
      connected: false,
      setup: "Coming soon",
      comingSoon: true,
    },
    {
      id: "outlook",
      name: "Outlook / Microsoft 365",
      description: "Integrate with Microsoft calendar and email",
      connected: false,
      setup: "Coming soon",
      comingSoon: true,
    },
  ] as const;

  return (
    <div className="space-y-2">
      {integrations.map(int => (
        <div
          key={int.id}
          className={cn(
            "rounded-2xl border bg-[#0e1324] px-5 py-4 flex items-center gap-4 transition-colors",
            int.connected
              ? "border-accent-green/20 bg-accent-green/[0.02]"
              : "border-white/[0.06] hover:border-white/[0.09]"
          )}
        >
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
            int.connected ? "bg-accent-green/10" : "bg-white/[0.04]"
          )}>
            <Plug className={cn("w-4 h-4", int.connected ? "text-accent-green" : "text-text-ghost")} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-medium text-text-primary">{int.name}</p>
              {"comingSoon" in int && int.comingSoon && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/[0.06] text-text-ghost">
                  Soon
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">{int.description}</p>
            <p className="text-[10px] text-text-ghost mt-0.5">{int.setup}</p>
          </div>
          <div className="flex-shrink-0">
            {int.connected ? (
              <div className="flex items-center gap-1.5 text-accent-green text-[12px] font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected
              </div>
            ) : "comingSoon" in int && int.comingSoon ? (
              <span className="text-[11px] text-text-ghost">Planned</span>
            ) : (
              <button
                onClick={onSettings}
                className="px-3 py-1.5 rounded-xl border border-white/[0.08] text-[12px] text-text-muted hover:text-text-secondary hover:border-white/[0.12] transition-all"
              >
                Configure
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "px-2 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide",
      status === "active"   ? "bg-accent-green/10 text-accent-green" :
      status === "running"  ? "bg-[#00D4FF]/10 text-[#00D4FF]" :
      status === "paused"   ? "bg-accent-amber/10 text-accent-amber" :
      status === "error"    ? "bg-accent-red/10 text-accent-red" :
      "bg-white/[0.06] text-text-ghost"
    )}>
      {status}
    </span>
  );
}

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0e1324] py-14 text-center">
      <div className="flex justify-center mb-3 opacity-20">{icon}</div>
      <p className="text-[13px] font-medium text-text-muted">{title}</p>
      <p className="text-[11px] text-text-ghost mt-1">{sub}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl border border-white/[0.06] bg-[#0e1324] px-5 py-4 h-16 animate-pulse" />
      ))}
    </div>
  );
}
