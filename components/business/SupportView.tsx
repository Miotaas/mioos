"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { LifeBuoy, Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";

interface Product { id: string; name: string; }
interface Lead { id: string; companyName: string; }
interface SupportIssue {
  id: string;
  leadId: string | null;
  productId: string | null;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lead: Lead | null;
  product: Product | null;
}

const SEVERITY_COLOR: Record<string, string> = {
  low: "#10b981", medium: "#f59e0b", high: "#f97316", critical: "#ef4444",
};

const STATUS_COLOR: Record<string, string> = {
  open: "#ef4444", in_progress: "#f59e0b", waiting_customer: "#6366f1",
  resolved: "#10b981", archived: "#475569",
};

const SEVERITIES = ["low", "medium", "high", "critical"];
const STATUSES = ["open", "in_progress", "waiting_customer", "resolved", "archived"];

interface FormState {
  title: string;
  description: string;
  severity: string;
  status: string;
  leadId: string;
  productId: string;
}

const DEFAULT_FORM: FormState = {
  title: "", description: "", severity: "medium", status: "open", leadId: "", productId: "",
};

const inputCls = "w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50 transition-colors";

function fmtDate(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function SupportView() {
  const { showToast } = useAppStore();
  const [issues, setIssues] = useState<SupportIssue[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<SupportIssue | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | string>("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | string>("all");

  useEffect(() => {
    Promise.all([
      fetch("/api/support").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/leads").then((r) => r.json()),
    ]).then(([i, p, l]) => {
      setIssues(Array.isArray(i) ? i : []);
      setProducts(Array.isArray(p) ? p : []);
      setLeads(Array.isArray(l) ? l : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditingIssue(null);
    setForm(DEFAULT_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(issue: SupportIssue, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingIssue(issue);
    setForm({
      title: issue.title,
      description: issue.description ?? "",
      severity: issue.severity,
      status: issue.status,
      leadId: issue.leadId ?? "",
      productId: issue.productId ?? "",
    });
    setFormError("");
    setModalOpen(true);
  }

  async function save() {
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    setSaving(true);
    setFormError("");
    try {
      const method = editingIssue ? "PATCH" : "POST";
      const url = editingIssue ? `/api/support/${editingIssue.id}` : "/api/support";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      if (editingIssue) {
        setIssues((prev) => prev.map((i) => (i.id === editingIssue.id ? saved : i)));
        showToast("Issue updated");
      } else {
        setIssues((prev) => [saved, ...prev]);
        showToast("Issue created");
      }
      setModalOpen(false);
    } catch {
      setFormError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function resolveIssue(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const res = await fetch(`/api/support/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" }),
    });
    const updated = await res.json();
    setIssues((prev) => prev.map((i) => (i.id === id ? updated : i)));
    showToast("Issue resolved");
  }

  async function deleteIssue(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/support/${id}`, { method: "DELETE" });
    setIssues((prev) => prev.filter((i) => i.id !== id));
    showToast("Issue deleted");
  }

  const filtered = issues.filter((i) => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (severityFilter !== "all" && i.severity !== severityFilter) return false;
    return true;
  });

  const openCount = issues.filter((i) => i.status === "open").length;
  const criticalCount = issues.filter((i) => i.severity === "critical" && i.status !== "resolved" && i.status !== "archived").length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-accent-red" /> Support
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            {openCount} open
            {criticalCount > 0 && <span className="text-accent-red ml-2">{criticalCount} critical</span>}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" /> New Issue
        </Button>
      </div>

      <div className="flex items-center gap-2 px-6 py-2.5 border-b border-white/[0.06] overflow-x-auto">
        {["all", ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn("text-xs px-3 py-1.5 rounded-lg whitespace-nowrap capitalize transition-all", statusFilter === s ? "bg-accent-purple/15 text-accent-purple border border-accent-purple/25" : "text-text-muted hover:text-text-secondary hover:bg-white/[0.04]")}
          >
            {s.replace("_", " ")} {s === "all" ? `(${issues.length})` : `(${issues.filter((i) => i.status === s).length})`}
          </button>
        ))}
        <div className="h-4 w-px bg-white/[0.06] mx-1 flex-shrink-0" />
        {SEVERITIES.map((s) => (
          <button
            key={s}
            onClick={() => setSeverityFilter(severityFilter === s ? "all" : s)}
            className={cn("text-xs px-2.5 py-1.5 rounded-lg capitalize whitespace-nowrap transition-all border", severityFilter === s ? "border-current" : "border-white/[0.04] hover:border-white/[0.08]")}
            style={severityFilter === s ? { color: SEVERITY_COLOR[s], borderColor: `${SEVERITY_COLOR[s]}40`, background: `${SEVERITY_COLOR[s]}15` } : { color: "#94a3b8" }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading && <p className="text-sm text-text-muted py-4">Loading...</p>}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <LifeBuoy className="w-8 h-8 mx-auto mb-3 text-text-ghost" />
            <p className="text-sm text-text-secondary">No issues found</p>
            <Button variant="primary" size="sm" onClick={openCreate} className="mt-4">
              <Plus className="w-3.5 h-3.5" /> Log first issue
            </Button>
          </div>
        )}

        <div className="space-y-2 max-w-3xl">
          {filtered.map((issue) => {
            const severityColor = SEVERITY_COLOR[issue.severity] ?? "#94a3b8";
            const statusColor = STATUS_COLOR[issue.status] ?? "#94a3b8";
            const resolved = issue.status === "resolved" || issue.status === "archived";
            return (
              <div
                key={issue.id}
                className={cn(
                  "group p-4 rounded-xl border transition-all",
                  resolved ? "opacity-50 border-white/[0.04] bg-white/[0.01]" : "border-white/[0.06] bg-surface-2 hover:border-white/[0.1]"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={cn("text-sm font-semibold text-text-primary", resolved && "line-through text-text-muted")}>{issue.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize" style={{ color: severityColor, background: `${severityColor}15` }}>
                        {issue.severity}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize" style={{ color: statusColor, background: `${statusColor}15` }}>
                        {issue.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-text-muted flex-wrap">
                      {issue.lead && <span>{issue.lead.companyName}</span>}
                      {issue.product && <span>{issue.product.name}</span>}
                      <span>{fmtDate(issue.createdAt)}</span>
                    </div>
                    {issue.description && (
                      <p className="text-xs text-text-muted mt-2 line-clamp-2">{issue.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                    {!resolved && (
                      <button onClick={(e) => resolveIssue(issue.id, e)} className="p-1.5 rounded hover:bg-accent-green/10 text-text-muted hover:text-accent-green transition-all" title="Resolve">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={(e) => openEdit(issue, e)} className="p-1.5 rounded hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-all">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => deleteIssue(issue.id, e)} className="p-1.5 rounded hover:bg-accent-red/10 text-text-muted hover:text-accent-red transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingIssue ? "Edit Issue" : "New Support Issue"}>
        <div className="space-y-3">
          <Field label="Title *">
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Describe the issue" className={inputCls} autoFocus />
          </Field>
          <Field label="Description">
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="Details, steps to reproduce, etc." className={`${inputCls} resize-none`} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Severity">
              <select value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))} className={inputCls}>
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </Field>
            <Field label="Client (optional)">
              <select value={form.leadId} onChange={(e) => setForm((f) => ({ ...f, leadId: e.target.value }))} className={inputCls}>
                <option value="">— None —</option>
                {leads.map((l) => <option key={l.id} value={l.id}>{l.companyName}</option>)}
              </select>
            </Field>
            <Field label="Product (optional)">
              <select value={form.productId} onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))} className={inputCls}>
                <option value="">— None —</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          </div>
          {formError && <p className="text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="flex gap-3 pt-1">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button variant="primary" onClick={save} disabled={saving} className="flex-1">{saving ? "Saving..." : editingIssue ? "Save" : "Create Issue"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-text-muted mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
