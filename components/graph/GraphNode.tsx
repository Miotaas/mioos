"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { MioNode } from "@/types";
import { NODE_COLORS, STATUS_COLORS } from "@/lib/utils";
import {
  Brain, FolderOpen, Lightbulb, CheckSquare, Target, FileText,
  User, GitBranch, GitMerge, AlertTriangle, Map, Cpu, Mail, TrendingUp,
  LayoutDashboard,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  brain: Brain,
  folder: FolderOpen,
  lightbulb: Lightbulb,
  "check-square": CheckSquare,
  target: Target,
  "file-text": FileText,
  user: User,
  "git-branch": GitBranch,
  "git-merge": GitMerge,
  "alert-triangle": AlertTriangle,
  map: Map,
  cpu: Cpu,
  mail: Mail,
  "trending-up": TrendingUp,
  "layout-dashboard": LayoutDashboard,
};

interface GraphNodeData {
  node: MioNode;
  onClick?: () => void;
}

export const GraphNode = memo(function GraphNode({ data }: NodeProps) {
  const { node } = data as unknown as GraphNodeData;

  // Safe fallbacks — node data may come from old SQLite records
  const safeType = node?.type || "project";
  const safeStatus = node?.status || "inbox";
  const color = node?.color || NODE_COLORS[safeType] || "#6366f1";
  const statusColor = STATUS_COLORS[safeStatus] || "#94a3b8";
  const IconComp = ICON_MAP[node?.icon || ""] || FolderOpen;
  const label = node?.label?.trim() || "Untitled";

  return (
    <div
      className="relative group cursor-pointer select-none"
      style={{ minWidth: 140, maxWidth: 180 }}
    >
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: color, border: "2px solid rgba(255,255,255,0.2)", width: 10, height: 10 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: color, border: "2px solid rgba(255,255,255,0.2)", width: 10, height: 10 }}
      />

      {/* Glow */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-lg"
        style={{ background: color, transform: "scale(1.1)" }}
      />

      {/* Card */}
      <div
        className="rounded-xl border p-3 transition-all duration-200 group-hover:scale-[1.02]"
        style={{
          background: `linear-gradient(135deg, rgba(18,18,28,0.95) 0%, rgba(${hexToRgb(color)},0.08) 100%)`,
          borderColor: `${color}30`,
          boxShadow: `0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`,
        }}
      >
        {/* Top row: icon + type */}
        <div className="flex items-center justify-between mb-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}20`, border: `1px solid ${color}30` }}
          >
            <IconComp className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: statusColor, boxShadow: `0 0 4px ${statusColor}80` }}
            />
            <span className="text-[9px] text-text-muted uppercase tracking-wider">{safeType}</span>
          </div>
        </div>

        {/* Label */}
        <p className="text-xs font-semibold text-text-primary leading-tight mb-1.5">
          {label}
        </p>

        {/* Description */}
        {node?.description && (
          <p className="text-[10px] text-text-secondary leading-relaxed line-clamp-2">
            {node.description}
          </p>
        )}

        {/* Bottom row: status + priority + task count */}
        <div className="flex items-center gap-1 mt-2">
          <span
            className="text-[9px] px-1.5 py-0.5 rounded border font-medium capitalize"
            style={{
              color: statusColor,
              borderColor: `${statusColor}30`,
              background: `${statusColor}10`,
            }}
          >
            {safeStatus}
          </span>
          {node?.priority && node.priority !== "medium" && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium priority-${node.priority}`}>
              {node.priority}
            </span>
          )}
          {node?.tasks && node.tasks.length > 0 && (
            <span className="ml-auto text-[9px] text-text-muted">
              {node.tasks.filter((t) => t.status === "done").length}/{node.tasks.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

function hexToRgb(hex: string): string {
  try {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return "99,102,241";
    return `${r},${g},${b}`;
  } catch {
    return "99,102,241";
  }
}
