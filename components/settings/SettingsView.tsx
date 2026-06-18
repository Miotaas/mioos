"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Info, Shield, Activity, Bot, Server, CheckCircle2, XCircle,
  Loader2, LogOut, AlertTriangle, Power, Database, Clock, Plug,
  Calendar, ExternalLink, Gauge, Play, Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { IntegrationsView } from "@/components/integrations/IntegrationsView";

async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

interface HealthData {
  status: string;
  version: string;
  timestamp: string;
  db: { ok: boolean };
  auth: { configured: boolean };
  scheduler: { enabled: boolean };
  autonomy: { paused: boolean };
  agents: { active: number };
}

function SectionHeader({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-7 h-7 rounded-lg bg-surface-3 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-text-muted" />
      </div>
      <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={cn("text-xs font-medium text-text-secondary", valueClass)}>{value}</span>
    </div>
  );
}

function StatusBadge({ ok, labelOk, labelFail }: { ok: boolean; labelOk: string; labelFail: string }) {
  return ok ? (
    <span className="flex items-center gap-1.5 text-accent-green">
      <CheckCircle2 className="w-3.5 h-3.5" /> {labelOk}
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-accent-red">
      <XCircle className="w-3.5 h-3.5" /> {labelFail}
    </span>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-surface-2 border border-white/[0.06] rounded-xl p-5", className)}>
      {children}
    </div>
  );
}

interface ConnectorInfo {
  provider: string;
  label: string;
  connected: boolean;
  message: string;
  note: string;
}

