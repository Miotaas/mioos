"use client";

import { useEffect, useState, useRef } from "react";
import { MioNote, MioNode } from "@/types";
import { cn, formatRelativeDate } from "@/lib/utils";
import { normalizeNote } from "@/lib/normalize";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/store/appStore";
import { FileText, Search, Plus, Trash2, Save, X, Check } from "lucide-react";

export function NotesView() {
  const { showToast } = useAppStore();
  const [notes, setNotes] = useState<MioNote[]>([]);
  const [nodes, setNodes] = useState<MioNode[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MioNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Edit state (mirrors selected note)
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Refs keep current values available inside the debounce timer
  const editTitleRef = useRef("");
  const editContentRef = useRef("");
  const editTagsRef = useRef("");
  const selectedRef = useRef<MioNote | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // New note form
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newNodeId, setNewNodeId] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/notes").then((r) => r.json()),
      fetch("/api/nodes").then((r) => r.json()),
    ]).then(([n, nds]) => {
      setNotes((Array.isArray(n) ? n : []).map(normalizeNote));
      setNodes(Array.isArray(nds) ? nds : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function selectNote(note: MioNote) {
    // Cancel any pending save for previous note
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    const norm = normalizeNote(note);
    setSelected(norm);
    selectedRef.current = norm;
    editTitleRef.current = norm.title;
    editContentRef.current = norm.content;
    editTagsRef.current = norm.tags ? tryParseTags(norm.tags).join(", ") : "";
    setEditTitle(norm.title);
    setEditContent(norm.content);
    setEditTags(norm.tags ? tryParseTags(norm.tags).join(", ") : "");
    setIsDirty(false);
    setJustSaved(false);
    setCreating(false);
  }

  function handleEditChange(field: "title" | "content" | "tags", value: string) {
    if (field === "title") { setEditTitle(value); editTitleRef.current = value; }
    if (field === "content") { setEditContent(value); editContentRef.current = value; }
    if (field === "tags") { setEditTags(value); editTagsRef.current = value; }
    setIsDirty(true);
    setJustSaved(false);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      flushSave();
    }, 1500);
  }

  async function flushSave() {
    const note = selectedRef.current;
    const title = editTitleRef.current.trim();
    const content = editContentRef.current;
    const tags = editTagsRef.current;
    if (!note || !title) return;

    setSaving(true);
    try {
      const tagsArr = tags.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: content.trim() || "",
          tags: tagsArr.length ? JSON.stringify(tagsArr) : null,
        }),
      });
      if (!res.ok) return;
      const updated = normalizeNote(await res.json());
      setNotes((prev) => prev.map((n) => n.id === note.id ? updated : n));
      setSelected(updated);
      selectedRef.current = updated;
      setIsDirty(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function saveNoteManually() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    await flushSave();
  }

  async function createNote() {
    const title = newTitle.trim();
    const content = newContent.trim();
    if (!title || !content) return;
    setSaving(true);
    try {
      const tagsArr = newTags.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          tags: tagsArr.length ? JSON.stringify(tagsArr) : null,
          nodeId: newNodeId || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const created = normalizeNote(await res.json());
      setNotes((prev) => [created, ...prev]);
      selectNote(created);
      setCreating(false);
      setNewTitle("");
      setNewContent("");
      setNewTags("");
      setNewNodeId("");
      showToast("Note created");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(id: string) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selected?.id === id) {
      setSelected(null);
      selectedRef.current = null;
      setCreating(false);
    }
    showToast("Note deleted");
  }

  function tryParseTags(raw: string | null | undefined): string[] {
    if (!raw) return [];
    try { return JSON.parse(raw) as string[]; } catch { return []; }
  }

  const getNode = (nodeId?: string | null) => nodes.find((n) => n.id === nodeId);

  const filtered = notes.filter(
    (n) =>
      (n.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (n.content || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex overflow-hidden">
      {/* List */}
      <div className="w-72 flex-shrink-0 border-r border-white/[0.06] flex flex-col">
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <FileText className="w-4 h-4 text-accent-amber" />
              Notes
            </h1>
            <button
              onClick={() => { setCreating(true); setSelected(null); selectedRef.current = null; }}
              className="p-1.5 rounded-lg bg-accent-purple/15 text-accent-purple hover:bg-accent-purple/25 transition-all"
              title="New note"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="w-full text-xs bg-surface-3 border border-white/[0.06] rounded-lg pl-8 pr-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading && <div className="text-center py-8 text-text-muted text-xs">Loading...</div>}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-6 h-6 text-text-ghost mx-auto mb-2" />
              <p className="text-xs text-text-muted">
                {search ? "No results" : "No notes yet"}
              </p>
              {!search && (
                <button
                  onClick={() => { setCreating(true); setSelected(null); }}
                  className="mt-2 text-xs text-accent-purple hover:underline"
                >
                  Create your first note
                </button>
              )}
            </div>
          )}
          {filtered.map((note) => {
            const node = getNode(note.nodeId);
            return (
              <div key={note.id} className="group relative">
                <button
                  onClick={() => selectNote(note)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all pr-8",
                    selected?.id === note.id
                      ? "border-accent-purple/30 bg-accent-purple/10"
                      : "border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.02]"
                  )}
                >
                  <p className="text-xs font-medium text-text-primary truncate">{note.title || "Untitled"}</p>
                  <p className="text-[10px] text-text-secondary mt-1 line-clamp-2">{note.content || ""}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {node && <span className="text-[9px] text-text-muted">{node.label}</span>}
                    <span className="text-[9px] text-text-ghost ml-auto">{formatRelativeDate(note.updatedAt)}</span>
                  </div>
                </button>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1 rounded text-text-muted hover:text-accent-red transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail / Editor */}
      <div className="flex-1 overflow-y-auto">
        {creating ? (
          <div className="p-8 max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-text-primary">New Note</h2>
              <button
                onClick={() => setCreating(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Note title..."
                autoFocus
                className="w-full text-xl font-bold bg-transparent border-b border-white/[0.08] pb-2 text-text-primary placeholder:text-text-ghost focus:outline-none focus:border-accent-purple/40 transition-colors"
              />
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Write your note..."
                rows={12}
                className="w-full text-sm bg-transparent text-text-secondary placeholder:text-text-ghost focus:outline-none resize-none leading-relaxed"
              />
              <div className="flex gap-3 pt-2 border-t border-white/[0.06]">
                <input
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="Tags (comma-separated)"
                  className="flex-1 text-xs bg-surface-3 border border-white/[0.06] rounded-lg px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/40"
                />
                <select
                  value={newNodeId}
                  onChange={(e) => setNewNodeId(e.target.value)}
                  className="text-xs bg-surface-3 border border-white/[0.06] rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-purple/40"
                >
                  <option value="">No project</option>
                  {nodes.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setCreating(false)} size="sm">Cancel</Button>
                <Button
                  variant="primary"
                  onClick={createNote}
                  disabled={saving || !newTitle.trim() || !newContent.trim()}
                  size="sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "Saving..." : "Save Note"}
                </Button>
              </div>
            </div>
          </div>
        ) : selected ? (
          <div className="p-8 max-w-2xl h-full flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-text-ghost">{formatRelativeDate(selected.updatedAt)}</span>
              <div className="flex items-center gap-2">
                {justSaved && (
                  <span className="flex items-center gap-1 text-xs text-accent-green">
                    <Check className="w-3 h-3" />
                    Saved
                  </span>
                )}
                {isDirty && !justSaved && (
                  <button
                    onClick={saveNoteManually}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent-purple/15 text-accent-purple hover:bg-accent-purple/25 transition-all"
                  >
                    <Save className="w-3 h-3" />
                    {saving ? "Saving..." : "Save"}
                  </button>
                )}
                <button
                  onClick={() => deleteNote(selected.id)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-all"
                  title="Delete note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <input
              value={editTitle}
              onChange={(e) => handleEditChange("title", e.target.value)}
              className="text-xl font-bold bg-transparent border-b border-white/[0.06] pb-2 mb-4 text-text-primary focus:outline-none focus:border-accent-purple/40 transition-colors w-full"
              placeholder="Untitled"
            />
            <textarea
              value={editContent}
              onChange={(e) => handleEditChange("content", e.target.value)}
              className="flex-1 text-sm bg-transparent text-text-secondary focus:outline-none resize-none leading-relaxed w-full min-h-[300px]"
              placeholder="Start writing..."
            />
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <input
                value={editTags}
                onChange={(e) => handleEditChange("tags", e.target.value)}
                placeholder="Tags (comma-separated)"
                className="text-xs bg-transparent text-text-muted placeholder:text-text-ghost focus:outline-none w-full"
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-text-muted">
            <div className="text-center">
              <FileText className="w-8 h-8 mx-auto mb-3 text-text-ghost" />
              <p className="text-sm">Select a note to read</p>
              <button
                onClick={() => { setCreating(true); setSelected(null); }}
                className="mt-3 text-xs text-accent-purple hover:underline"
              >
                or create a new one
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
