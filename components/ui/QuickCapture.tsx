"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useAppStore } from "@/store/appStore";

export function QuickCapture() {
  const { showToast } = useAppStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("note");
  const [saving, setSaving] = useState(false);

  async function capture() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: title.trim(),
          type,
          source: "quick-capture",
          status: "inbox",
          priority: "medium",
        }),
      });
      if (!res.ok) throw new Error();
      showToast("Captured to inbox");
      setTitle("");
      setType("note");
      setOpen(false);
    } catch {
      showToast("Failed to capture", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* FAB — mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-6 right-5 z-40 w-14 h-14 rounded-full bg-accent-cyan flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        aria-label="Quick capture"
      >
        <Plus className="w-6 h-6 text-void" strokeWidth={2.5} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Quick Capture">
        <div className="space-y-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") capture(); }}
            placeholder="What's on your mind?"
            className="w-full text-sm bg-surface-3 border border-white/[0.08] rounded-xl px-4 py-3.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full text-sm bg-surface-3 border border-white/[0.08] rounded-xl px-4 py-3.5 text-text-primary focus:outline-none focus:border-accent-cyan/50 transition-colors"
          >
            <option value="note">Note</option>
            <option value="task">Task</option>
            <option value="idea">Idea</option>
            <option value="decision">Decision</option>
          </select>
          <button
            onClick={capture}
            disabled={!title.trim() || saving}
            className="w-full py-3.5 rounded-xl bg-accent-cyan text-void text-sm font-semibold disabled:opacity-40 transition-all active:scale-[0.98]"
          >
            {saving ? "Saving…" : "Capture to Inbox"}
          </button>
        </div>
      </Modal>
    </>
  );
}
