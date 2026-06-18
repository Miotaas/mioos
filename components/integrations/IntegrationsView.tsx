"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2, XCircle, AlertCircle, Loader2, Plug, RefreshCw,
  Link2Off, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CATEGORY_ORDER, CATEGORY_LABELS, MODE_LABELS, MODE_DESCRIPTIONS,
  ConnectorCategory, ConnectorMode,
} from "@/lib/integrations/connector-catalog";

interface ConnectorState {
  slug:          string;
  name:          string;
  category:      ConnectorCategory;
  categoryLabel: string;
  authType:      string;
  description:   string;
  safetyNote:    string;
  isPlaceholder: boolean;
  envKeys:       string[];
  status:        "not_connected" | "connected" | "error";
  mode:          ConnectorMode;
  maskedHint:    string | null;
  lastTestedAt:  string | null;
  lastSyncAt:    string | null;
  lastError:     string | null;
}

const MODE_OPTIONS: ConnectorMode[] = [
  "disabled", "draft_only", "approval_required", "autonomous_limited",
];

function StatusBadge({ status }: { status: ConnectorState["status"] }) {
  if (status === "connected") {
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-accent-green">
        <CheckCircle2 className="w-3 h-3" /> Connected
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-accent-red">
        <AlertCircle className="w-3 h-3" /> Error
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[11px] font-medium text-text-ghost">
      <XCircle className="w-3 h-3" /> Not connected
    </span>
  );
}

