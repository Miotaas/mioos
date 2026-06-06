"use client";

import { useState, useEffect } from "react";
import { MioNode, NodeType, NodeStatus, Priority } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn, NODE_COLORS } from "@/lib/utils";

const NODE_TYPES: NodeType[] = ["project", "idea", "task", "goal", "note", "person", "workflow", "decision", "problem", "roadmap", "system"];
const NODE_STATUSES: NodeStatus[] = ["inbox", "active", "blocked", "done", "archived"];
const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];

interface Props {
  open: boolean;
  onClose: () => void;
  node?: MioNode | null;
  onSaved: (node: MioNode) => void;
}

export function NodeModal({ open, onClose, node, onSaved }: Props) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<NodeType>("project");
  const [status, setStatus] = useState<NodeStatus>("inbox");
  const [priority, setPriority] = useState<Priority>("medium");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLabel(node?.label ?? "");
    setType((node?.type as NodeType) ?? "project");
    setStatus((node?.status as NodeStatus) ?? "inbox");
    setPriority((node?.priority as Priority) ?? "medium");
    setDescription(node?.description ?? "");
    setError("");
    setSaving(false);
  }, [open, node]);

  async function save() {
    if (!label.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError("");
    try {
      const body = {
        label: label.trim(),
        type,
        status,
        priority,
        description: description.trim() || null,
        color: NODE_COLORS[type],
      };
      const res = node
        ? await fetch(`/api/nodes/${node.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/nodes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...body, posX: Math.round(Math.random() * 600 + 100), posY: Math.round(Math.random() * 400 + 100) }),
          });
      if (!res.ok) throw new Error("Server error");
      const saved: MioNode = await res.json();
      onSaved(saved);
      onClose();
    } catch {
      setError("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={node ? `Edit: ${node.label}` : "New Node"}>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-text-muted mb-1.5 block">Title *</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="Node title..."
            autoFocus
            className="w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as NodeType)}
              className="w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-3 py-2.5 text-text-primary focus:outline-none focus:border-accent-purple/50 capitalize"
            >
              {NODE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as NodeStatus)}
              className="w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-3 py-2.5 text-text-primary focus:outline-none focus:border-accent-purple/50 capitalize"
            >
              {NODE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-text-muted mb-1.5 block">Priority</label>
          <div className="flex gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={cn(
                  "flex-1 text-xs py-1.5 rounded-lg border capitalize transition-all",
                  priority === p
                    ? `priority-${p} border-current`
                    : "text-text-ghost border-white/[0.06] hover:border-white/[0.12] hover:text-text-muted"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-text-muted mb-1.5 block">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
            rows={3}
            className="w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50 resize-none transition-colors"
          />
        </div>

        {error && (
          <p className="text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving} className="flex-1">
            {saving ? "Saving..." : node ? "Save Changes" : "Create Node"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
