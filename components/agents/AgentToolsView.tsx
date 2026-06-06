"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import type { Agent, Tool, AgentTool } from "@/types";
import { Wrench, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";

export function AgentToolsView() {
  const { showToast } = useAppStore();
  const [tools, setTools] = useState<Tool[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [agentTools, setAgentTools] = useState<AgentTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingTool, setTogglingTool] = useState<string | null>(null);
  const [togglingAssign, setTogglingAssign] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/tools").then((r) => r.json()).catch(() => []),
      fetch("/api/agents").then((r) => r.json()).catch(() => []),
    ]).then(([t, a]) => {
      setTools(Array.isArray(t) ? t : []);
      const agentList: Agent[] = Array.isArray(a) ? a : [];
      setAgents(agentList);
      if (agentList.length > 0) setSelectedAgent(agentList[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedAgent) return;
    fetch(`/api/agents/${selectedAgent}/tools`)
      .then((r) => r.json())
      .then((data) => setAgentTools(Array.isArray(data) ? data : []))
      .catch(() => setAgentTools([]));
  }, [selectedAgent]);

  async function toggleToolEnabled(tool: Tool) {
    setTogglingTool(tool.id);
    try {
      const res = await fetch(`/api/tools/${tool.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !tool.enabled }),
      });
      const updated = await res.json() as Tool;
      setTools((prev) => prev.map((t) => (t.id === tool.id ? updated : t)));
      showToast(`Tool ${updated.enabled ? "enabled" : "disabled"}`);
    } catch {
      showToast("Failed to update tool", "error");
    } finally {
      setTogglingTool(null);
    }
  }

  async function toggleAgentTool(toolId: string) {
    if (!selectedAgent) return;
    setTogglingAssign(toolId);
    const assigned = agentTools.some((at) => at.toolId === toolId);
    try {
      if (assigned) {
        await fetch(`/api/agents/${selectedAgent}/tools`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolId }),
        });
        setAgentTools((prev) => prev.filter((at) => at.toolId !== toolId));
        showToast("Tool unassigned");
      } else {
        const res = await fetch(`/api/agents/${selectedAgent}/tools`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolId }),
        });
        const created = await res.json() as AgentTool;
        setAgentTools((prev) => [...prev, created]);
        showToast("Tool assigned");
      }
    } catch {
      showToast("Failed to update assignment", "error");
    } finally {
      setTogglingAssign(null);
    }
  }

  const selectedAgentName = agents.find((a) => a.id === selectedAgent)?.name ?? "";

  return (
    <div className="h-full overflow-y-auto bg-void">
      <div className="max-w-[900px] mx-auto px-6 py-6 space-y-6">

        {/* Header */}
        <div>
          <p className="text-[10px] font-medium text-text-ghost uppercase tracking-widest mb-1">Agent OS · Phase 1.5</p>
          <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">
            Agent <span className="text-accent-cyan">Tools</span>
          </h1>
        </div>

        {/* Safety notice */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-surface-2 border border-accent-amber/20">
          <AlertCircle className="w-3.5 h-3.5 text-accent-amber flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-text-muted leading-relaxed">
            <span className="text-accent-amber font-medium">Foundation only.</span> Tools are declared capabilities for future execution.
            No tool executes automatically. All tool use requires explicit human approval via the Approval Queue.
            Tool execution engine is Phase 2.
          </p>
        </div>

        {/* Tool Registry */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-3.5 h-3.5 text-accent-cyan" />
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Tool Registry</span>
            <span className="text-[10px] text-text-ghost ml-auto">{tools.filter((t) => t.enabled).length} of {tools.length} enabled</span>
          </div>
          <div className="space-y-2">
            {loading && <p className="text-xs text-text-muted py-4 text-center">Loading...</p>}
            {tools.map((tool) => (
              <div key={tool.id} className={cn(
                "rounded-xl border bg-surface-1 px-4 py-3.5 flex items-center gap-4 transition-all",
                tool.enabled ? "border-white/[0.06]" : "border-white/[0.03] opacity-60",
              )}>
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", tool.enabled ? "bg-accent-green" : "bg-text-ghost")} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text-primary">{tool.name}</p>
                    {tool.requiresApproval && (
                      <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-accent-amber/10 text-accent-amber border border-accent-amber/15">
                        <ShieldCheck className="w-2.5 h-2.5" /> Approval
                      </span>
                    )}
                  </div>
                  {tool.description && <p className="text-[11px] text-text-muted mt-0.5">{tool.description}</p>}
                  <p className="text-[9px] text-text-ghost font-mono mt-0.5">{tool.slug}</p>
                </div>
                <button
                  onClick={() => toggleToolEnabled(tool)}
                  disabled={togglingTool === tool.id}
                  className={cn(
                    "flex-shrink-0 text-[10px] px-3 py-1.5 rounded-lg border transition-all",
                    tool.enabled
                      ? "bg-accent-green/10 border-accent-green/20 text-accent-green hover:bg-accent-green/20"
                      : "bg-surface-3 border-white/[0.08] text-text-muted hover:text-text-secondary",
                  )}
                >
                  {tool.enabled ? <><CheckCircle2 className="w-3 h-3 inline mr-1" />Enabled</> : "Disabled"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Tool Assignment */}
        {agents.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Agent Assignment</span>
              <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}
                className="text-xs bg-surface-2 border border-white/[0.08] rounded-lg px-3 py-1.5 text-text-primary focus:outline-none focus:border-accent-cyan/50 ml-auto">
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-surface-1 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.04]">
                <p className="text-xs text-text-secondary">
                  Tools assigned to <span className="text-accent-cyan font-medium">{selectedAgentName}</span>.
                  Assigned tools are listed in the agent&apos;s context when it runs.
                </p>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {tools.map((tool) => {
                  const assigned = agentTools.some((at) => at.toolId === tool.id);
                  return (
                    <div key={tool.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.01] transition-colors">
                      <input
                        type="checkbox"
                        checked={assigned}
                        onChange={() => toggleAgentTool(tool.id)}
                        disabled={togglingAssign === tool.id || !tool.enabled}
                        className="w-3.5 h-3.5 rounded accent-cyan-500 flex-shrink-0"
                      />
                      <p className={cn("flex-1 text-xs", assigned ? "text-text-primary" : "text-text-muted")}>{tool.name}</p>
                      {!tool.enabled && <span className="text-[9px] text-text-ghost">disabled in registry</span>}
                      {assigned && tool.requiresApproval && (
                        <span className="text-[9px] text-accent-amber">approval required</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
