"use client";

import { useEffect, useState } from "react";
import { MioGoal, MioNode, GoalStatus } from "@/types";
import { cn, GOAL_STATUS_COLORS } from "@/lib/utils";
import { normalizeGoal, isOverdue, formatRelativeDeadline } from "@/lib/normalize";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useAppStore } from "@/store/appStore";
import { Target, Plus, Calendar, Trash2, Pencil, AlertCircle } from "lucide-react";

const GOAL_STATUSES: GoalStatus[] = ["active", "achieved", "abandoned", "paused"];

interface GoalForm {
  title: string;
  description: string;
  status: GoalStatus;
  progress: number;
  targetDate: string;
  nodeId: string;
}

const DEFAULT_FORM: GoalForm = {
  title: "",
  description: "",
  status: "active",
  progress: 0,
  targetDate: "",
  nodeId: "",
};

export function GoalsView() {
  const { showToast } = useAppStore();
  const [goals, setGoals] = useState<MioGoal[]>([]);
  const [nodes, setNodes] = useState<MioNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<MioGoal | null>(null);
  const [form, setForm] = useState<GoalForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/goals").then((r) => r.json()),
      fetch("/api/nodes").then((r) => r.json()),
    ]).then(([g, n]) => {
      setGoals((Array.isArray(g) ? g : []).map(normalizeGoal));
      setNodes(Array.isArray(n) ? n : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditingGoal(null);
    setForm(DEFAULT_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(goal: MioGoal) {
    setEditingGoal(goal);
    setForm({
      title: goal.title,
      description: goal.description || "",
      status: goal.status as GoalStatus,
      progress: goal.progress,
      targetDate: goal.targetDate ? goal.targetDate.split("T")[0] : "",
      nodeId: goal.nodeId || "",
    });
    setFormError("");
    setModalOpen(true);
  }

  async function saveGoal() {
    const title = form.title.trim();
    if (!title) { setFormError("Title is required."); return; }
    setSaving(true);
    setFormError("");
    try {
      const body = {
        title,
        description: form.description.trim() || null,
        status: form.status,
        progress: Math.min(100, Math.max(0, form.progress)),
        targetDate: form.targetDate || null,
        nodeId: form.nodeId || null,
      };
      if (editingGoal) {
        const res = await fetch(`/api/goals/${editingGoal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed");
        const updated = normalizeGoal(await res.json());
        setGoals((prev) => prev.map((g) => g.id === editingGoal.id ? updated : g));
        showToast("Goal updated");
      } else {
        const res = await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed");
        const created = normalizeGoal(await res.json());
        setGoals((prev) => [created, ...prev]);
        showToast("Goal created");
      }
      setModalOpen(false);
    } catch {
      setFormError("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteGoal(id: string) {
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    setGoals((prev) => prev.filter((g) => g.id !== id));
    showToast("Goal deleted");
  }

  const getNode = (nodeId?: string | null) => nodes.find((n) => n.id === nodeId);

  const grouped: Record<string, MioGoal[]> = {
    active: goals.filter((g) => g.status === "active"),
    achieved: goals.filter((g) => g.status === "achieved"),
    paused: goals.filter((g) => g.status === "paused"),
    abandoned: goals.filter((g) => g.status === "abandoned"),
  };

  const avgProgress = grouped.active.length > 0
    ? Math.round(grouped.active.reduce((a, g) => a + g.progress, 0) / grouped.active.length)
    : 0;

  const overdueGoals = grouped.active.filter((g) => isOverdue(g.targetDate));

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Target className="w-5 h-5 text-accent-green" />
            Goals
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            {grouped.active.length} active · {avgProgress}% avg
            {overdueGoals.length > 0 && (
              <span className="text-accent-red ml-1">· {overdueGoals.length} overdue</span>
            )}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" />
          New Goal
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading && <div className="text-center py-12 text-text-muted">Loading goals...</div>}

        {!loading && goals.length === 0 && (
          <div className="text-center py-16">
            <Target className="w-10 h-10 text-text-ghost mx-auto mb-4" />
            <p className="text-sm text-text-secondary">No goals yet</p>
            <p className="text-xs text-text-muted mt-1 mb-4">Set what you&apos;re working toward and track your progress.</p>
            <Button variant="primary" size="sm" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" />
              Create first goal
            </Button>
          </div>
        )}

        {Object.entries(grouped).map(([status, statusGoals]) => {
          if (statusGoals.length === 0) return null;
          const statusColor = GOAL_STATUS_COLORS[status as GoalStatus] || "#94a3b8";
          return (
            <div key={status} className="mb-6">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
                {status}
                <span className="text-text-ghost font-normal normal-case tracking-normal">({statusGoals.length})</span>
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {statusGoals.map((goal) => {
                  const node = getNode(goal.nodeId);
                  const color = node?.color || "#10b981";
                  const overdue = isOverdue(goal.targetDate) && goal.status === "active";
                  const deadline = goal.targetDate ? formatRelativeDeadline(goal.targetDate) : null;

                  return (
                    <div
                      key={goal.id}
                      className={cn(
                        "group p-4 rounded-xl border transition-all",
                        overdue
                          ? "border-accent-red/20 bg-accent-red/5"
                          : "border-white/[0.06] bg-surface-2 hover:border-white/[0.1]"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-semibold text-text-primary flex-1 min-w-0 pr-2">{goal.title}</p>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                          <button
                            onClick={() => openEdit(goal)}
                            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-all"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteGoal(goal.id)}
                            className="p-1 rounded text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-lg font-bold font-mono ml-2 flex-shrink-0" style={{ color }}>
                          {goal.progress}%
                        </span>
                      </div>

                      {goal.description && (
                        <p className="text-xs text-text-secondary mb-3 leading-relaxed">{goal.description}</p>
                      )}

                      <ProgressBar value={goal.progress} color={color} className="mb-2" />

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {node && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-text-muted border border-white/[0.06]">
                            {node.label}
                          </span>
                        )}
                        {deadline && (
                          <span className={cn(
                            "flex items-center gap-1 text-[10px] ml-auto",
                            overdue ? "text-accent-red font-medium" : "text-text-muted"
                          )}>
                            {overdue && <AlertCircle className="w-3 h-3" />}
                            {!overdue && <Calendar className="w-3 h-3" />}
                            {deadline}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Goal Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingGoal ? "Edit Goal" : "New Goal"}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="What do you want to achieve?"
              autoFocus
              className="w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Why does this matter? What does success look like?"
              rows={2}
              className="w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50 resize-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as GoalStatus }))}
                className="w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-3 py-2.5 text-text-primary focus:outline-none focus:border-accent-purple/50 capitalize"
              >
                {GOAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Target date</label>
              <input
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
                className="w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-3 py-2.5 text-text-primary focus:outline-none focus:border-accent-purple/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1.5 flex items-center justify-between">
              Progress
              <span className="text-text-primary font-mono">{form.progress}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={form.progress}
              onChange={(e) => setForm((f) => ({ ...f, progress: Number(e.target.value) }))}
              className="w-full accent-accent-green"
            />
            <div className="flex justify-between text-[10px] text-text-ghost mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Project (optional)</label>
            <select
              value={form.nodeId}
              onChange={(e) => setForm((f) => ({ ...f, nodeId: e.target.value }))}
              className="w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-3 py-2.5 text-text-primary focus:outline-none focus:border-accent-purple/50"
            >
              <option value="">No project</option>
              {nodes.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
            </select>
          </div>

          {formError && (
            <p className="text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 px-3 py-2 rounded-lg">
              {formError}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button variant="primary" onClick={saveGoal} disabled={saving || !form.title.trim()} className="flex-1">
              {saving ? "Saving..." : editingGoal ? "Save Changes" : "Create Goal"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
