"use client";

import { useAppStore } from "@/store/appStore";
import { useEffect, useState, useCallback } from "react";
import { MioNode, MioTask, MioGoal, MioNote, ChecklistItem } from "@/types";
import { cn, formatDate, STATUS_COLORS, TASK_STATUS_COLORS } from "@/lib/utils";
import { normalizeTask, normalizeGoal, formatRelativeDeadline, isOverdue } from "@/lib/normalize";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { NodeModal } from "@/components/nodes/NodeModal";
import {
  X, CheckSquare, Target, FileText, Plus, Check, Circle,
  Calendar, Trash2, Clock, Pencil,
} from "lucide-react";

function safeStatusColor(status: string | null | undefined): string {
  return TASK_STATUS_COLORS[status as keyof typeof TASK_STATUS_COLORS] ?? "#94a3b8";
}

function safeStatusLabel(status: string | null | undefined): string {
  return (status ?? "todo").replace("_", " ");
}

export function RightPanel() {
  const { selectedNode, setSelectedNode, updateNode, removeNode, showToast } = useAppStore();
  const [tasks, setTasks] = useState<MioTask[]>([]);
  const [goals, setGoals] = useState<MioGoal[]>([]);
  const [notes, setNotes] = useState<MioNote[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [newCheckText, setNewCheckText] = useState("");
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [activeTab, setActiveTab] = useState<"tasks" | "goals" | "notes" | "checklist">("tasks");
  const [editNodeOpen, setEditNodeOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async (node: MioNode) => {
    try {
      const [t, g, n] = await Promise.all([
        fetch(`/api/tasks?nodeId=${node.id}`).then((r) => r.json()),
        fetch(`/api/goals?nodeId=${node.id}`).then((r) => r.json()),
        fetch(`/api/notes?nodeId=${node.id}`).then((r) => r.json()),
      ]);
      setTasks((Array.isArray(t) ? t : []).map(normalizeTask));
      setGoals((Array.isArray(g) ? g : []).map(normalizeGoal));
      setNotes(Array.isArray(n) ? n : []);
      setChecklist(Array.isArray(node.checklists) ? node.checklists : []);
    } catch {
      // fail silently — panel shows empty state
    }
  }, []);

  useEffect(() => {
    if (selectedNode) {
      setConfirmDelete(false);
      setAddingNote(false);
      load(selectedNode);
    }
  }, [selectedNode, load]);

  if (!selectedNode) return null;

  const color = selectedNode.color || "#6366f1";

  async function toggleTask(task: MioTask) {
    const newStatus = task.status === "done" ? "todo" : "done";
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, completedAt: newStatus === "done" ? new Date().toISOString() : null }),
    });
    setTasks((prev) => prev.map((t) => t.id === task.id ? normalizeTask({ ...t, status: newStatus }) : t));
  }

  async function addTask() {
    if (!newTaskText.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTaskText.trim(), nodeId: selectedNode!.id, priority: "medium", status: "todo" }),
    });
    const task = normalizeTask(await res.json());
    setTasks((prev) => [task, ...prev]);
    setNewTaskText("");
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  async function toggleChecklist(item: ChecklistItem) {
    const completed = !item.completed;
    await fetch(`/api/checklist/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed, completedAt: completed ? new Date().toISOString() : null }),
    });
    setChecklist((prev) => prev.map((c) => c.id === item.id ? { ...c, completed } : c));
  }

  async function addChecklist() {
    if (!newCheckText.trim()) return;
    const res = await fetch("/api/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newCheckText.trim(), nodeId: selectedNode!.id, order: checklist.length }),
    });
    const item = await res.json();
    setChecklist((prev) => [...prev, item]);
    setNewCheckText("");
  }

  async function deleteChecklist(id: string) {
    await fetch(`/api/checklist/${id}`, { method: "DELETE" });
    setChecklist((prev) => prev.filter((c) => c.id !== id));
  }

  async function addNote() {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newNoteTitle.trim(), content: newNoteContent.trim(), nodeId: selectedNode!.id }),
    });
    const note = await res.json();
    setNotes((prev) => [note, ...prev]);
    setNewNoteTitle("");
    setNewNoteContent("");
    setAddingNote(false);
  }

  async function deleteNote(id: string) {
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  async function deleteNode() {
    await fetch(`/api/nodes/${selectedNode!.id}`, { method: "DELETE" });
    removeNode(selectedNode!.id);
    showToast("Node deleted");
  }

  const tabs = [
    { id: "tasks", label: "Tasks", count: tasks.length, icon: CheckSquare },
    { id: "goals", label: "Goals", count: goals.length, icon: Target },
    { id: "notes", label: "Notes", count: notes.length, icon: FileText },
    { id: "checklist", label: "Checks", count: checklist.length, icon: Check },
  ] as const;

  const nodeStatusColor = STATUS_COLORS[selectedNode.status] || "#94a3b8";

  return (
    <aside className="w-80 flex flex-col h-full border-l border-white/[0.06] bg-surface-1 animate-slide-in-right z-10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06]" style={{ borderTopColor: color, borderTopWidth: 2 }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}80` }} />
            <h2 className="text-sm font-semibold text-text-primary truncate">{selectedNode.label || "Untitled"}</h2>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setEditNodeOpen(true)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-all"
              title="Edit node"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={deleteNode}
                  className="text-[10px] px-2 py-1 rounded bg-accent-red/20 text-accent-red border border-accent-red/30 hover:bg-accent-red/30 transition-all"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-[10px] px-2 py-1 rounded bg-white/[0.05] text-text-muted hover:bg-white/[0.1] transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded-lg text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-all"
                title="Delete node"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase tracking-wide"
            style={{ color, borderColor: `${color}40`, background: `${color}15` }}
          >
            {selectedNode.type || "node"}
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded border font-medium capitalize"
            style={{
              color: nodeStatusColor,
              borderColor: `${nodeStatusColor}30`,
              background: `${nodeStatusColor}15`,
            }}
          >
            {selectedNode.status || "inbox"}
          </span>
          {selectedNode.priority && (
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium capitalize", `priority-${selectedNode.priority}`)}>
              {selectedNode.priority}
            </span>
          )}
        </div>

        {selectedNode.description && (
          <p className="text-xs text-text-secondary mt-2 leading-relaxed line-clamp-3">{selectedNode.description}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06] bg-surface-2">
        {tabs.map(({ id, label, count, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              activeTab === id
                ? "text-accent-purple border-b-2 border-accent-purple bg-accent-purple/5"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
            {count > 0 && (
              <span className={cn("text-[9px] rounded-full px-1", activeTab === id ? "text-accent-purple" : "text-text-ghost")}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Tasks */}
        {activeTab === "tasks" && (
          <div className="p-3 space-y-2">
            <div className="flex gap-2">
              <input
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder="Add task..."
                className="flex-1 text-xs bg-surface-3 border border-white/[0.06] rounded-lg px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/40"
              />
              <Button size="sm" variant="primary" onClick={addTask} className="px-2">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>

            {tasks.length === 0 && (
              <div className="text-center py-8 text-text-muted text-xs">No tasks yet — add one above.</div>
            )}

            {tasks.map((task) => {
              const overdue = isOverdue(task.dueDate) && task.status !== "done";
              const deadline = task.dueDate ? formatRelativeDeadline(task.dueDate) : null;
              return (
                <div
                  key={task.id}
                  className={cn(
                    "group flex items-start gap-2.5 p-2.5 rounded-lg border transition-all",
                    task.status === "done"
                      ? "opacity-50 border-white/[0.04] bg-white/[0.02]"
                      : overdue
                      ? "border-accent-red/20 bg-accent-red/5"
                      : "border-white/[0.06] bg-surface-2 hover:border-white/[0.1]"
                  )}
                >
                  <button onClick={() => toggleTask(task)} className="mt-0.5 flex-shrink-0">
                    {task.status === "done" ? (
                      <CheckSquare className="w-3.5 h-3.5 text-accent-green" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-text-muted group-hover:text-text-secondary transition-colors" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs text-text-primary leading-snug", task.status === "done" && "line-through text-text-muted")}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className="text-[9px] font-medium px-1 py-0.5 rounded capitalize"
                        style={{ color: safeStatusColor(task.status), background: `${safeStatusColor(task.status)}15` }}
                      >
                        {safeStatusLabel(task.status)}
                      </span>
                      <span className={cn("text-[9px] font-medium capitalize px-1 py-0.5 rounded", `priority-${task.priority}`)}>
                        {task.priority}
                      </span>
                      {deadline && (
                        <span className={cn("text-[9px] flex items-center gap-0.5", overdue ? "text-accent-red" : "text-text-ghost")}>
                          <Calendar className="w-2.5 h-2.5" />
                          {deadline}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-muted hover:text-accent-red transition-all flex-shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Goals */}
        {activeTab === "goals" && (
          <div className="p-3 space-y-2">
            {goals.length === 0 && (
              <div className="text-center py-8 text-text-muted text-xs">No goals linked to this node.</div>
            )}
            {goals.map((goal) => {
              const overdue = isOverdue(goal.targetDate) && goal.status !== "achieved";
              const deadline = goal.targetDate ? formatRelativeDeadline(goal.targetDate) : null;
              return (
                <div key={goal.id} className={cn(
                  "p-3 rounded-lg border",
                  overdue ? "border-accent-red/20 bg-accent-red/5" : "border-white/[0.06] bg-surface-2"
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-text-primary">{goal.title}</p>
                    <span className="text-[10px] text-accent-green font-mono flex-shrink-0">{goal.progress}%</span>
                  </div>
                  {goal.description && (
                    <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">{goal.description}</p>
                  )}
                  <ProgressBar value={goal.progress} color="#10b981" className="mt-2" showLabel={false} />
                  {deadline && (
                    <div className={cn(
                      "flex items-center gap-1 mt-2 text-[10px]",
                      overdue ? "text-accent-red" : "text-text-muted"
                    )}>
                      <Calendar className="w-3 h-3" />
                      {deadline}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Notes */}
        {activeTab === "notes" && (
          <div className="p-3 space-y-2">
            <button
              onClick={() => setAddingNote(true)}
              className="w-full flex items-center gap-2 text-xs text-text-muted hover:text-text-secondary border border-dashed border-white/[0.08] hover:border-white/[0.16] rounded-lg px-3 py-2 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add note
            </button>

            {addingNote && (
              <div className="p-3 rounded-lg border border-accent-purple/20 bg-accent-purple/5 space-y-2">
                <input
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="Note title..."
                  autoFocus
                  className="w-full text-xs bg-surface-3 border border-white/[0.06] rounded-lg px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/40"
                />
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Note content..."
                  rows={3}
                  className="w-full text-xs bg-surface-3 border border-white/[0.06] rounded-lg px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/40 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setAddingNote(false); setNewNoteTitle(""); setNewNoteContent(""); }}
                    className="flex-1 text-xs py-1.5 rounded-lg border border-white/[0.06] text-text-muted hover:text-text-secondary transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addNote}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-accent-purple/90 hover:bg-accent-purple text-white transition-all"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {notes.length === 0 && !addingNote && (
              <div className="text-center py-8 text-text-muted text-xs">No notes yet.</div>
            )}

            {notes.map((note) => (
              <div key={note.id} className="group p-3 rounded-lg border border-white/[0.06] bg-surface-2 hover:border-white/[0.1] transition-all">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-text-primary mb-1.5">{note.title || "Untitled"}</p>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-muted hover:text-accent-red transition-all flex-shrink-0 mt-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap line-clamp-6">
                  {note.content || ""}
                </p>
                {note.tags && (() => {
                  try {
                    const parsed = JSON.parse(note.tags) as string[];
                    return parsed.length > 0 ? (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {parsed.map((tag) => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-text-muted border border-white/[0.06]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null;
                  } catch { return null; }
                })()}
              </div>
            ))}
          </div>
        )}

        {/* Checklist */}
        {activeTab === "checklist" && (
          <div className="p-3 space-y-1.5">
            <div className="flex gap-2 mb-3">
              <input
                value={newCheckText}
                onChange={(e) => setNewCheckText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addChecklist()}
                placeholder="Add checklist item..."
                className="flex-1 text-xs bg-surface-3 border border-white/[0.06] rounded-lg px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/40"
              />
              <Button size="sm" variant="primary" onClick={addChecklist} className="px-2">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>

            {checklist.length > 0 && (
              <div className="text-[10px] text-text-muted mb-2">
                {checklist.filter((c) => c.completed).length}/{checklist.length} complete
              </div>
            )}

            {checklist.length === 0 && (
              <div className="text-center py-8 text-text-muted text-xs">No checklist items yet.</div>
            )}

            {checklist.map((item) => (
              <div key={item.id} className="group flex items-center gap-2.5">
                <button
                  onClick={() => toggleChecklist(item)}
                  className={cn(
                    "flex-1 flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all",
                    item.completed
                      ? "opacity-50 border-white/[0.04] bg-white/[0.02]"
                      : "border-white/[0.06] bg-surface-2 hover:border-white/[0.1]"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all",
                    item.completed ? "bg-accent-green border-accent-green" : "border-white/[0.2]"
                  )}>
                    {item.completed && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className={cn("text-xs text-text-primary", item.completed && "line-through text-text-muted")}>
                    {item.text}
                  </span>
                </button>
                <button
                  onClick={() => deleteChecklist(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-text-muted hover:text-accent-red transition-all flex-shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.06] bg-surface-2">
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          <Clock className="w-3 h-3" />
          <span>Updated {formatDate(selectedNode.updatedAt)}</span>
        </div>
      </div>

      <NodeModal
        open={editNodeOpen}
        onClose={() => setEditNodeOpen(false)}
        node={selectedNode}
        onSaved={(saved) => {
          updateNode(saved);
          showToast("Node updated");
        }}
      />
    </aside>
  );
}
