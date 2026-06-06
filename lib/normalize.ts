import {
  MioTask, MioGoal, MioNote, MioNode,
  TaskStatus, Priority, GoalStatus, NodeType, NodeStatus,
  MioCapture, CaptureSource, CaptureType, CaptureStatus,
} from "@/types";

const VALID_TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "blocked", "done", "cancelled"];
const VALID_PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];
const VALID_GOAL_STATUSES: GoalStatus[] = ["active", "achieved", "abandoned", "paused"];
const VALID_NODE_TYPES: NodeType[] = [
  "project", "idea", "task", "goal", "note", "person",
  "workflow", "decision", "problem", "roadmap", "system",
];
const VALID_NODE_STATUSES: NodeStatus[] = ["inbox", "active", "blocked", "done", "archived"];

export function normalizeTask(t: MioTask): MioTask {
  return {
    ...t,
    title: t.title?.trim() || "Untitled Task",
    status: VALID_TASK_STATUSES.includes(t.status) ? t.status : "todo",
    priority: VALID_PRIORITIES.includes(t.priority) ? t.priority : "medium",
    description: t.description ?? null,
    dueDate: t.dueDate ?? null,
    completedAt: t.completedAt ?? null,
    nodeId: t.nodeId ?? null,
  };
}

export function normalizeGoal(g: MioGoal): MioGoal {
  return {
    ...g,
    title: g.title?.trim() || "Untitled Goal",
    status: VALID_GOAL_STATUSES.includes(g.status as GoalStatus) ? (g.status as GoalStatus) : "active",
    progress: Math.min(100, Math.max(0, typeof g.progress === "number" ? g.progress : 0)),
    description: g.description ?? null,
    targetDate: g.targetDate ?? null,
    nodeId: g.nodeId ?? null,
  };
}

export function normalizeNote(n: MioNote): MioNote {
  return {
    ...n,
    title: n.title?.trim() || "Untitled Note",
    content: n.content ?? "",
    tags: n.tags ?? null,
    nodeId: n.nodeId ?? null,
  };
}

export function normalizeNode(n: MioNode): MioNode {
  return {
    ...n,
    label: n.label?.trim() || "Untitled Node",
    type: (VALID_NODE_TYPES.includes(n.type as NodeType) ? n.type : "note") as NodeType,
    status: (VALID_NODE_STATUSES.includes(n.status as NodeStatus) ? n.status : "inbox") as NodeStatus,
    priority: n.priority
      ? VALID_PRIORITIES.includes(n.priority) ? n.priority : "medium"
      : null,
    description: n.description ?? null,
    content: n.content ?? null,
    color: n.color ?? null,
    icon: n.icon ?? null,
  };
}

// --- Date helpers ---

export function isOverdue(date: string | null | undefined): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const diff = new Date(date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function formatRelativeDeadline(date: string | null | undefined): string {
  if (!date) return "No due date";
  const d = daysUntil(date);
  if (d === null) return "No due date";
  if (d < -30) {
    const months = Math.round(Math.abs(d) / 30);
    return `Overdue ${months}mo`;
  }
  if (d < -7) return `Overdue ${Math.round(Math.abs(d) / 7)}w`;
  if (d < 0) return `Overdue ${Math.abs(d)}d`;
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  if (d <= 7) return `In ${d} days`;
  if (d <= 14) return "In 1–2 weeks";
  const weeks = Math.round(d / 7);
  if (weeks < 8) return `In ${weeks} weeks`;
  const months = Math.round(d / 30);
  return `In ~${months} months`;
}

export function safeTaskStatus(s: string | null | undefined): TaskStatus {
  if (s && VALID_TASK_STATUSES.includes(s as TaskStatus)) return s as TaskStatus;
  return "todo";
}

export function safePriority(p: string | null | undefined): Priority {
  if (p && VALID_PRIORITIES.includes(p as Priority)) return p as Priority;
  return "medium";
}

const VALID_CAPTURE_SOURCES: CaptureSource[] = ["chatgpt", "claude", "manual", "whatsapp", "email", "meeting", "other"];
const VALID_CAPTURE_TYPES: CaptureType[] = ["note", "task", "idea", "decision", "bug", "roadmap", "goal", "project_update", "sales_note", "technical_note"];
const VALID_CAPTURE_STATUSES: CaptureStatus[] = ["inbox", "processed", "archived"];

export function normalizeCapture(c: MioCapture): MioCapture {
  return {
    ...c,
    title: c.title?.trim() || "Untitled Capture",
    content: c.content ?? "",
    source: VALID_CAPTURE_SOURCES.includes(c.source as CaptureSource) ? c.source as CaptureSource : "manual",
    type: VALID_CAPTURE_TYPES.includes(c.type as CaptureType) ? c.type as CaptureType : "note",
    status: VALID_CAPTURE_STATUSES.includes(c.status as CaptureStatus) ? c.status as CaptureStatus : "inbox",
    priority: VALID_PRIORITIES.includes(c.priority as Priority) ? c.priority as Priority : "medium",
    tags: c.tags ?? null,
    nodeId: c.nodeId ?? null,
    convertedToType: c.convertedToType ?? null,
    convertedToId: c.convertedToId ?? null,
  };
}
