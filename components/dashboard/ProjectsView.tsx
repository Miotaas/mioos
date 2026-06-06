"use client";

import { useEffect, useState } from "react";
import { MioNode, MioTask } from "@/types";
import { cn, NODE_COLORS, STATUS_COLORS } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { NodeModal } from "@/components/nodes/NodeModal";
import {
  FolderOpen, Plus, Folder, Target, GitBranch, User, Lightbulb, Server,
  FileText, CheckSquare, AlertTriangle, GitPullRequest, Map,
} from "lucide-react";
import type { LucideProps } from "lucide-react";

const NODE_TYPE_ICON: Record<string, React.ComponentType<LucideProps>> = {
  project: Folder,
  goal: Target,
  workflow: GitBranch,
  person: User,
  idea: Lightbulb,
  system: Server,
  note: FileText,
  task: CheckSquare,
  problem: AlertTriangle,
  decision: GitPullRequest,
  roadmap: Map,
};

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r},${g},${b}`;
}

export function ProjectsView() {
  const { setSelectedNode, showToast } = useAppStore();
  const [nodes, setNodes] = useState<MioNode[]>([]);
  const [tasks, setTasks] = useState<MioTask[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [newNodeOpen, setNewNodeOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/nodes").then((r) => r.json()),
      fetch("/api/tasks").then((r) => r.json()),
    ]).then(([n, t]) => {
      setNodes(Array.isArray(n) ? n : []);
      setTasks(Array.isArray(t) ? t : []);
    });
  }, []);

  const types = ["all", ...Array.from(new Set(nodes.map((n) => n.type)))];
  const filtered = typeFilter === "all" ? nodes : nodes.filter((n) => n.type === typeFilter);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-accent-purple" />
            Projects & Nodes
          </h1>
          <p className="text-xs text-text-muted mt-0.5">{nodes.length} total nodes</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setNewNodeOpen(true)}>
          <Plus className="w-3.5 h-3.5" />
          New Node
        </Button>
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-2 px-6 py-2.5 border-b border-white/[0.06] overflow-x-auto">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-lg capitalize whitespace-nowrap transition-all",
              typeFilter === t
                ? "bg-accent-purple/15 text-accent-purple border border-accent-purple/25"
                : "text-text-muted hover:text-text-secondary hover:bg-white/[0.04]"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <FolderOpen className="w-10 h-10 text-text-ghost mx-auto mb-4" />
            <p className="text-sm text-text-secondary">No nodes yet</p>
            <p className="text-xs text-text-muted mt-1 mb-4">Create your first node to get started</p>
            <Button variant="primary" size="sm" onClick={() => setNewNodeOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              Create first node
            </Button>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((node) => {
            const color = node.color || NODE_COLORS[node.type] || "#6366f1";
            const TypeIcon = NODE_TYPE_ICON[node.type] || Folder;
            const nodeTaskList = tasks.filter((t) => t.nodeId === node.id);
            const doneTasks = nodeTaskList.filter((t) => t.status === "done").length;
            const progress = nodeTaskList.length > 0 ? Math.round((doneTasks / nodeTaskList.length) * 100) : 0;

            return (
              <button
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className="p-4 rounded-xl border text-left transition-all hover:scale-[1.01] group"
                style={{
                  borderColor: `${color}25`,
                  background: `linear-gradient(135deg, rgba(18,18,28,0.95) 0%, rgba(${hexToRgb(color)},0.06) 100%)`,
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: `${color}20`, border: `1px solid ${color}30` }}
                  >
                    <TypeIcon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: STATUS_COLORS[node.status], boxShadow: `0 0 4px ${STATUS_COLORS[node.status]}80` }}
                    />
                    <span className="text-[9px] text-text-muted capitalize">{node.status}</span>
                  </div>
                </div>

                <p className="text-sm font-semibold text-text-primary mb-1">{node.label}</p>
                <p className="text-[11px] text-text-muted uppercase tracking-wide mb-2">{node.type}</p>

                {node.description && (
                  <p className="text-xs text-text-secondary line-clamp-2 mb-3">{node.description}</p>
                )}

                {nodeTaskList.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-text-muted mb-1.5">
                      <span>Tasks</span>
                      <span>{doneTasks}/{nodeTaskList.length}</span>
                    </div>
                    <ProgressBar value={progress} color={color} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <NodeModal
        open={newNodeOpen}
        onClose={() => setNewNodeOpen(false)}
        onSaved={(node) => {
          setNodes((prev) => [node, ...prev]);
          showToast("Node created");
        }}
      />
    </div>
  );
}
