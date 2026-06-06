"use client";

import { useEffect, useState } from "react";
import { MioTask, MioNode, Priority, TaskStatus } from "@/types";
import { cn, formatDate, TASK_STATUS_COLORS } from "@/lib/utils";
import { normalizeTask, isOverdue, formatRelativeDeadline } from "@/lib/normalize";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAppStore } from "@/store/appStore";
import {
  CheckSquare, Circle, Plus, CheckCircle2, AlertCircle, Calendar, Trash2, Pencil,
} from "lucide-react";

const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "blocked", "done", "cancelled"];
const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];

interface TaskFormState {
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  nodeId: string;
}

const DEFAULT_FORM: TaskFormState = {
  title: "",
  description: "",
  priority: "medium",
  status: "todo",
  dueDate: "",
  nodeId: "",
};

function safeStatusLabel(status: string | null | undefined): string {
  return (status ?? "todo").replace("_", " ");
}

function safeStatusColor(status: string | null | undefined): string {
  return TASK_STATUS_COLORS[status as TaskStatus] ?? "#94a3b8";
}

export function TasksView() {
  const { showToast } = useAppStore();
  const [tasks, setTasks] = useState<MioTask[]>([]);
  const [nodes, setNodes] = useState<MioNode[]>([]);
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<MioTask | null>(null);
  const [form, setForm] = useState<TaskFormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/tasks").then((r) => r.json()),
      fetch("/api/nodes").then((r) => r.json()),
    ]).then(([t, n]) => {
      setTasks((Array.isArray(t) ? t : []).map(normalizeTask));
      setNodes(Array.isArray(n) ? n : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditingTask(null);
    setForm(DEFAULT_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(task: MioTask, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
      nodeId: task.nodeId || "",
    });
    setFormError("");
    setModalOpen(true);
  }

  async function saveTask() {
    const title = form.title.trim();
    if (!title) { setFormError("Title is required."); return; }
    setSaving(true);
    setFormError("");
    try {
      const body = {
        title,
        description: form.description.trim() || null,
        priority: form.priority,
        status: form.status,
        dueDate: form.dueDate || null,
        nodeId: form.nodeId || null,
      };
      if (editingTask) {
        const res = await fetch(`/api/tasks/${editingTask.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to update");
        const updated = normalizeTask(await res.json());
        setTasks((prev) => prev.map((t) => t.id === editingTask.id ? updated : t));
        showToast("Task updated");
      } else {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to create");
        const created = normalizeTask(await res.json());
        setTasks((prev) => [created, ...prev]);
        showToast("Task created");
      }
      setModalOpen(false);
    } catch {
      setFormError("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(task: MioTask, e: React.MouseEvent) {
    e.stopPropagation();
    const newStatus: TaskStatus = task.status === "done" ? "todo" : "done";
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t));
  }

  async function deleteTask(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== id));
    showToast("Task deleted");
  }

  const filtered = tasks.filter((t) => {
    if (filter !== "all" && t.status !== filter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    return true;
  });

  const getNodeLabel = (nodeId?: string | null) => nodes.find((n) => n.id === nodeId)?.label;

  const counts = {
    all: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    blocked: tasks.filter((t) => t.status === "blocked").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  const statusGroups: { id: TaskStatus | "all"; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "todo", label: "To Do", count: counts.todo },
    { id: "in_progress", label: "In Progress", count: counts.in_progress },
    { id: "blocked", label: "Blocked", count: counts.blocked },
    { id: "done", label: "Done", count: counts.done },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-accent-blue" />
            Tasks
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            {tasks.filter((t) => t.status !== "done" && t.status !== "cancelled").length} open ·{" "}
            {tasks.filter((t) => isOverdue(t.dueDate) && t.status !== "done" && t.status !== "cancelled").length > 0 && (
              <span className="text-accent-red">
                {tasks.filter((t) => isOverdue(t.dueDate) && t.status !== "done" && t.status !== "cancelled").length} overdue
              </span>
            )}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" />
          New Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 px-6 py-2.5 border-b border-white/[0.06] bg-surface-1 overflow-x-auto">
        {statusGroups.map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={cn(
              "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-all",
              filter === id
                ? "bg-accent-purple/15 text-accent-purple border border-accent-purple/25"
                : "text-text-muted hover:text-text-secondary hover:bg-white/[0.04]"
            )}
          >
            {label}
            <span className={cn("text-[10px] font-mono", filter === id ? "text-accent-purple/70" : "text-text-ghost")}>
              {count}
            </span>
          </button>
        ))}

        <div className="h-4 w-px bg-white/[0.06] mx-1 flex-shrink-0" />

        {PRIORITIES.map((p) => (
          <button
            key={p}
            onClick={() => setPriorityFilter(priorityFilter === p ? "all" : p)}
            className={cn(
              "text-xs px-2.5 py-1.5 rounded-lg capitalize whitespace-nowrap transition-all border",
              priorityFilter === p
                ? `priority-${p}`
                : "text-text-ghost border-white/[0.04] hover:border-white/[0.08] hover:text-text-muted"
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading && (
          <div className="text-center py-12 text-text-muted text-sm">Loading tasks...</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <CheckCircle2 className="w-8 h-8 text-text-ghost mx-auto mb-3" />
            <p className="text-sm text-text-secondary">
              {filter !== "all" || priorityFilter !== "all" ? "No tasks match this filter" : "No tasks yet"}
            </p>
            <p className="text-xs text-text-muted mt-1 mb-4">
              {filter !== "all" || priorityFilter !== "all"
                ? "Try clearing the filter"
                : "Add your first task to start planning your day."}
            </p>
            {filter === "all" && priorityFilter === "all" && (
              <Button variant="primary" size="sm" onClick={openCreate}>
                <Plus className="w-3.5 h-3.5" />
                Create first task
              </Button>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          {filtered.map((task) => {
            const nodeLabel = getNodeLabel(task.nodeId);
            const overdue = isOverdue(task.dueDate) && task.status !== "done" && task.status !== "cancelled";
            const deadline = task.dueDate ? formatRelativeDeadline(task.dueDate) : null;

            return (
              <div
                key={task.id}
                className={cn(
                  "group flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer",
                  task.status === "done" || task.status === "cancelled"
                    ? "opacity-40 border-white/[0.04] bg-white/[0.01]"
                    : overdue
                    ? "border-accent-red/20 bg-accent-red/5 hover:border-accent-red/30"
                    : "border-white/[0.06] bg-surface-2 hover:border-white/[0.1] hover:bg-surface-3"
                )}
                onClick={(e) => openEdit(task, e)}
              >
                <button
                  onClick={(e) => toggleTask(task, e)}
                  className="mt-0.5 flex-shrink-0"
                >
                  {task.status === "done" ? (
                    <CheckCircle2 className="text-accent-green" style={{ width: 18, height: 18 }} />
                  ) : task.status === "in_progress" ? (
                    <div className="w-[18px] h-[18px] rounded-full border-2 border-accent-blue flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
                    </div>
                  ) : task.status === "blocked" ? (
                    <AlertCircle className="text-accent-red" style={{ width: 18, height: 18 }} />
                  ) : (
                    <Circle
                      className="text-text-muted group-hover:text-text-secondary transition-colors"
                      style={{ width: 18, height: 18 }}
                    />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm text-text-primary leading-snug",
                    (task.status === "done" || task.status === "cancelled") && "line-through text-text-muted"
                  )}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {nodeLabel && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-text-muted border border-white/[0.06]">
                        {nodeLabel}
                      </span>
                    )}
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded capitalize font-medium", `priority-${task.priority}`)}>
                      {task.priority}
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded capitalize"
                      style={{ color: safeStatusColor(task.status), background: `${safeStatusColor(task.status)}15` }}
                    >
                      {safeStatusLabel(task.status)}
                    </span>
                    {deadline && (
                      <span className={cn(
                        "flex items-center gap-1 text-[10px]",
                        overdue ? "text-accent-red font-medium" : "text-text-muted"
                      )}>
                        <Calendar className="w-3 h-3" />
                        {deadline}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                  <button
                    onClick={(e) => openEdit(task, e)}
                    className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-all"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => deleteTask(task.id, e)}
                    className="p-1.5 rounded text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingTask ? "Edit Task" : "New Task"}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && saveTask()}
              placeholder="What needs to be done?"
              autoFocus
              className="w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional description..."
              rows={2}
              className="w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50 resize-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TaskStatus }))}
                className="w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-3 py-2.5 text-text-primary focus:outline-none focus:border-accent-purple/50"
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Due date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-3 py-2.5 text-text-primary focus:outline-none focus:border-accent-purple/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => setForm((f) => ({ ...f, priority: p }))}
                  className={cn(
                    "flex-1 text-xs py-1.5 rounded-lg border capitalize transition-all",
                    form.priority === p
                      ? `priority-${p} border-current`
                      : "text-text-ghost border-white/[0.06] hover:border-white/[0.12]"
                  )}
                >
                  {p}
                </button>
              ))}
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
            <Button variant="primary" onClick={saveTask} disabled={saving || !form.title.trim()} className="flex-1">
              {saving ? "Saving..." : editingTask ? "Save Changes" : "Create Task"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
