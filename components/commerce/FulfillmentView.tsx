"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { FulfillmentFlow, FulfillmentStatus, PaymentProvider, DeliveryType } from "@/types";
import { Plus, Package, X } from "lucide-react";

const PROVIDER_LABELS: Record<PaymentProvider, string> = {
  stripe: "Stripe", gumroad: "Gumroad", shopify: "Shopify", manual: "Manual",
};
const DELIVERY_LABELS: Record<DeliveryType, string> = {
  email_delivery: "Email Delivery", download_link: "Download Link", license_key: "License Key",
  affiliate_redirect: "Affiliate Redirect", manual_delivery: "Manual Delivery", onboarding_call: "Onboarding Call",
};

function statusBadge(status: FulfillmentStatus) {
  const cfg: Record<FulfillmentStatus, string> = {
    draft: "bg-white/[0.06] text-text-muted border-white/[0.08]",
    approved: "bg-accent-green/10 text-accent-green border-accent-green/20",
    active: "bg-accent-green/15 text-accent-green border-accent-green/30",
    archived: "bg-white/[0.04] text-text-ghost border-white/[0.06]",
  };
  return cfg[status] ?? cfg.draft;
}

const EMPTY_FORM = {
  name: "", productName: "", paymentProvider: "manual" as PaymentProvider,
  deliveryType: "email_delivery" as DeliveryType,
  confirmationEmailTemplate: "", invoiceRequired: false,
  deliveryEmailTemplate: "", followUpEmailTemplate: "", supportInstructions: "",
};

