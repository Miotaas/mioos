"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/Button";
import type { Agent, AgentPromptVersion } from "@/types";
import { FileEdit, Save, RotateCcw, Clock, ChevronDown, AlertCircle, CheckCircle2 } from "lucide-react";

function fmtDate(d: string): string {
  return new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const textareaCls = "w-full text-xs font-mono bg-surface-3 border border-white/[0.08] rounded-xl px-3 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors resize-none leading-relaxed";

export function PromptEditorView() {
  const { showToast } = useAppStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [versions, setVersions] = useState<AgentPromptVersion[]>([]);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPromptTemplate, setUserPromptTemplate] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<AgentPromptVersion | null>(null);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => {
        const list: Agent[] = Array.isArray(data) ? data : [];
        setAgents(list);
        if (list.length > 0) setSelectedAgentId(list[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedAgentId) return;
    setLoading(true);
    setDirty(false);
    setPreviewVersion(null);

    Promise.all([
      fetch(`/api/agents/${selectedAgentId}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/agent-prompts?agentId=${selectedAgentId}`).then((r) => r.json()).catch(() => []),
    ]).then(([agent, versionList]) => {
      if (agent && !agent.error) {
        setSelectedAgent(agent as Agent);
        setSystemPrompt(agent.systemPrompt ?? "");
        setUserPromptTemplate(agent.prompt ?? "");
      }
      setVersions(Array.isArray(versionList) ? versionList : []);
      setLoading(false);
    });
  }, [selectedAgentId]);

  async function saveVersion() {
    if (!selectedAgentId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/agent-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: selectedAgentId, systemPrompt, userPromptTemplate }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json() as AgentPromptVersion;
      setVersions((prev) => [saved, ...prev]);
      setDirty(false);
      showToast(`Saved as v${saved.version}`);
    } catch {
      showToast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  async function restoreVersion(version: number) {
    if (!selectedAgentId) return;
    setRestoring(version);
    try {
      const res = await fetch("/api/agent-prompts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: selectedAgentId, version }),
      });
      if (!res.ok) throw new Error();
      const restored = await res.json() as AgentPromptVersion;
      setVersions((prev) => [restored, ...prev]);
      setSystemPrompt(restored.systemPrompt ?? "");
      setUserPromptTemplate(restored.userPromptTemplate ?? "");
      setDirty(false);
      setPreviewVersion(null);
      showToast(`Restored to v${version} (saved as v${restored.version})`);
    } catch {
      showToast("Restore failed", "error");
    } finally {
      setRestoring(null);
    }
  }

  const currentVersion = versions[0]?.version ?? 0;

  return (
    <div className="h-full overflow-hidden flex flex-col bg-void">
      {/* Top bar */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/[0.06] flex items-center gap-4">
        <div>
          <p className="text-[10px] font-medium text-text-ghost uppercase tracking-widest">Agent OS · Phase 1.5</p>
          <h1 className="text-base font-semibold text-text-primary flex items-center gap-2 mt-0.5">
            <FileEdit className="w-4 h-4 text-accent-cyan" />
            Prompt <span className="text-accent-cyan">Editor</span>
            {dirty && <span className="text-[10px] text-accent-amber bg-accent-amber/10 border border-accent-amber/20 px-1.5 py-0.5 rounded">unsaved</span>}
          </h1>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Agent selector */}
          <select value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)}
            className="text-xs bg-surface-2 border border-white/[0.08] rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-cyan/50">
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>

          {versions.length > 0 && (
            <span className="text-[10px] text-text-ghost">
              Current: <span className="text-text-muted font-mono">v{currentVersion}</span>
            </span>
          )}

          <Button variant="primary" size="sm" onClick={saveVersion} disabled={saving || loading || !selectedAgentId}>
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save Version"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor panes */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading && <p className="text-xs text-text-muted text-center py-8">Loading...</p>}
          {!loading && selectedAgent && (
            <>
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-surface-2 border border-white/[0.06]">
                <AlertCircle className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Saving creates a new version and updates the agent&apos;s live prompts. Restoring a version creates a new version entry for auditability — history is append-only and never deleted.
                </p>
              </div>

              {/* System Prompt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">System Prompt</label>
                  <span className="text-[10px] text-text-ghost">Defines the agent&apos;s role, constraints, and output schema</span>
                </div>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => { setSystemPrompt(e.target.value); setDirty(true); }}
                  rows={14}
                  placeholder="You are a strategic AI agent embedded in MioOS..."
                  className={textareaCls}
                />
              </div>

              {/* User Prompt Template */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">User Prompt Template</label>
                  <span className="text-[10px] text-text-ghost">Task instruction prepended to the context payload</span>
                </div>
                <textarea
                  value={userPromptTemplate}
                  onChange={(e) => { setUserPromptTemplate(e.target.value); setDirty(true); }}
                  rows={6}
                  placeholder="Analyse the current state of MioOS and provide..."
                  className={textareaCls}
                />
              </div>
            </>
          )}
          {!loading && agents.length === 0 && (
            <div className="text-center py-12">
              <FileEdit className="w-8 h-8 mx-auto mb-3 text-text-ghost" />
              <p className="text-sm text-text-muted">No agents configured.</p>
            </div>
          )}
        </div>

        {/* Version history sidebar */}
        <div className="w-72 flex-shrink-0 border-l border-white/[0.06] flex flex-col overflow-hidden">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="flex items-center gap-2 px-4 py-3.5 border-b border-white/[0.06] text-left hover:bg-white/[0.02] transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-accent-cyan" />
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest flex-1">Version History</span>
            <span className="text-[10px] text-text-ghost">{versions.length}</span>
            <ChevronDown className={cn("w-3.5 h-3.5 text-text-muted transition-transform", historyOpen && "rotate-180")} />
          </button>

          <div className="flex-1 overflow-y-auto">
            {versions.length === 0 && (
              <p className="text-[11px] text-text-muted text-center py-6 px-4">
                No versions saved yet.<br />Save a version to start tracking history.
              </p>
            )}
            {versions.map((v) => {
              const isPreviewing = previewVersion?.id === v.id;
              return (
                <div key={v.id}
                  className={cn("border-b border-white/[0.04] px-4 py-3 transition-all",
                    isPreviewing ? "bg-accent-cyan/5 border-l-2 border-l-accent-cyan" : "hover:bg-white/[0.01]")}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-semibold text-text-primary">v{v.version}</span>
                    {currentVersion === v.version && versions[0].id === v.id && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-green/10 text-accent-green">current</span>
                    )}
                  </div>
                  <p className="text-[10px] text-text-muted">{fmtDate(v.createdAt)}</p>
                  {v.systemPrompt && (
                    <p className="text-[10px] text-text-ghost mt-1 line-clamp-2 font-mono leading-relaxed">
                      {v.systemPrompt.slice(0, 80)}…
                    </p>
                  )}
                  <div className="flex gap-1.5 mt-2">
                    <button
                      onClick={() => setPreviewVersion(isPreviewing ? null : v)}
                      className="text-[10px] px-2 py-1 rounded bg-surface-3 border border-white/[0.08] text-text-muted hover:text-text-primary transition-all"
                    >
                      {isPreviewing ? "Close" : "Preview"}
                    </button>
                    {versions[0].id !== v.id && (
                      <button
                        onClick={() => restoreVersion(v.version)}
                        disabled={restoring === v.version}
                        className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/20 transition-all disabled:opacity-50"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        {restoring === v.version ? "..." : "Restore"}
                      </button>
                    )}
                  </div>

                  {/* Inline preview */}
                  {isPreviewing && (
                    <div className="mt-2 pt-2 border-t border-white/[0.06] space-y-2">
                      {v.systemPrompt && (
                        <div>
                          <p className="text-[9px] text-text-ghost uppercase tracking-wider mb-1">System</p>
                          <pre className="text-[10px] font-mono text-text-muted whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">{v.systemPrompt}</pre>
                        </div>
                      )}
                      {v.userPromptTemplate && (
                        <div>
                          <p className="text-[9px] text-text-ghost uppercase tracking-wider mb-1">User</p>
                          <pre className="text-[10px] font-mono text-text-muted whitespace-pre-wrap leading-relaxed max-h-20 overflow-y-auto">{v.userPromptTemplate}</pre>
                        </div>
                      )}
                      <button
                        onClick={() => { setSystemPrompt(v.systemPrompt ?? ""); setUserPromptTemplate(v.userPromptTemplate ?? ""); setDirty(true); setPreviewVersion(null); }}
                        className="flex items-center gap-1 text-[10px] text-accent-amber hover:underline"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Load into editor
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
