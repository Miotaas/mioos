"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Agent, AgentSchedule, ScheduleFrequency } from "@/types";
import { Calendar, CheckCircle2, Clock, Play, AlertCircle, Zap } from "lucide-react";

const FREQUENCIES: ScheduleFrequency[] = ["manual", "daily", "weekly", "monthly"];

function fmtDateTime(d: string | null | undefined): string {
  if (!d || new Date(d).getFullYear() === 9999) return "—";
  return new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function isOverdue(d: string | null | undefined): boolean {
  if (!d || new Date(d).getFullYear() === 9999) return false;
  return new Date(d) < new Date();
}

interface ScheduleWithAgent extends AgentSchedule {
  agent: Pick<Agent, "id" | "name" | "slug" | "status">;
}

interface ScheduleForm {
  agentId: string;
  enabled: boolean;
  frequency: ScheduleFrequency;
  timeOfDay: string;
}

const DEFAULT_FORM: ScheduleForm = { agentId: "", enabled: true, frequency: "daily", timeOfDay: "08:00" };

const inputCls = "w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors";

export function SchedulesView() {
  const { showToast } = useAppStore();
  const [schedules, setSchedules] = useState<ScheduleWithAgent[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tickRunning, setTickRunning] = useState(false);
  const [triggered, setTriggered] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [s, a] = await Promise.all([
      fetch("/api/agents/schedule").then((r) => r.json()).catch(() => []),
      fetch("/api/agents").then((r) => r.json()).catch(() => []),
    ]);
    setSchedules(Array.isArray(s) ? s : []);
    setAgents(Array.isArray(a) ? a : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // run scheduler tick on mount to trigger any overdue scheduled runs
    fetch("/api/agents/schedule/tick", { method: "POST" }).catch(() => {});
  }, []);

  function openSchedule(agentId: string) {
    const existing = schedules.find((s) => s.agentId === agentId);
    setEditingAgentId(agentId);
    setForm({
      agentId,
      enabled: existing?.enabled ?? true,
      frequency: (existing?.frequency as ScheduleFrequency) ?? "daily",
      timeOfDay: existing?.timeOfDay ?? "08:00",
    });
    setModalOpen(true);
  }

  async function saveSchedule() {
    setSaving(true);
    try {
      const res = await fetch("/api/agents/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      showToast("Schedule saved");
      setModalOpen(false);
      await load();
    } catch {
      showToast("Failed to save schedule", "error");
    } finally {
      setSaving(false);
    }
  }

  async function runTick() {
    setTickRunning(true);
    try {
      const res = await fetch("/api/agents/schedule/tick", { method: "POST" });
      const data = await res.json();
      setTriggered(data.count ?? 0);
      showToast(data.count > 0 ? `Triggered ${data.count} scheduled run${data.count !== 1 ? "s" : ""}` : "No runs due");
      await load();
    } catch {
      showToast("Scheduler tick failed", "error");
    } finally {
      setTickRunning(false);
    }
  }

  // Agents that have no schedule yet
  const scheduledAgentIds = new Set(schedules.map((s) => s.agentId));
  const unscheduledAgents = agents.filter((a) => !scheduledAgentIds.has(a.id));

  const editingAgent = editingAgentId ? agents.find((a) => a.id === editingAgentId) : null;

  return (
    <div className="h-full overflow-y-auto bg-void">
      <div className="max-w-[900px] mx-auto px-6 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium text-text-ghost uppercase tracking-widest mb-1">Agent OS</p>
            <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">
              Agent <span className="text-accent-cyan">Schedules</span>
            </h1>
            <p className="text-sm text-text-secondary mt-1.5">
              {loading ? "Loading..." : `${schedules.filter((s) => s.enabled).length} active schedule${schedules.filter((s) => s.enabled).length !== 1 ? "s" : ""}.`}
              <span className="text-text-ghost ml-2 text-xs">Scheduler runs on page load and manual tick.</span>
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={runTick} disabled={tickRunning}>
            <Zap className="w-3.5 h-3.5 text-accent-cyan" />
            {tickRunning ? "Checking..." : "Check Due Runs"}
          </Button>
        </div>

        {triggered !== null && (
          <div className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-xl border text-sm",
            triggered > 0 ? "bg-accent-green/5 border-accent-green/20 text-accent-green" : "bg-surface-2 border-white/[0.06] text-text-muted",
          )}>
            {triggered > 0 ? <Play className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {triggered > 0 ? `${triggered} scheduled run${triggered !== 1 ? "s" : ""} triggered.` : "No runs were due."}
          </div>
        )}

        {/* Scheduled Agents */}
        {schedules.length > 0 && (
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-3">Configured Schedules</p>
            <div className="space-y-2">
              {schedules.map((s) => {
                const overdue = s.enabled && isOverdue(s.nextRunAt);
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "rounded-xl border bg-surface-1 px-4 py-3.5 flex items-center gap-4",
                      overdue ? "border-accent-amber/20" : "border-white/[0.06]",
                    )}
                  >
                    <div className="flex-shrink-0">
                      {s.enabled
                        ? <div className="w-2 h-2 rounded-full bg-accent-green" />
                        : <div className="w-2 h-2 rounded-full bg-text-ghost" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{s.agent.name}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-[10px] text-text-muted">
                        <span className="capitalize">{s.frequency}</span>
                        {s.timeOfDay && s.frequency !== "manual" && <span>{s.timeOfDay}</span>}
                        <span>Last: {fmtDateTime(s.lastRunAt)}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className={cn("text-xs font-medium", overdue ? "text-accent-amber" : "text-text-muted")}>
                        {s.frequency === "manual" || !s.enabled ? "Manual only" : (
                          <>
                            {overdue && <AlertCircle className="w-3 h-3 inline mr-1 text-accent-amber" />}
                            Next: {fmtDateTime(s.nextRunAt)}
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => openSchedule(s.agentId)}
                      className="flex-shrink-0 text-[10px] px-2.5 py-1.5 rounded-lg bg-surface-3 border border-white/[0.08] text-text-muted hover:text-text-primary hover:border-accent-cyan/30 transition-all"
                    >
                      Edit
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Unscheduled Agents */}
        {unscheduledAgents.length > 0 && (
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-3">Agents Without a Schedule</p>
            <div className="space-y-2">
              {unscheduledAgents.map((a) => (
                <div key={a.id} className="rounded-xl border border-white/[0.04] bg-surface-1 px-4 py-3.5 flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-text-ghost flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{a.name}</p>
                    <p className="text-[10px] text-text-ghost mt-0.5 capitalize">{a.agentType.replace("_", " ")} · {a.status}</p>
                  </div>
                  <span className="text-[10px] text-text-ghost">No schedule</span>
                  <button
                    onClick={() => openSchedule(a.id)}
                    className="flex-shrink-0 text-[10px] px-2.5 py-1.5 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/20 transition-all"
                  >
                    <Clock className="w-3 h-3 inline mr-1" /> Set Schedule
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && agents.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-8 h-8 mx-auto mb-3 text-text-ghost" />
            <p className="text-sm text-text-muted">No agents configured yet.</p>
          </div>
        )}

        {/* Scheduler info */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-surface-2 border border-white/[0.06]">
          <AlertCircle className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-text-muted leading-relaxed">
            <span className="text-text-secondary font-medium">Internal scheduler.</span> No external cron service required.
            Scheduled runs trigger automatically when you open this page, and on-demand via "Check Due Runs".
            All scheduled runs are subject to the same approval flow as manual runs.
          </p>
        </div>

      </div>

      {/* Schedule Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Schedule — ${editingAgent?.name ?? "Agent"}`}>
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-3 border border-white/[0.06]">
            <input type="checkbox" id="schedEnabled" checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="w-3.5 h-3.5 rounded accent-cyan-500" />
            <label htmlFor="schedEnabled" className="text-xs text-text-secondary cursor-pointer">
              Schedule enabled
            </label>
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Frequency</label>
            <select value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as ScheduleFrequency }))} className={inputCls}>
              {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {form.frequency !== "manual" && (
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Time of Day</label>
              <input type="time" value={form.timeOfDay} onChange={(e) => setForm((f) => ({ ...f, timeOfDay: e.target.value }))} className={inputCls} />
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button variant="primary" onClick={saveSchedule} disabled={saving} className="flex-1">
              {saving ? "Saving..." : "Save Schedule"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