export function FulfillmentView() {
  const [items, setItems] = useState<FulfillmentFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await fetch("/api/commerce/fulfillment").then(r => r.json());
      setItems(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }

  async function create() {
    if (!form.name.trim() || !form.productName.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/commerce/fulfillment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm(EMPTY_FORM);
      setShowCreate(false);
      await load();
    } finally { setSaving(false); }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/commerce/fulfillment/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Fulfillment Flows</h1>
            <p className="text-xs text-text-muted mt-0.5">{items.length} total · {items.filter(i => i.status === "active").length} active</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-cyan/10 border border-accent-cyan/25 text-accent-cyan text-sm font-medium hover:bg-accent-cyan/15 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Flow
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-text-muted text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-10 h-10 text-text-ghost mx-auto mb-3 opacity-40" />
            <p className="text-sm text-text-muted">No fulfillment flows yet.</p>
            <p className="text-xs text-text-ghost mt-1">Define how products are delivered after payment.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="bg-surface-2 border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-text-primary">{item.name}</p>
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", statusBadge(item.status as FulfillmentStatus))}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-text-muted">{item.productName}</span>
                      <span className="text-[10px] text-text-ghost px-2 py-0.5 bg-white/[0.04] rounded border border-white/[0.06]">
                        {PROVIDER_LABELS[item.paymentProvider as PaymentProvider] ?? item.paymentProvider}
                      </span>
                      <span className="text-[10px] text-text-ghost px-2 py-0.5 bg-white/[0.04] rounded border border-white/[0.06]">
                        {DELIVERY_LABELS[item.deliveryType as DeliveryType] ?? item.deliveryType}
                      </span>
                      {item.invoiceRequired && (
                        <span className="text-[10px] text-accent-amber px-2 py-0.5 bg-accent-amber/10 rounded border border-accent-amber/20">Invoice</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-white/[0.04] transition-colors border border-white/[0.06]"
                  >
                    {expanded === item.id ? "Collapse" : "View"}
                  </button>
                </div>
                {expanded === item.id && (
                  <div className="px-4 pb-4 space-y-3 border-t border-white/[0.04] pt-3">
                    {item.confirmationEmailTemplate && <DetailRow label="Confirmation Email" value={item.confirmationEmailTemplate} />}
                    {item.deliveryEmailTemplate && <DetailRow label="Delivery Email" value={item.deliveryEmailTemplate} />}
                    {item.followUpEmailTemplate && <DetailRow label="Follow-Up Email" value={item.followUpEmailTemplate} />}
                    {item.supportInstructions && <DetailRow label="Support Instructions" value={item.supportInstructions} />}
                    <div className="flex items-center gap-2 pt-2 flex-wrap">
                      {item.status === "draft" && (
                        <button onClick={() => updateStatus(item.id, "approved")} className="text-[10px] px-2 py-1 rounded bg-accent-green/10 text-accent-green border border-accent-green/20 hover:bg-accent-green/15 transition-colors">Approve</button>
                      )}
                      {item.status === "approved" && (
                        <button onClick={() => updateStatus(item.id, "active")} className="text-[10px] px-2 py-1 rounded bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 hover:bg-accent-cyan/15 transition-colors">Activate</button>
                      )}
                      {item.status !== "archived" && (
                        <button onClick={() => updateStatus(item.id, "archived")} className="text-[10px] px-2 py-1 rounded bg-white/[0.04] text-text-ghost border border-white/[0.06] hover:text-text-muted transition-colors ml-auto">Archive</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 bg-surface-2 border border-white/[0.08] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-text-primary">New Fulfillment Flow</h2>
              <button onClick={() => setShowCreate(false)} className="text-text-muted hover:text-text-primary transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Flow Name *">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. PLR Bundle Delivery" className="input-dark" />
              </Field>
              <Field label="Product Name *">
                <input value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} placeholder="e.g. AI Writing PLR Bundle" className="input-dark" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Payment Provider">
                  <select value={form.paymentProvider} onChange={e => setForm(f => ({ ...f, paymentProvider: e.target.value as PaymentProvider }))} className="input-dark">
                    {Object.entries(PROVIDER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Delivery Type">
                  <select value={form.deliveryType} onChange={e => setForm(f => ({ ...f, deliveryType: e.target.value as DeliveryType }))} className="input-dark">
                    {Object.entries(DELIVERY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="inv" checked={form.invoiceRequired} onChange={e => setForm(f => ({ ...f, invoiceRequired: e.target.checked }))} className="rounded" />
                <label htmlFor="inv" className="text-xs text-text-muted">Invoice required</label>
              </div>
              <Field label="Confirmation Email Template">
                <textarea value={form.confirmationEmailTemplate} onChange={e => setForm(f => ({ ...f, confirmationEmailTemplate: e.target.value }))} placeholder="Order confirmation email body…" className="input-dark min-h-[60px] resize-none" />
              </Field>
              <Field label="Delivery Email Template">
                <textarea value={form.deliveryEmailTemplate} onChange={e => setForm(f => ({ ...f, deliveryEmailTemplate: e.target.value }))} placeholder="Product delivery email with download link…" className="input-dark min-h-[60px] resize-none" />
              </Field>
              <Field label="Follow-Up Email Template">
                <textarea value={form.followUpEmailTemplate} onChange={e => setForm(f => ({ ...f, followUpEmailTemplate: e.target.value }))} placeholder="7-day follow-up email…" className="input-dark min-h-[60px] resize-none" />
              </Field>
              <Field label="Support Instructions">
                <textarea value={form.supportInstructions} onChange={e => setForm(f => ({ ...f, supportInstructions: e.target.value }))} placeholder="What to do if customer has issues…" className="input-dark min-h-[60px] resize-none" />
              </Field>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text-primary transition-colors">Cancel</button>
              <button onClick={create} disabled={saving || !form.name.trim() || !form.productName.trim()} className="px-4 py-2 rounded-lg bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/25 text-sm font-medium hover:bg-accent-cyan/20 transition-colors disabled:opacity-40">
                {saving ? "Creating…" : "Create Flow"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-text-muted font-medium">{label}</label>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-text-ghost font-medium mb-0.5">{label}</p>
      <p className="text-xs text-text-secondary whitespace-pre-wrap">{value}</p>
    </div>
  );
}
