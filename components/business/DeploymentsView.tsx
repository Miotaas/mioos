"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Server, Plus, Pencil, Trash2, Calendar, AlertCircle } from "lucide-react";

interface Product { id: string; name: string; }
interface Lead { id: string; companyName: string; }
interface Deployment {
  id: string;
  leadId: string | null;
  productId: string | null;
  status: string;
  environment: string;
  monthlyPrice: number | null;
  setupStatus: string | null;
  lastCheckIn: string | null;
  nextCheckIn: string | null;
  issuesCount: number;
  notes: string | null;
  lead: Lead | null;
  product: Product | null;
}

const STATUS_COLOR: Record<string, string> = {
  planned: "#6366f1", configuring: "#f59e0b", testing: "#3b82f6",
  live: "#10b981", paused: "#f97316", cancelled: "#ef4444",
};

const ENV_COLOR: Record<string, string> = {
  demo: "#6366f1", pilot: "#f59e0b", production: "#10b981",
};

const DEPLOYMENT_STATUSES = ["planned", "configuring", "testing", "live", "paused", "cancelled"];
const ENVIRONMENTS = ["demo", "pilot", "production"];

interface FormState {
  leadId: string;
  productId: string;
  status: string;
  environment: string;
  monthlyPrice: string;
  setupStatus: string;
  nextCheckIn: string;
  notes: string;
}

const DEFAULT_FORM: FormState = {
  leadId: "", productId: "", status: "planned", environment: "demo",
  monthlyPrice: "", setupStatus: "", nextCheckIn: "", notes: "",
};

const inputCls = "w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50 transition-colors";

function fmtDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(date: string | null): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