type SettingsTab = "overview" | "integrations" | "runtime";

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("overview");
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [healthLoading, setHealthLoading] = useState(true);
  const [autonomyLoading, setAutonomyLoading] = useState(false);
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);
  const [aiConfig, setAiConfig]     = useState<{ provider: string; model: string; enabled: boolean; hasApiKey: boolean } | null>(null);
  const [aiTesting, setAiTesting]   = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ ok: boolean; latency?: number; message?: string; response?: string } | null>(null);

  type AutonLevel = "off" | "conservative" | "normal" | "aggressive";
  interface TeamStat {
    slug: string;
    name: string;
    todayRuns: number;
    dailyLimit: number;
    activeAssignments: number;
    status: "off" | "at_limit" | "busy" | "ready";
  }
  interface WorkforceAutonomyStatus {
    level: AutonLevel;
    dailyLimit: number;
    teams: TeamStat[];
  }
  const [workforceAutonomy, setWorkforceAutonomy]       = useState<WorkforceAutonomyStatus | null>(null);
  const [workforceSaving,   setWorkforceSaving]         = useState(false);

  type FocusMode = "conservative" | "normal" | "aggressive";
  interface ThrottleStatus {
    mode: FocusMode;
    limits: {
      maxDailyOpportunitiesTotal: number;
      maxDailyOpportunitiesByType: Record<string, number>;
      maxDailyWorkflowsRouted: number;
      maxPendingApprovals: number;
      maxActiveOpportunities: number;
      maxActivePipelineProjects: number;
    };
    current: {
      dailyOpportunitiesCreated: number;
      activeOpportunities: number;
      pendingApprovals: number;
      dailyWorkflowsRouted: number;
      activePipelineProjects: number;
    };
    breaches: string[];
    lastPauseReason: string | null;
  }
  const [throttle, setThrottle]       = useState<ThrottleStatus | null>(null);
  const [throttleSaving, setThrottleSaving] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const nodeEnv = process.env.NODE_ENV ?? "development";

  async function loadHealth() {
    setHealthLoading(true);
    setHealthError(false);
    try {
      const d = await fetch("/api/health").then(r => r.json());
      setHealth(d);
    } catch {
      setHealthError(true);
    } finally {
      setHealthLoading(false);
    }
  }

  async function toggleAutonomy() {
    if (!health) return;
    setAutonomyLoading(true);
    try {
      const newPaused = !health.autonomy.paused;
      await fetch("/api/autonomy/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: newPaused }),
      });
      setHealth(prev => prev ? { ...prev, autonomy: { paused: newPaused } } : prev);
    } finally {
      setAutonomyLoading(false);
    }
  }

  async function setFocusMode(mode: FocusMode) {
    setThrottleSaving(true);
    try {
      await fetch("/api/autonomy/focus-mode", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ mode }),
      });
      setThrottle(prev => prev ? { ...prev, mode } : prev);
    } finally {
      setThrottleSaving(false);
    }
  }

  const [runtimeTriggerLoading, setRuntimeTriggerLoading] = useState(false);
  const [runtimeTriggerResult,  setRuntimeTriggerResult]  = useState<string | null>(null);
  const [heartbeat, setHeartbeat] = useState<string | null>(null);

  const loadHeartbeat = useCallback(async () => {
    try {
      const h = await fetch("/api/health").then(r => r.json()).catch(() => null);
      if (h?.timestamp) setHeartbeat(h.timestamp);
    } catch { /* non-fatal */ }
  }, []);

  async function triggerRuntime() {
    setRuntimeTriggerLoading(true);
    setRuntimeTriggerResult(null);
    try {
      const res  = await fetch("/api/runtime/trigger", { method: "POST" });
      const body = await res.json() as { ok: boolean; elapsed?: number; teamWork?: { queued: number } };
      setRuntimeTriggerResult(
        body.ok
          ? `Triggered — ${body.elapsed}ms · ${body.teamWork?.queued ?? 0} team item(s) queued`
          : "Trigger failed"
      );
      loadHeartbeat();
    } catch {
      setRuntimeTriggerResult("Request failed");
    } finally {
      setRuntimeTriggerLoading(false);
    }
  }

  async function setWorkforceLevel(level: AutonLevel) {
    setWorkforceSaving(true);
    try {
      const res = await fetch("/api/settings/workforce-autonomy", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ level }),
      });
      if (res.ok) {
        const fresh = await fetch("/api/settings/workforce-autonomy").then(r => r.json()).catch(() => null);
        if (fresh) setWorkforceAutonomy(fresh);
      }
    } finally {
      setWorkforceSaving(false);
    }
  }

  useEffect(() => {
    fetch("/api/autonomy/focus-mode").then(r => r.json()).then(setThrottle).catch(() => {});
    fetch("/api/ai/config").then(r => r.json()).then(setAiConfig).catch(() => {});
    fetch("/api/settings/workforce-autonomy").then(r => r.json()).then(setWorkforceAutonomy).catch(() => {});
    loadHeartbeat();
    loadHealth();
    Promise.all([
      fetch("/api/connectors/web-search").then(r => r.json()).catch(() => null),
      fetch("/api/connectors/email").then(r => r.json()).catch(() => null),
      fetch("/api/connectors/calendar").then(r => r.json()).catch(() => null),
    ]).then(([ws, em, cal]) => {
      const items: ConnectorInfo[] = [
        {
          provider: "web_search",
          label: "Web Search",
          connected: ws?.connected ?? false,
          message: ws?.message ?? "Status unavailable",
          note: "Set SERPER_API_KEY or TAVILY_API_KEY",
        },
        {
          provider: "email",
          label: "Email (IMAP)",
          connected: em?.connected ?? false,
          message: em?.message ?? "Status unavailable",
          note: "Set EMAIL_IMAP_HOST, EMAIL_IMAP_USER, EMAIL_IMAP_PASS",
        },
        {
          provider: "calendar",
          label: "Calendar (iCal)",
          connected: cal?.connected ?? false,
          message: cal?.message ?? "Status unavailable",
          note: "Set CALENDAR_ICAL_URL",
        },
      ];
      setConnectors(items);
    }).catch(() => {});
  }, [loadHeartbeat]);

  const isPaused = health?.autonomy.paused ?? false;

  const TABS: { id: SettingsTab; label: string }[] = [
    { id: "overview",     label: "Overview" },
    { id: "integrations", label: "Integrations" },
    { id: "runtime",      label: "Runtime" },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text-primary">Settings</h1>
          <p className="text-xs text-text-muted mt-1">System configuration and status</p>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex gap-1 mb-6 p-1 bg-surface-2 border border-white/[0.06] rounded-xl">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all",
                activeTab === t.id
                  ? "bg-surface-3 text-text-primary"
                  : "text-text-ghost hover:text-text-muted"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Integrations tab ── */}
        {activeTab === "integrations" && (
          <IntegrationsView />
        )}

        {/* ── Runtime tab ── */}
        {activeTab === "runtime" && (
          <div className="space-y-4">

            {/* Emergency Stop */}
            <Card className={cn(
              "border transition-colors",
              isPaused ? "border-accent-amber/40 bg-accent-amber/[0.04]" : "border-white/[0.06]"
            )}>
              <SectionHeader icon={Power} title="Emergency Stop" />
              {isPaused && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-amber/10 border border-accent-amber/20 mb-4">
                  <AlertTriangle className="w-3.5 h-3.5 text-accent-amber flex-shrink-0" />
                  <p className="text-xs text-accent-amber font-medium">
                    Autonomy is paused — all scheduled agents, workflows, and delegations are halted.
                  </p>
                </div>
              )}
              <p className="text-xs text-text-muted mb-4 leading-relaxed">
                Immediately halts all autonomous execution. Data is preserved.
                Resume restores normal operation.
              </p>
              <Row label="Schedules"   value={isPaused ? <span className="text-accent-amber">Paused</span> : <span className="text-accent-green">Running</span>} />
              <Row label="Workflows"   value={isPaused ? <span className="text-accent-amber">Paused</span> : <span className="text-accent-green">Running</span>} />
              <Row label="Delegations" value={isPaused ? <span className="text-accent-amber">Paused</span> : <span className="text-accent-green">Running</span>} />
              <Row label="Executions"  value={isPaused ? <span className="text-accent-amber">Paused</span> : <span className="text-accent-green">Running</span>} />
              <div className="pt-4">
                <button
                  onClick={toggleAutonomy}
                  disabled={autonomyLoading || healthLoading}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border",
                    isPaused
                      ? "bg-accent-green/10 border-accent-green/30 text-accent-green hover:bg-accent-green/15"
                      : "bg-accent-red/10 border-accent-red/30 text-accent-red hover:bg-accent-red/15",
                    (autonomyLoading || healthLoading) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {autonomyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                  {isPaused ? "Resume Autonomy" : "Emergency Stop"}
                </button>
              </div>
            </Card>

            {/* Workforce Autonomy */}
            <Card>
              <SectionHeader icon={Cpu} title="Workforce Autonomy" />
              <p className="text-xs text-text-muted mb-4 leading-relaxed">
                Controls how often each autonomous team runs per day without manual dispatch.
                Conservative = 1 output/team/day. Emergency Stop always overrides.
              </p>
              {workforceAutonomy ? (
                <>
                  <div className="flex gap-2 mb-5">
                    {(["off", "conservative", "normal", "aggressive"] as AutonLevel[]).map(lvl => (
                      <button
                        key={lvl}
                        disabled={workforceSaving || isPaused}
                        onClick={() => setWorkforceLevel(lvl)}
                        className={cn(
                          "flex-1 py-2 px-2 rounded-lg text-xs font-semibold border transition-all capitalize",
                          workforceAutonomy.level === lvl
                            ? lvl === "off"
                              ? "bg-white/[0.08] border-white/20 text-text-primary"
                              : lvl === "conservative"
                                ? "bg-accent-amber/10 border-accent-amber/40 text-accent-amber"
                                : lvl === "normal"
                                  ? "bg-accent-cyan/10 border-accent-cyan/40 text-accent-cyan"
                                  : "bg-accent-green/10 border-accent-green/40 text-accent-green"
                            : "bg-transparent border-white/[0.06] text-text-ghost hover:border-white/[0.12] hover:text-text-muted",
                          (workforceSaving || isPaused) && "opacity-50 cursor-not-allowed",
                        )}
                      >
                        {workforceSaving && workforceAutonomy.level === lvl
                          ? <span className="flex items-center justify-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />{lvl}</span>
                          : lvl}
                      </button>
                    ))}
                  </div>
                  {workforceAutonomy.teams.map(team => (
                    <div key={team.slug} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                      <span className="text-xs text-text-muted">{team.name}</span>
                      <span className={cn(
                        "text-xs font-medium",
                        team.status === "ready"    ? "text-accent-green"
                        : team.status === "off"    ? "text-text-ghost"
                        : team.status === "busy"   ? "text-accent-cyan"
                        : "text-accent-amber"
                      )}>
                        {team.status === "off"       ? "off"
                        : team.status === "at_limit" ? `${team.todayRuns}/${team.dailyLimit} today`
                        : team.status === "busy"     ? `${team.activeAssignments} active`
                        : `${team.todayRuns}/${team.dailyLimit} · ready`}
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-xs text-text-ghost">Loading…</p>
              )}
            </Card>

            {/* Founder Focus Mode */}
            <Card>
              <SectionHeader icon={Gauge} title="Founder Focus Mode" />
              <p className="text-xs text-text-muted mb-4 leading-relaxed">
                Controls how aggressively the opportunity engine discovers and routes.
              </p>
              {throttle ? (
                <>
                  <div className="flex gap-2 mb-4">
                    {(["conservative", "normal", "aggressive"] as FocusMode[]).map(m => (
                      <button
                        key={m}
                        disabled={throttleSaving}
                        onClick={() => setFocusMode(m)}
                        className={cn(
                          "flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all capitalize",
                          throttle.mode === m
                            ? m === "conservative"
                              ? "bg-accent-amber/10 border-accent-amber/40 text-accent-amber"
                              : m === "normal"
                                ? "bg-accent-cyan/10 border-accent-cyan/40 text-accent-cyan"
                                : "bg-accent-green/10 border-accent-green/40 text-accent-green"
                            : "bg-transparent border-white/[0.06] text-text-ghost hover:border-white/[0.12] hover:text-text-muted",
                          throttleSaving && "opacity-50 cursor-not-allowed",
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <Row label="Daily opportunities" value={`${throttle.current.dailyOpportunitiesCreated} / ${throttle.limits.maxDailyOpportunitiesTotal}`} />
                  <Row label="Pending approvals"   value={`${throttle.current.pendingApprovals} / ${throttle.limits.maxPendingApprovals}`} />
                </>
              ) : (
                <p className="text-xs text-text-ghost">Loading…</p>
              )}
            </Card>

            {/* Cron / Runtime Trigger */}
            <Card>
              <SectionHeader icon={Clock} title="Runtime Trigger" />
              <p className="text-xs text-text-muted mb-4 leading-relaxed">
                The runtime trigger runs all background tasks: team work queue, handoffs,
                objectives, and signal processing. Trigger manually for immediate execution.
              </p>
              <Row
                label="Scheduler"
                value={
                  healthLoading ? <span className="text-text-ghost">checking…</span>
                    : health?.scheduler.enabled
                      ? <span className="flex items-center gap-1.5 text-accent-green"><CheckCircle2 className="w-3.5 h-3.5" /> Cron active</span>
                      : <span className="text-text-ghost">Not configured (dev mode)</span>
                }
              />
              <Row
                label="Last run"
                value={
                  heartbeat
                    ? new Date(heartbeat).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                    : "—"
                }
              />
              {runtimeTriggerResult && (
                <p className="text-xs text-accent-green mt-2">{runtimeTriggerResult}</p>
              )}
              <div className="pt-4">
                <button
                  onClick={triggerRuntime}
                  disabled={runtimeTriggerLoading || isPaused}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border",
                    "bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/15",
                    (runtimeTriggerLoading || isPaused) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {runtimeTriggerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Trigger now
                </button>
              </div>
            </Card>

          </div>
        )}

        {/* ── Overview tab ── */}
        {activeTab === "overview" && (
        <div className="space-y-4">

          {/* ── App Info ──────────────────────────────────────────── */}
          <Card>
            <SectionHeader icon={Info} title="App Info" />
            <Row label="App name" value="MioOS" />
            <Row label="Version" value={health?.version ?? "0.1.0"} />
            <Row
              label="Environment"
              value={nodeEnv}
              valueClass={nodeEnv === "production" ? "text-accent-green" : "text-accent-violet"}
            />
            <Row label="App URL" value={appUrl} />
          </Card>

          {/* ── Account / Access ──────────────────────────────────── */}
          <Card>
            <SectionHeader icon={Shield} title="Account & Access" />
            <Row label="Auth mode" value="Private owner login" />
            <Row label="Session" value="HMAC-SHA256 · 7-day expiry" />
            <Row label="Cookie security" value="HttpOnly · SameSite=Strict" />
            <Row
              label="Secrets configured"
              value={
                healthLoading ? <span className="text-text-ghost">checking…</span>
                  : health ? <StatusBadge ok={health.auth.configured} labelOk="All set" labelFail="Missing secrets" />
                  : <span className="text-text-ghost">—</span>
              }
            />
            <div className="pt-3">
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-accent-red bg-accent-red/[0.08] hover:bg-accent-red/[0.14] border border-accent-red/20 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          </Card>

          {/* ── System Health ─────────────────────────────────────── */}
          <Card>
            <SectionHeader icon={Activity} title="System Health" />
            <Row
              label="API"
              value={
                healthLoading ? (
                  <span className="flex items-center gap-1.5 text-text-muted">
                    <Loader2 className="w-3 h-3 animate-spin" /> checking…
                  </span>
                ) : healthError ? (
                  <span className="flex items-center gap-1.5 text-accent-red">
                    <XCircle className="w-3.5 h-3.5" /> unreachable
                  </span>
                ) : (
                  <StatusBadge ok={health?.status === "ok"} labelOk="ok" labelFail="degraded" />
                )
              }
            />
            <Row
              label="Database"
              value={
                healthLoading ? <span className="text-text-ghost">checking…</span>
                  : health ? <StatusBadge ok={health.db.ok} labelOk="connected" labelFail="error" />
                  : <span className="text-text-ghost">—</span>
              }
            />
            <Row
              label="Scheduler"
              value={
                healthLoading ? <span className="text-text-ghost">checking…</span>
                  : health ? (
                    health.scheduler.enabled
                      ? <span className="flex items-center gap-1.5 text-accent-green"><Clock className="w-3.5 h-3.5" /> enabled</span>
                      : <span className="text-text-ghost">disabled (dev)</span>
                  ) : <span className="text-text-ghost">—</span>
              }
            />
            <Row
              label="Active agents"
              value={healthLoading ? "…" : String(health?.agents.active ?? 0)}
            />
            {health?.timestamp && (
              <Row label="Last checked" value={new Date(health.timestamp).toLocaleTimeString()} />
            )}
            <div className="pt-3">
              <button
                onClick={loadHealth}
                className="text-xs text-text-ghost hover:text-text-secondary transition-colors"
              >
                Refresh status
              </button>
            </div>
          </Card>

          {/* ── Database ──────────────────────────────────────────── */}
          <Card>
            <SectionHeader icon={Database} title="Database" />
            <Row label="ORM" value="Prisma 6" />
            <Row label="Provider" value="SQLite (local)" />
            <Row label="Dev path" value="prisma/mioos.db" />
            <Row label="Prod path" value="/data/mioos.db (Docker volume)" />
            <p className="text-xs text-text-ghost mt-3 leading-relaxed">
              PostgreSQL can be used in production by updating DATABASE_URL and the Prisma
              provider. Run <code className="text-text-secondary">prisma migrate deploy</code> after switching.
            </p>
          </Card>

          {/* ── AI Settings ───────────────────────────────────────── */}
          <Card>
            <SectionHeader icon={Bot} title="AI Provider" />
            {aiConfig ? (
              <>
                <Row
                  label="Provider"
                  value={aiConfig.provider.charAt(0).toUpperCase() + aiConfig.provider.slice(1)}
                />
                <Row label="Model" value={aiConfig.model} />
                <Row
                  label="Status"
                  value={<StatusBadge ok={aiConfig.enabled} labelOk="Live" labelFail="Template mode" />}
                />
                <Row
                  label="API key"
                  value={aiConfig.hasApiKey ? "Configured" : "Not set"}
                  valueClass={aiConfig.hasApiKey ? "text-accent-green" : "text-text-ghost"}
                />
              </>
            ) : (
              <div className="py-2 text-xs text-text-ghost">Loading config…</div>
            )}

            <div className="mt-3 flex items-center gap-2">
              <button
                disabled={aiTesting}
                onClick={async () => {
                  setAiTesting(true);
                  setAiTestResult(null);
                  try {
                    const r = await fetch("/api/ai/test", { method: "POST" }).then(d => d.json()) as { ok: boolean; latency?: number; message?: string; response?: string };
                    setAiTestResult(r);
                  } catch {
                    setAiTestResult({ ok: false, message: "Request failed" });
                  } finally {
                    setAiTesting(false);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/[0.04] border border-white/[0.06] text-text-secondary hover:bg-white/[0.07] disabled:opacity-40 transition-all"
              >
                {aiTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                Test connection
              </button>
              {aiTestResult && (
                <span className={cn("text-xs", aiTestResult.ok ? "text-accent-green" : "text-accent-red")}>
                  {aiTestResult.ok ? `OK · ${aiTestResult.latency}ms` : aiTestResult.message ?? "Failed"}
                </span>
              )}
            </div>

            <p className="text-xs text-text-ghost mt-3 leading-relaxed">
              Set <code className="text-text-secondary">AI_PROVIDER=claude|openai|openrouter|ollama</code> and the
              corresponding API key in <code className="text-text-secondary">.env.local</code>.
            </p>
          </Card>

          {/* ── Intelligence Connectors ───────────────────────────── */}
          <Card>
            <SectionHeader icon={Plug} title="Intelligence Connectors" />
            <p className="text-xs text-text-muted mb-4 leading-relaxed">
              Read-only connectors for external awareness. Agents may read and summarize.
              No writing, sending, or publishing is possible through these connectors.
            </p>
            {connectors.length === 0 ? (
              <p className="text-xs text-text-ghost">Loading connector status…</p>
            ) : (
              <div className="space-y-0">
                {connectors.map(c => (
                  <div key={c.provider} className="py-2.5 border-b border-white/[0.04] last:border-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-text-muted">{c.label}</span>
                      {c.connected ? (
                        <span className="flex items-center gap-1.5 text-xs text-accent-green">
                          <CheckCircle2 className="w-3 h-3" /> Connected
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-text-ghost">
                          <XCircle className="w-3 h-3" /> Disconnected
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-text-ghost leading-snug">
                      {c.connected ? c.message : c.note}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ── Calendar Integration ─────────────────────────────── */}
          <Card>
            <SectionHeader icon={Calendar} title="Calendar Integration" />
            <p className="text-xs text-text-muted mb-4 leading-relaxed">
              Connect your calendar to see meetings, deadlines and tasks in one place on the dashboard.
            </p>

            {/* Google Calendar */}
            <div className="py-3 border-b border-white/[0.04]">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-xs text-text-muted font-medium">Google Calendar</span>
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-white/[0.06] text-text-ghost">OAuth</span>
                </div>
                <a
                  href="/api/auth/google/calendar"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] text-[11px] text-text-secondary hover:border-[#00D4FF]/30 hover:text-[#00D4FF] transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                  Connect
                </a>
              </div>
              <p className="text-[10px] text-text-ghost">
                Requires Google OAuth credentials in GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
              </p>
            </div>

            {/* iCal feed */}
            <div className="py-3 border-b border-white/[0.04]">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-xs text-text-muted font-medium">iCal / .ics Feed</span>
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-white/[0.06] text-text-ghost">URL</span>
                </div>
                <span className="text-[10px] text-text-ghost">Works with Samsung, Outlook, Apple</span>
              </div>
              <p className="text-[10px] text-text-ghost">
                Set <code className="text-text-secondary font-mono">CALENDAR_ICAL_URL</code> in your environment to any public iCal feed URL
              </p>
            </div>

            {/* CalDAV */}
            <div className="py-3 border-b border-white/[0.04]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-muted font-medium">CalDAV</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-white/[0.06] text-text-ghost">Planned</span>
              </div>
              <p className="text-[10px] text-text-ghost">Full two-way sync via CalDAV protocol — coming in a future release</p>
            </div>

            {/* Apple Calendar */}
            <div className="py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-muted font-medium">Apple Calendar</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-white/[0.06] text-text-ghost">Planned</span>
              </div>
              <p className="text-[10px] text-text-ghost">Export an iCal feed from Apple Calendar to connect now, or use native sync when available</p>
            </div>
          </Card>

          {/* ── Deployment ────────────────────────────────────────── */}
          <Card>
            <SectionHeader icon={Server} title="Deployment" />
            <Row label="Domain" value={appUrl.replace(/^https?:\/\//, "") || "localhost:3000"} />
            <Row
              label="Mode"
              value={nodeEnv === "production" ? (
                <span className="flex items-center gap-1.5 text-accent-green">
                  <CheckCircle2 className="w-3.5 h-3.5" /> production
                </span>
              ) : (
                <span className="text-text-ghost">local dev</span>
              )}
            />
            <Row label="Container" value={process.env.DOCKER_ENV ? "Docker" : "bare process"} />
            <Row label="Reverse proxy" value="Caddy (HTTPS termination)" />
          </Card>

        </div>
        )}

      </div>
    </div>
  );
}
