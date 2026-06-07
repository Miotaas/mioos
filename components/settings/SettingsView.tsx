"use client";

import { useEffect, useState } from "react";
import {
  Info, Shield, Activity, Bot, Server, CheckCircle2, XCircle,
  Loader2, LogOut, AlertTriangle, Power, Database, Clock, Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export function SettingsView() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [healthLoading, setHealthLoading] = useState(true);
  const [autonomyLoading, setAutonomyLoading] = useState(false);
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);

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

  useEffect(() => {
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
  }, []);

  const isPaused = health?.autonomy.paused ?? false;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-text-primary">Settings</h1>
          <p className="text-xs text-text-muted mt-1">System configuration and status</p>
        </div>

        <div className="space-y-4">

          {/* ── Emergency Stop ─────────────────────────────────────── */}
          <Card className={cn(
            "border transition-colors",
            isPaused ? "border-accent-amber/40 bg-accent-amber/[0.04]" : "border-white/[0.06]"
          )}>
            <SectionHeader icon={Power} title="Autonomy Control" />

            {isPaused && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-amber/10 border border-accent-amber/20 mb-4">
                <AlertTriangle className="w-3.5 h-3.5 text-accent-amber flex-shrink-0" />
                <p className="text-xs text-accent-amber font-medium">
                  Autonomy is paused — all scheduled agents, workflows, and delegations are halted.
                </p>
              </div>
            )}

            <p className="text-xs text-text-muted mb-4 leading-relaxed">
              Emergency stop halts all autonomous execution: schedules, workflows, delegations,
              and execution pipelines. Agent data is preserved. Resume restores normal operation.
            </p>

            <Row label="Schedules" value={isPaused ? <span className="text-accent-amber">Paused</span> : <span className="text-accent-green">Running</span>} />
            <Row label="Workflows" value={isPaused ? <span className="text-accent-amber">Paused</span> : <span className="text-accent-green">Running</span>} />
            <Row label="Delegations" value={isPaused ? <span className="text-accent-amber">Paused</span> : <span className="text-accent-green">Running</span>} />
            <Row label="Executions" value={isPaused ? <span className="text-accent-amber">Paused</span> : <span className="text-accent-green">Running</span>} />

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
                {autonomyLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Power className="w-4 h-4" />
                )}
                {isPaused ? "Resume Autonomy" : "Emergency Stop"}
              </button>
            </div>
          </Card>

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
            <SectionHeader icon={Bot} title="AI Settings" />
            <Row
              label="Provider"
              value={process.env.NEXT_PUBLIC_AI_ENABLED === "true" ? "Anthropic (live)" : "Mock (rule-based)"}
            />
            <Row
              label="API key"
              value={process.env.NEXT_PUBLIC_AI_ENABLED === "true" ? "Configured" : "Not set"}
              valueClass={process.env.NEXT_PUBLIC_AI_ENABLED === "true" ? "text-accent-green" : "text-text-ghost"}
            />
            <p className="text-xs text-text-ghost mt-3 leading-relaxed">
              Set ANTHROPIC_API_KEY and NEXT_PUBLIC_AI_ENABLED=true to enable live AI in agents.
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
      </div>
    </div>
  );
}
