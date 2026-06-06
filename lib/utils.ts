import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { NodeType, Priority, TaskStatus, GoalStatus, NodeStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const NODE_COLORS: Record<NodeType, string> = {
  project: "#6366f1",
  idea: "#ec4899",
  task: "#3b82f6",
  goal: "#10b981",
  note: "#f59e0b",
  person: "#8b5cf6",
  workflow: "#06b6d4",
  decision: "#ef4444",
  problem: "#f97316",
  roadmap: "#14b8a6",
  system: "#6366f1",
};

export const NODE_ICONS: Record<NodeType, string> = {
  project: "folder",
  idea: "lightbulb",
  task: "check-square",
  goal: "target",
  note: "file-text",
  person: "user",
  workflow: "git-branch",
  decision: "git-merge",
  problem: "alert-triangle",
  roadmap: "map",
  system: "cpu",
};

export const STATUS_COLORS: Record<NodeStatus, string> = {
  inbox: "#94a3b8",
  active: "#10b981",
  blocked: "#ef4444",
  done: "#6366f1",
  archived: "#475569",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: "#94a3b8",
  medium: "#f59e0b",
  high: "#f97316",
  urgent: "#ef4444",
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: "#94a3b8",
  in_progress: "#3b82f6",
  blocked: "#ef4444",
  done: "#10b981",
  cancelled: "#475569",
};

export const GOAL_STATUS_COLORS: Record<GoalStatus, string> = {
  active: "#10b981",
  achieved: "#6366f1",
  abandoned: "#475569",
  paused: "#f59e0b",
};

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatRelativeDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(d);
}

export function truncate(str: string, length = 100): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}