function ConnectorCard({
  connector,
  onRefresh,
}: {
  connector: ConnectorState;
  onRefresh: () => void;
}) {
  const [testing,       setTesting]       = useState(false);
  const [testResult,    setTestResult]     = useState<{ ok: boolean; message: string } | null>(null);
  const [modeChanging,  setModeChanging]   = useState(false);
  const [connecting,    setConnecting]     = useState(false);
  const [disconnecting, setDisconnecting]  = useState(false);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/integrations/${connector.slug}/test`, { method: "POST" });
      const body = await res.json() as { ok: boolean; message: string };
      setTestResult(body);
      onRefresh();
    } catch {
      setTestResult({ ok: false, message: "Request failed" });
    } finally {
      setTesting(false);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const res  = await fetch(`/api/integrations/${connector.slug}/connect`, { method: "POST" });
      const body = await res.json() as { error?: string; instruction?: string };
      if (!res.ok) {
        setTestResult({ ok: false, message: body.instruction ?? body.error ?? "Connection failed" });
      }
      onRefresh();
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch(`/api/integrations/${connector.slug}/disconnect`, { method: "POST" });
      onRefresh();
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleMode(mode: ConnectorMode) {
    setModeChanging(true);
    try {
      await fetch(`/api/integrations/${connector.slug}/mode`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ mode }),
      });
      onRefresh();
    } finally {
      setModeChanging(false);
    }
  }

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <div className={cn(
      "bg-surface-2 border rounded-xl p-4 space-y-3 transition-colors",
      connector.isPlaceholder
        ? "border-white/[0.04] opacity-60"
        : connector.status === "connected"
          ? "border-white/[0.08]"
          : connector.status === "error"
            ? "border-accent-red/20"
            : "border-white/[0.06]",
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center">
            <Plug className="w-3.5 h-3.5 text-text-muted" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">{connector.name}</span>
              {connector.isPlaceholder && (
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-white/[0.06] text-text-ghost font-medium">
                  Planned
                </span>
              )}
            </div>
            <StatusBadge status={connector.status} />
          </div>
        </div>
        {connector.maskedHint && (
          <span className="text-[10px] text-text-ghost font-mono mt-0.5">{connector.maskedHint}</span>
        )}
      </div>

      {/* Description */}
      <p className="text-[11px] text-text-muted leading-relaxed">{connector.description}</p>

      {/* Mode selector */}
      {!connector.isPlaceholder && (
        <div>
          <p className="text-[10px] text-text-ghost mb-1.5 uppercase tracking-wide font-medium">Operating mode</p>
          <div className="grid grid-cols-2 gap-1.5">
            {MODE_OPTIONS.map(m => (
              <button
                key={m}
                disabled={modeChanging}
                onClick={() => handleMode(m)}
                title={MODE_DESCRIPTIONS[m]}
                className={cn(
                  "px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all text-left leading-tight",
                  connector.mode === m
                    ? m === "disabled"
                      ? "bg-white/[0.06] border-white/20 text-text-secondary"
                      : m === "draft_only"
                        ? "bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan"
                        : m === "approval_required"
                          ? "bg-accent-amber/10 border-accent-amber/30 text-accent-amber"
                          : "bg-accent-green/10 border-accent-green/30 text-accent-green"
                    : "bg-transparent border-white/[0.05] text-text-ghost hover:border-white/[0.10] hover:text-text-muted",
                  modeChanging && "opacity-50 cursor-not-allowed",
                )}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-text-ghost mt-1.5 leading-snug">
            {MODE_DESCRIPTIONS[connector.mode]}
          </p>
        </div>
      )}

      {/* Env keys hint */}
      {connector.envKeys.length > 0 && connector.status === "not_connected" && (
        <div className="px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
          <p className="text-[10px] text-text-ghost leading-snug">
            Requires in <code className="text-text-muted">.env.local</code>:{" "}
            {connector.envKeys.map(k => (
              <code key={k} className="text-text-secondary ml-1">{k}</code>
            ))}
          </p>
        </div>
      )}

      {/* Last tested */}
      {connector.lastTestedAt && (
        <p className="text-[10px] text-text-ghost">
          Last tested: {fmtDate(connector.lastTestedAt)}
        </p>
      )}

      {/* Error */}
      {connector.status === "error" && connector.lastError && (
        <p className="text-[10px] text-accent-red leading-snug">{connector.lastError}</p>
      )}

      {/* Test result */}
      {testResult && (
        <p className={cn(
          "text-[11px] leading-snug",
          testResult.ok ? "text-accent-green" : "text-accent-amber"
        )}>
          {testResult.message}
        </p>
      )}

      {/* Safety note */}
      <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-lg bg-accent-amber/[0.04] border border-accent-amber/10">
        <AlertCircle className="w-3 h-3 text-accent-amber flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-accent-amber/80 leading-snug">{connector.safetyNote}</p>
      </div>

      {/* Action buttons */}
      {!connector.isPlaceholder && (
        <div className="flex items-center gap-2 pt-1">
          <button
            disabled={testing}
            onClick={handleTest}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-white/[0.04] border border-white/[0.07] text-text-secondary hover:bg-white/[0.07] disabled:opacity-40 transition-all"
          >
            {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Test
          </button>

          {connector.status === "not_connected" || connector.status === "error" ? (
            <button
              disabled={connecting}
              onClick={handleConnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/15 disabled:opacity-40 transition-all"
            >
              {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
              Connect
            </button>
          ) : (
            <button
              disabled={disconnecting}
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-white/[0.04] border border-white/[0.07] text-text-ghost hover:text-accent-red hover:border-accent-red/20 disabled:opacity-40 transition-all"
            >
              {disconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2Off className="w-3 h-3" />}
              Disconnect
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function IntegrationsView() {
  const [connectors, setConnectors] = useState<ConnectorState[]>([]);
  const [loading,    setLoading]    = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations");
      const data = await res.json() as { connectors: ConnectorState[] };
      setConnectors(data.connectors ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-text-ghost" />
      </div>
    );
  }

  const byCategory = CATEGORY_ORDER.map(cat => ({
    category: cat,
    label:    CATEGORY_LABELS[cat],
    items:    connectors.filter(c => c.category === cat),
  }));

  return (
    <div className="space-y-8">
      {byCategory.map(({ category, label, items }) => (
        <div key={category}>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">{label}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map(c => (
              <ConnectorCard key={c.slug} connector={c} onRefresh={load} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
