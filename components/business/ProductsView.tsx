"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  Package, Plus, Pencil, Trash2, CheckCircle2, Zap, Clock, Rocket, Lightbulb,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  shortDescription: string;
  targetCustomers: string;
  painPoints: string;
  coreFeatures: string;
  demoAngle: string;
  pricingRange: string;
  implementationComplexity: string;
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  idea: { label: "Idea", color: "#94a3b8", icon: Lightbulb },
  building: { label: "Building", color: "#f59e0b", icon: Clock },
  "demo-ready": { label: "Demo Ready", color: "#3b82f6", icon: Zap },
  "pilot-ready": { label: "Pilot Ready", color: "#8b5cf6", icon: Rocket },
  live: { label: "Live", color: "#10b981", icon: CheckCircle2 },
};

const COMPLEXITY_COLOR: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#ef4444",
};

const PRODUCT_STATUSES = ["idea", "building", "demo-ready", "pilot-ready", "live"];

interface FormState {
  name: string;
  shortDescription: string;
  targetCustomers: string;
  painPoints: string;
  coreFeatures: string;
  demoAngle: string;
  pricingRange: string;
  implementationComplexity: string;
  status: string;
}

const DEFAULT_FORM: FormState = {
  name: "",
  shortDescription: "",
  targetCustomers: "",
  painPoints: "",
  coreFeatures: "",
  demoAngle: "",
  pricingRange: "",
  implementationComplexity: "medium",
  status: "building",
};