export function DeploymentsView() {
  const { showToast } = useAppStore();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeployment, setEditingDeployment] = useState<Deployment | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | string>("all");

  useEffect(() => {
    Promise.all([
      fetch("/api/deployments").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/leads").then((r) => r.json()),
    ]).then(([d, p, l]) => {
      setDeployments(Array.isArray(d) ? d : []);
      setProducts(Array.isArray(p) ? p : []);
      setLeads(Array.isArray(l) ? l : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditingDeployment(null);
    setForm(DEFAULT_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(d: Deployment, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingDeployment(d);
    setForm({
      leadId: d.leadId ?? "",
      productId: d.productId ?? "",
      status: d.status,
      environment: d.environment,
      monthlyPrice: d.monthlyPrice?.toString() ?? "",
      setupStatus: d.setupStatus ?? "",
      nextCheckIn: d.nextCheckIn ? d.nextCheckIn.split("T")[0] : "",
      notes: d.notes ?? "",
    });
    setFormError("");
    setModalOpen(true);
  }

  async function save() {
    setSaving(true);
    setFormError("");
    try {
      const body = { ...form };
      const method = editingDeployment ? "PATCH" : "POST";
      const url = editingDeployment ? `/api/deployments/${editingDeployment.id}` : "/api/deployments";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      if (editingDeployment) {
        setDeployments((prev) => prev.map((d) => (d.id === editingDeployment.id ? saved : d)));
        showToast("Deployment updated");
      } else {
        setDeployments((prev) => [saved, ...prev]);
        showToast("Deployment created");
      }
      setModalOpen(false);
    } catch {
      setFormError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteDeployment(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/deployments/${id}`, { method: "DELETE" });
    setDeployments((prev) => prev.filter((d) => d.id !== id));
    showToast("Deployment deleted");
  }

  async function updateDeploymentStatus(id: string, status: string) {
    const res = await fetch(`/api/deployments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const updated = await res.json();
    setDeployments((prev) => prev.map((d) => (d.id === id ? updated : d)));
  }

  const filtered = statusFilter === "all" ? deployments : deployments.filter((d) => d.status === statusFilter);
  const liveCount = deployments.filter((d) => d.status === "live").length;
  const overdueCheckIns = deployments.filter((d) => isOverdue(d.nextCheckIn) && d.status === "live").length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Server className="w-5 h-5 text-accent-blue" /> Deployments
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            {liveCount} live · {deployments.length} total
            {overdueCheckIns > 0 && <span className="text-accent-red ml-2">{overdueCheckIns} overdue check-in{overdueCheckIns > 1 ? "s" : ""}</span>}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" /> New Deployment
        </Button>
      </div>

      <div className="flex items-center gap-2 px-6 py-2.5 border-b border-white/[0.06] overflow-x-auto">
        <button
          onClick={() => setStatusFilter("all")}
          className={cn("text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-all", statusFilter === "all" ? "bg-accent-purple/15 text-accent-purple border border-accent-purple/25" : "text-text-muted hover:text-text-secondary hover:bg-white/[0.04]")}
        >
          All ({deployments.length})
        </button>
        {DEPLOYMENT_STATUSES.map((s) => {
          const count = deployments.filter((d) => d.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn("text-xs px-3 py-1.5 rounded-lg whitespace-nowrap capitalize transition-all", statusFilter === s ? "bg-accent-purple/15 text-accent-purple border border-accent-purple/25" : "text-text-muted hover:text-text-secondary hover:bg-white/[0.04]")}
            >
              {s} ({count})
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading && <p className="text-sm text-text-muted py-4">Loading...</p>}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <Server className="w-8 h-8 mx-auto mb-3 text-text-ghost" />
            <p className="text-sm text-text-secondary">No deployments yet</p>
            <Button variant="primary" size="sm" onClick={openCreate} className="mt-4">
              <Plus className="w-3.5 h-3.5" /> Create first deployment
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 max-w-3xl">
          {filtered.map((d) => {
            const overdue = isOverdue(d.nextCheckIn) && d.status === "live";
            const statusColor = STATUS_COLOR[d.status] ?? "#6366f1";
            const envColor = ENV_COLOR[d.environment] ?? "#6366f1";
            return (
              <div
                key={d.id}
                className={cn(
                  "group p-4 rounded-xl border transition-all",
                  overdue ? "border-accent-red/25 bg-accent-red/5" : "border-white/[0.06] bg-surface-2 hover:border-white/[0.1]"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-sm font-semibold text-text-primary">
                        {d.lead?.companyName ?? "Unknown Client"}
                      </span>
                      {overdue && <AlertCircle className="w-3.5 h-3.5 text-accent-red flex-shrink-0" />}
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: statusColor, background: `${statusColor}15` }}>
                        {d.status}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: envColor, background: `${envColor}15` }}>
                        {d.environment}
                      </span>
                    </div>
                    {d.product && <p className="text-xs text-text-muted mb-2">{d.product.name}</p>}
                    <div className="flex items-center gap-4 text-[10px] text-text-muted flex-wrap">
                      {d.monthlyPrice && <span className="text-accent-green font-medium">€{d.monthlyPrice}/mo</span>}
                      {d.setupStatus && <span>Setup: {d.setupStatus}</span>}
                      {d.lastCheckIn && <span>Last check-in: {fmtDate(d.lastCheckIn)}</span>}
                      {d.nextCheckIn && (
                        <span className={cn("flex items-center gap-1", overdue ? "text-accent-red font-medium" : "")}>
                          <Calendar className="w-3 h-3" />
                          Next: {fmtDate(d.nextCheckIn)}
                          {overdue && " — OVERDUE"}
                        </span>
                      )}
                      {d.issuesCount > 0 && <span className="text-accent-red">{d.issuesCount} issue{d.issuesCount > 1 ? "s" : ""}</span>}
                    </div>
                    {d.notes && <p className="text-xs text-text-muted mt-2 truncate">{d.notes}</p>}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={d.status}
                      onChange={(e) => updateDeploymentStatus(d.id, e.target.value)}
                      className="text-[10px] bg-surface-3 border border-white/[0.08] rounded-lg px-2 py-1 text-text-muted focus:outline-none focus:border-accent-purple/50"
                    >
                      {DEPLOYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={(e) => openEdit(d, e)} className="p-1.5 rounded hover:bg-white/[0.06] text-text-muted hover:text-text-primary">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => deleteDeployment(d.id, e)} className="p-1.5 rounded hover:bg-accent-red/10 text-text-muted hover:text-accent-red">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingDeployment ? "Edit Deployment" : "New Deployment"}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Client">
              <select value={form.leadId} onChange={(e) => setForm((f) => ({ ...f, leadId: e.target.value }))} className={inputCls}>
                <option value="">— Select client —</option>
                {leads.map((l) => <option key={l.id} value={l.id}>{l.companyName}</option>)}
              </select>
            </Field>
            <Field label="Product">
              <select value={form.productId} onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))} className={inputCls}>
                <option value="">— Select product —</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
                {DEPLOYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Environment">
              <select value={form.environment} onChange={(e) => setForm((f) => ({ ...f, environment: e.target.value }))} className={inputCls}>
                {ENVIRONMENTS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </Field>
            <Field label="Monthly Price (€)">
              <input value={form.monthlyPrice} onChange={(e) => setForm((f) => ({ ...f, monthlyPrice: e.target.value }))} type="number" placeholder="500" className={inputCls} />
            </Field>
            <Field label="Next Check-In">
              <input value={form.nextCheckIn} onChange={(e) => setForm((f) => ({ ...f, nextCheckIn: e.target.value }))} type="date" className={inputCls} />
            </Field>
          </div>
          <Field label="Setup Status">
            <input value={form.setupStatus} onChange={(e) => setForm((f) => ({ ...f, setupStatus: e.target.value }))} placeholder="e.g. Credentials received" className={inputCls} />
          </Field>
          <Field label="Notes">
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
          </Field>
          {formError && <p className="text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="flex gap-3 pt-1">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button variant="primary" onClick={save} disabled={saving} className="flex-1">{saving ? "Saving..." : editingDeployment ? "Save" : "Create"}</Button>
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