export function ProductsView() {
  const { showToast } = useAppStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
        if (data.length > 0) setSelected(data[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditingProduct(null);
    setForm(DEFAULT_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(p: Product, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingProduct(p);
    setForm({
      name: p.name,
      shortDescription: p.shortDescription,
      targetCustomers: p.targetCustomers,
      painPoints: p.painPoints,
      coreFeatures: p.coreFeatures,
      demoAngle: p.demoAngle,
      pricingRange: p.pricingRange,
      implementationComplexity: p.implementationComplexity,
      status: p.status,
    });
    setFormError("");
    setModalOpen(true);
  }

  async function save() {
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    setSaving(true);
    setFormError("");
    try {
      const body = { ...form };
      if (editingProduct) {
        const res = await fetch(`/api/products/${editingProduct.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        const updated = await res.json();
        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? updated : p)));
        if (selected?.id === editingProduct.id) setSelected(updated);
        showToast("Product updated");
      } else {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        const created = await res.json();
        setProducts((prev) => [...prev, created]);
        setSelected(created);
        showToast("Product created");
      }
      setModalOpen(false);
    } catch {
      setFormError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p.id !== id));
    if (selected?.id === id) setSelected(products.find((p) => p.id !== id) ?? null);
    showToast("Product deleted");
  }

  function parseFeatures(raw: string): string[] {
    try { return JSON.parse(raw); } catch { return raw.split("\n").filter(Boolean); }
  }

  const cfg = selected ? (STATUS_CONFIG[selected.status] ?? STATUS_CONFIG["building"]) : null;

  return (
    <div className="h-full flex overflow-hidden">
      {/* Product list */}
      <div className="w-72 flex-shrink-0 border-r border-white/[0.06] flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.06]">
          <div>
            <h1 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Package className="w-4 h-4 text-accent-purple" /> Products
            </h1>
            <p className="text-[10px] text-text-muted mt-0.5">{products.length} AI agent products</p>
          </div>
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {loading && <p className="text-xs text-text-muted px-2 py-4">Loading...</p>}
          {products.map((p) => {
            const s = STATUS_CONFIG[p.status] ?? STATUS_CONFIG["building"];
            const Icon = s.icon;
            return (
              <div
                key={p.id}
                onClick={() => setSelected(p)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(p); } }}
                role="button"
                tabIndex={0}
                className={cn(
                  "w-full text-left px-3 py-3 rounded-xl border transition-all group cursor-pointer",
                  selected?.id === p.id
                    ? "border-accent-purple/25 bg-accent-purple/10"
                    : "border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.02]"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-text-primary leading-snug">{p.name}</p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={(e) => openEdit(p, e)} className="p-1 rounded hover:bg-white/[0.06] text-text-muted hover:text-text-primary">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={(e) => deleteProduct(p.id, e)} className="p-1 rounded hover:bg-accent-red/10 text-text-muted hover:text-accent-red">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Icon className="w-3 h-3 flex-shrink-0" style={{ color: s.color }} />
                  <span className="text-[10px] font-medium" style={{ color: s.color }}>{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Product detail */}
      {selected && cfg ? (
        <div className="flex-1 overflow-y-auto">
          <div className="px-8 py-6 max-w-3xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-text-primary">{selected.name}</h2>
                <p className="text-sm text-text-secondary mt-1">{selected.shortDescription}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className="text-xs px-3 py-1.5 rounded-full font-medium border"
                  style={{ color: cfg.color, borderColor: `${cfg.color}30`, background: `${cfg.color}10` }}
                >
                  {cfg.label}
                </span>
                <button onClick={(e) => openEdit(selected, e)} className="p-2 rounded-lg hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-all">
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <InfoCard label="Target Customers" value={selected.targetCustomers} />
              <InfoCard label="Pain Points Addressed" value={selected.painPoints} />
              <InfoCard label="Pricing Range" value={selected.pricingRange} />
              <InfoCard
                label="Implementation Complexity"
                value={selected.implementationComplexity}
                valueColor={COMPLEXITY_COLOR[selected.implementationComplexity]}
              />
            </div>

            <div className="space-y-4">
              <Section label="Demo Angle" content={selected.demoAngle} />

              <div className="bg-surface-2 border border-white/[0.06] rounded-xl p-4">
                <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-3">Core Features</p>
                <ul className="space-y-1.5">
                  {parseFeatures(selected.coreFeatures).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                      <span className="text-accent-purple mt-0.5">•</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        !loading && (
          <div className="flex-1 flex items-center justify-center text-text-muted">
            <div className="text-center">
              <Package className="w-8 h-8 mx-auto mb-3 text-text-ghost" />
              <p className="text-sm">Select a product to view details</p>
            </div>
          </div>
        )
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingProduct ? "Edit Product" : "New Product"}>
        <div className="space-y-3">
          <Field label="Product Name *">
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Follow-Up & Action Watchdog" className={inputCls} autoFocus />
          </Field>
          <Field label="Short Description">
            <input value={form.shortDescription} onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))} placeholder="One sentence description" className={inputCls} />
          </Field>
          <Field label="Target Customers">
            <input value={form.targetCustomers} onChange={(e) => setForm((f) => ({ ...f, targetCustomers: e.target.value }))} placeholder="e.g. SMBs, consultancies, law firms" className={inputCls} />
          </Field>
          <Field label="Pain Points">
            <textarea value={form.painPoints} onChange={(e) => setForm((f) => ({ ...f, painPoints: e.target.value }))} rows={2} placeholder="What problem does it solve?" className={`${inputCls} resize-none`} />
          </Field>
          <Field label="Core Features (one per line)">
            <textarea value={form.coreFeatures} onChange={(e) => setForm((f) => ({ ...f, coreFeatures: e.target.value }))} rows={3} placeholder="Feature 1&#10;Feature 2&#10;Feature 3" className={`${inputCls} resize-none`} />
          </Field>
          <Field label="Demo Angle">
            <textarea value={form.demoAngle} onChange={(e) => setForm((f) => ({ ...f, demoAngle: e.target.value }))} rows={2} placeholder="How will you demo this?" className={`${inputCls} resize-none`} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pricing Range">
              <input value={form.pricingRange} onChange={(e) => setForm((f) => ({ ...f, pricingRange: e.target.value }))} placeholder="€300–600/mo" className={inputCls} />
            </Field>
            <Field label="Complexity">
              <select value={form.implementationComplexity} onChange={(e) => setForm((f) => ({ ...f, implementationComplexity: e.target.value }))} className={inputCls}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </Field>
          </div>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
              {PRODUCT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>)}
            </select>
          </Field>
          {formError && <p className="text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="flex gap-3 pt-1">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button variant="primary" onClick={save} disabled={saving} className="flex-1">{saving ? "Saving..." : editingProduct ? "Save" : "Create"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoCard({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="bg-surface-2 border border-white/[0.06] rounded-xl p-4">
      <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className="text-sm text-text-secondary capitalize" style={valueColor ? { color: valueColor } : undefined}>{value || "—"}</p>
    </div>
  );
}

function Section({ label, content }: { label: string; content: string }) {
  return (
    <div className="bg-surface-2 border border-white/[0.06] rounded-xl p-4">
      <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-2">{label}</p>
      <p className="text-sm text-text-secondary leading-relaxed">{content || "—"}</p>
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

const inputCls = "w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50 transition-colors";
