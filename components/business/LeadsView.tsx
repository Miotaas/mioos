"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { matchProduct, LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/productMatching";
import type { LeadStatus } from "@/lib/productMatching";
import {
  Users, Plus, Pencil, Trash2, Calendar, AlertCircle, Search,
  ChevronDown, Sparkles, X, CheckCircle2, ArrowRight,
} from "lucide-react";

interface Product { id: string; name: string; }
interface Lead {
  id: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  linkedin: string | null;
  industry: string | null;
  companySize: string | null;
  painPoint: string | null;
  recommendedProductId: string | null;
  recommendedProduct: Product | null;
  leadSource: string | null;
  status: string;
  priority: string;
  estimatedValue: number | null;
  notes: string | null;
  nextAction: string | null;
  nextActionDate: string | null;
  demoAngle: string | null;
  discoveryQuestions: string | null;
  likelyObjections: string | null;
  pilotStructure: string | null;
  pricingSuggestion: string | null;
  demoNextSteps: string | null;
  proposalStatus: string | null;
  proposalAmount: number | null;
  monthlyPrice: number | null;
  setupFee: number | null;
  pilotStatus: string | null;
  pilotStartDate: string | null;
  pilotEndDate: string | null;
  pilotSuccessCriteria: string | null;
  pilotNotes: string | null;
  decisionDeadline: string | null;
}

interface OnboardingItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt: string | null;
  order: number;
}

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const LEAD_SOURCES = ["manual", "referral", "linkedin", "website", "event", "cold_outreach", "partner"];
const PROPOSAL_STATUSES = ["not_started", "draft", "sent", "negotiating", "accepted", "rejected"];
const PILOT_STATUSES = ["not_started", "offered", "active", "completed", "converted", "failed"];

const PRIORITY_COLOR: Record<string, string> = {
  low: "#10b981", medium: "#f59e0b", high: "#f97316", urgent: "#ef4444",
};

const STATUS_COLOR: Record<string, string> = {
  new: "#6366f1", researched: "#8b5cf6", contacted: "#3b82f6", replied: "#06b6d4",
  discovery_scheduled: "#f59e0b", demo_scheduled: "#f97316", demo_done: "#ec4899",
  proposal_sent: "#a855f7", pilot_offered: "#10b981", pilot_active: "#22c55e",
  won: "#10b981", lost: "#ef4444", archived: "#475569",
};

function isOverdue(date: string | null): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

function fmtDate(date: string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function fmtCurrency(val: number | null): string {
  if (!val) return "";
  return `€${val.toLocaleString()}`;
}

interface FormState {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  linkedin: string;
  industry: string;
  companySize: string;
  painPoint: string;
  recommendedProductId: string;
  leadSource: string;
  status: string;
  priority: string;
  estimatedValue: string;
  notes: string;
  nextAction: string;
  nextActionDate: string;
  proposalStatus: string;
  proposalAmount: string;
  monthlyPrice: string;
  setupFee: string;
  pilotStatus: string;
  pilotStartDate: string;
  pilotEndDate: string;
  pilotSuccessCriteria: string;
  pilotNotes: string;
  decisionDeadline: string;
  demoAngle: string;
  discoveryQuestions: string;
  likelyObjections: string;
  pilotStructure: string;
  pricingSuggestion: string;
}

const DEFAULT_FORM: FormState = {
  companyName: "", contactName: "", email: "", phone: "", website: "", linkedin: "",
  industry: "", companySize: "", painPoint: "", recommendedProductId: "", leadSource: "manual",
  status: "new", priority: "medium", estimatedValue: "", notes: "", nextAction: "",
  nextActionDate: "", proposalStatus: "not_started", proposalAmount: "", monthlyPrice: "",
  setupFee: "", pilotStatus: "not_started", pilotStartDate: "", pilotEndDate: "",
  pilotSuccessCriteria: "", pilotNotes: "", decisionDeadline: "", demoAngle: "",
  discoveryQuestions: "", likelyObjections: "", pilotStructure: "", pricingSuggestion: "",
};

const inputCls = "w-full text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50 transition-colors";

export function LeadsView() {
  const { showToast } = useAppStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | string>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | string>("all");
  const [productFilter, setProductFilter] = useState<"all" | string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [matchSuggestion, setMatchSuggestion] = useState<ReturnType<typeof matchProduct>>(null);
  const [onboardingItems, setOnboardingItems] = useState<OnboardingItem[]>([]);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [activeTab, setActiveTab] = useState<"info" | "demo" | "proposal" | "onboarding">("info");

  useEffect(() => {
    Promise.all([
      fetch("/api/leads").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ]).then(([l, p]) => {
      setLeads(Array.isArray(l) ? l : []);
      setProducts(Array.isArray(p) ? p : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selected && (selected.status === "pilot_active" || selected.status === "won")) {
      setOnboardingLoading(true);
      fetch(`/api/onboarding/${selected.id}`)
        .then((r) => r.json())
        .then((data) => { setOnboardingItems(Array.isArray(data) ? data : []); setOnboardingLoading(false); })
        .catch(() => setOnboardingLoading(false));
    } else {
      setOnboardingItems([]);
    }
  }, [selected]);

  function openCreate() {
    setEditingLead(null);
    setForm(DEFAULT_FORM);
    setMatchSuggestion(null);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(lead: Lead, e?: React.MouseEvent) {
    e?.stopPropagation();
    setEditingLead(lead);
    setForm({
      companyName: lead.companyName,
      contactName: lead.contactName ?? "",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      website: lead.website ?? "",
      linkedin: lead.linkedin ?? "",
      industry: lead.industry ?? "",
      companySize: lead.companySize ?? "",
      painPoint: lead.painPoint ?? "",
      recommendedProductId: lead.recommendedProductId ?? "",
      leadSource: lead.leadSource ?? "manual",
      status: lead.status,
      priority: lead.priority,
      estimatedValue: lead.estimatedValue?.toString() ?? "",
      notes: lead.notes ?? "",
      nextAction: lead.nextAction ?? "",
      nextActionDate: lead.nextActionDate ? lead.nextActionDate.split("T")[0] : "",
      proposalStatus: lead.proposalStatus ?? "not_started",
      proposalAmount: lead.proposalAmount?.toString() ?? "",
      monthlyPrice: lead.monthlyPrice?.toString() ?? "",
      setupFee: lead.setupFee?.toString() ?? "",
      pilotStatus: lead.pilotStatus ?? "not_started",
      pilotStartDate: lead.pilotStartDate ? lead.pilotStartDate.split("T")[0] : "",
      pilotEndDate: lead.pilotEndDate ? lead.pilotEndDate.split("T")[0] : "",
      pilotSuccessCriteria: lead.pilotSuccessCriteria ?? "",
      pilotNotes: lead.pilotNotes ?? "",
      decisionDeadline: lead.decisionDeadline ? lead.decisionDeadline.split("T")[0] : "",
      demoAngle: lead.demoAngle ?? "",
      discoveryQuestions: lead.discoveryQuestions ?? "",
      likelyObjections: lead.likelyObjections ?? "",
      pilotStructure: lead.pilotStructure ?? "",
      pricingSuggestion: lead.pricingSuggestion ?? "",
    });
    setMatchSuggestion(null);
    setFormError("");
    setModalOpen(true);
  }

  function suggestProduct() {
    const result = matchProduct(form.painPoint);
    setMatchSuggestion(result);
    if (result) {
      const product = products.find((p) => p.name === result.productName);
      setForm((f) => ({
        ...f,
        recommendedProductId: product?.id ?? f.recommendedProductId,
        demoAngle: result.demoAngle,
        discoveryQuestions: result.discoveryQuestions.join("\n"),
        likelyObjections: result.likelyObjections.join("\n"),
        pilotStructure: result.pilotStructure,
        pricingSuggestion: result.pricingSuggestion,
      }));
    }
  }

  async function save() {
    if (!form.companyName.trim()) { setFormError("Company name is required."); return; }
    setSaving(true);
    setFormError("");
    try {
      const body = { ...form };
      const method = editingLead ? "PATCH" : "POST";
      const url = editingLead ? `/api/leads/${editingLead.id}` : "/api/leads";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      if (editingLead) {
        setLeads((prev) => prev.map((l) => (l.id === editingLead.id ? saved : l)));
        if (selected?.id === editingLead.id) setSelected(saved);
        showToast("Lead updated");
      } else {
        setLeads((prev) => [saved, ...prev]);
        setSelected(saved);
        showToast("Lead created");
      }
      setModalOpen(false);
    } catch {
      setFormError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLead(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
    setLeads((prev) => prev.filter((l) => l.id !== id));
    if (selected?.id === id) setSelected(null);
    showToast("Lead deleted");
  }

  async function updateStatus(lead: Lead, status: string) {
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const updated = await res.json();
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)));
    if (selected?.id === lead.id) setSelected(updated);
  }

  async function toggleOnboardingItem(item: OnboardingItem) {
    const res = await fetch(`/api/onboarding/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !item.completed }),
    });
    const updated = await res.json();
    setOnboardingItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
  }

  async function addOnboardingItem() {
    if (!newItemText.trim() || !selected) return;
    const res = await fetch(`/api/onboarding/${selected.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newItemText.trim() }),
    });
    const item = await res.json();
    setOnboardingItems((prev) => [...prev, item]);
    setNewItemText("");
  }

  async function deleteOnboardingItem(id: string) {
    await fetch(`/api/onboarding/items/${id}`, { method: "DELETE" });
    setOnboardingItems((prev) => prev.filter((i) => i.id !== id));
  }

  const filtered = leads.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (priorityFilter !== "all" && l.priority !== priorityFilter) return false;
    if (productFilter !== "all" && l.recommendedProductId !== productFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!l.companyName.toLowerCase().includes(q) && !(l.contactName ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const overdue = leads.filter((l) => isOverdue(l.nextActionDate) && l.status !== "won" && l.status !== "lost" && l.status !== "archived");
  const onboardingProgress = onboardingItems.length > 0
    ? Math.round((onboardingItems.filter((i) => i.completed).length / onboardingItems.length) * 100)
    : 0;

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left: lead list */}
      <div className="w-80 flex-shrink-0 border-r border-white/[0.06] flex flex-col">
        <div className="px-4 py-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Users className="w-4 h-4 text-accent-blue" /> Leads
            </h1>
            <Button variant="primary" size="sm" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>

          {overdue.length > 0 && (
            <div className="flex items-center gap-2 text-[10px] text-accent-red bg-accent-red/10 border border-accent-red/20 rounded-lg px-2.5 py-1.5 mb-3">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              {overdue.length} overdue follow-up{overdue.length > 1 ? "s" : ""}
            </div>
          )}

          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="w-full text-xs bg-surface-3 border border-white/[0.08] rounded-lg pl-8 pr-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50"
            />
          </div>

          <div className="flex gap-1.5">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="flex-1 text-[10px] bg-surface-3 border border-white/[0.08] rounded-lg px-2 py-1.5 text-text-muted focus:outline-none">
              <option value="all">All statuses</option>
              {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
            </select>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="flex-1 text-[10px] bg-surface-3 border border-white/[0.08] rounded-lg px-2 py-1.5 text-text-muted focus:outline-none">
              <option value="all">All priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {loading && <p className="text-xs text-text-muted px-2 py-4">Loading...</p>}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-8">
              <p className="text-xs text-text-muted">No leads found</p>
              <button onClick={openCreate} className="text-xs text-accent-purple mt-2 hover:underline">Add first lead</button>
            </div>
          )}
          {filtered.map((lead) => {
            const overdueLead = isOverdue(lead.nextActionDate) && lead.status !== "won" && lead.status !== "lost" && lead.status !== "archived";
            const statusColor = STATUS_COLOR[lead.status] ?? "#6366f1";
            return (
              <div
                key={lead.id}
                onClick={() => { setSelected(lead); setActiveTab("info"); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(lead); setActiveTab("info"); } }}
                role="button"
                tabIndex={0}
                className={cn(
                  "w-full text-left px-3 py-3 rounded-xl border transition-all group cursor-pointer",
                  selected?.id === lead.id
                    ? "border-accent-purple/25 bg-accent-purple/10"
                    : overdueLead
                    ? "border-accent-red/20 bg-accent-red/5 hover:border-accent-red/30"
                    : "border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.02]"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-text-primary leading-snug truncate">{lead.companyName}</p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
                    <button onClick={(e) => openEdit(lead, e)} className="p-1 rounded hover:bg-white/[0.08] text-text-muted hover:text-text-primary">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={(e) => deleteLead(lead.id, e)} className="p-1 rounded hover:bg-accent-red/10 text-text-muted hover:text-accent-red">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {lead.contactName && <p className="text-[10px] text-text-muted mt-0.5">{lead.contactName}</p>}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ color: statusColor, background: `${statusColor}15` }}>
                    {LEAD_STATUS_LABELS[lead.status as LeadStatus] ?? lead.status}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded capitalize font-medium" style={{ color: PRIORITY_COLOR[lead.priority], background: `${PRIORITY_COLOR[lead.priority]}15` }}>
                    {lead.priority}
                  </span>
                  {lead.estimatedValue && (
                    <span className="text-[10px] text-text-muted">€{lead.estimatedValue.toLocaleString()}</span>
                  )}
                </div>
                {lead.nextAction && (
                  <div className={cn("flex items-center gap-1 mt-1.5 text-[10px]", overdueLead ? "text-accent-red" : "text-text-muted")}>
                    <ArrowRight className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{lead.nextAction}</span>
                    {lead.nextActionDate && <span className="flex-shrink-0">{fmtDate(lead.nextActionDate)}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: lead detail */}
      {selected ? (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Detail header */}
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-text-primary">{selected.companyName}</h2>
              {selected.contactName && <p className="text-xs text-text-muted mt-0.5">{selected.contactName}</p>}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <select
                  value={selected.status}
                  onChange={(e) => updateStatus(selected, e.target.value)}
                  className="text-[10px] bg-surface-3 border border-white/[0.08] rounded-lg px-2 py-1 text-text-secondary focus:outline-none focus:border-accent-purple/50"
                >
                  {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
                </select>
                <span className="text-[10px] px-2 py-1 rounded capitalize font-medium" style={{ color: PRIORITY_COLOR[selected.priority], background: `${PRIORITY_COLOR[selected.priority]}15` }}>
                  {selected.priority}
                </span>
                {selected.estimatedValue && (
                  <span className="text-[10px] text-accent-green font-medium">€{selected.estimatedValue.toLocaleString()}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => openEdit(selected)}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] px-6">
            {(["info", "demo", "proposal", "onboarding"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "text-xs px-3 py-2.5 capitalize transition-all border-b-2 -mb-px",
                  activeTab === tab
                    ? "border-accent-purple text-accent-purple"
                    : "border-transparent text-text-muted hover:text-text-secondary"
                )}
              >
                {tab === "onboarding" && (selected.status !== "pilot_active" && selected.status !== "won") ? null : tab}
                {tab !== "onboarding" && tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {activeTab === "info" && (
              <div className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-2 gap-3">
                  <DetailField label="Email" value={selected.email} link={selected.email ? `mailto:${selected.email}` : undefined} />
                  <DetailField label="Phone" value={selected.phone} />
                  <DetailField label="Website" value={selected.website} link={selected.website ?? undefined} />
                  <DetailField label="LinkedIn" value={selected.linkedin} link={selected.linkedin ?? undefined} />
                  <DetailField label="Industry" value={selected.industry} />
                  <DetailField label="Company Size" value={selected.companySize} />
                  <DetailField label="Lead Source" value={selected.leadSource} />
                  <DetailField label="Recommended Product" value={selected.recommendedProduct?.name} />
                </div>
                {selected.painPoint && (
                  <div className="bg-surface-2 border border-white/[0.06] rounded-xl p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-2">Pain Point</p>
                    <p className="text-sm text-text-secondary">{selected.painPoint}</p>
                  </div>
                )}
                {selected.nextAction && (
                  <div className={cn("border rounded-xl p-4", isOverdue(selected.nextActionDate) ? "bg-accent-red/5 border-accent-red/20" : "bg-surface-2 border-white/[0.06]")}>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-2">Next Action</p>
                    <p className="text-sm text-text-secondary">{selected.nextAction}</p>
                    {selected.nextActionDate && (
                      <p className={cn("text-xs mt-1 flex items-center gap-1", isOverdue(selected.nextActionDate) ? "text-accent-red" : "text-text-muted")}>
                        <Calendar className="w-3 h-3" /> {fmtDate(selected.nextActionDate)}
                        {isOverdue(selected.nextActionDate) && " — OVERDUE"}
                      </p>
                    )}
                  </div>
                )}
                {selected.notes && (
                  <div className="bg-surface-2 border border-white/[0.06] rounded-xl p-4">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-2">Notes</p>
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">{selected.notes}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "demo" && (
              <div className="space-y-4 max-w-2xl">
                {!selected.demoAngle && (
                  <div className="bg-surface-2 border border-white/[0.06] rounded-xl p-4 text-center">
                    <Sparkles className="w-6 h-6 mx-auto mb-2 text-accent-purple" />
                    <p className="text-sm text-text-secondary mb-3">No demo prep yet. Edit the lead and use "Suggest Product" to generate it from the pain point.</p>
                  </div>
                )}
                {selected.demoAngle && <DemoSection label="Demo Angle" content={selected.demoAngle} />}
                {selected.discoveryQuestions && <DemoSection label="Discovery Questions" content={selected.discoveryQuestions} asList />}
                {selected.likelyObjections && <DemoSection label="Likely Objections" content={selected.likelyObjections} asList />}
                {selected.pilotStructure && <DemoSection label="Pilot Structure" content={selected.pilotStructure} />}
                {selected.pricingSuggestion && <DemoSection label="Pricing Suggestion" content={selected.pricingSuggestion} />}
              </div>
            )}

            {activeTab === "proposal" && (
              <div className="space-y-4 max-w-xl">
                <div className="grid grid-cols-2 gap-3">
                  <DetailField label="Proposal Status" value={selected.proposalStatus?.replace("_", " ")} />
                  <DetailField label="Proposal Amount" value={fmtCurrency(selected.proposalAmount)} />
                  <DetailField label="Monthly Price" value={fmtCurrency(selected.monthlyPrice)} />
                  <DetailField label="Setup Fee" value={fmtCurrency(selected.setupFee)} />
                  <DetailField label="Pilot Status" value={selected.pilotStatus?.replace("_", " ")} />
                  <DetailField label="Decision Deadline" value={fmtDate(selected.decisionDeadline)} />
                  <DetailField label="Pilot Start" value={fmtDate(selected.pilotStartDate)} />
                  <DetailField label="Pilot End" value={fmtDate(selected.pilotEndDate)} />
                </div>
                {selected.pilotSuccessCriteria && <DemoSection label="Pilot Success Criteria" content={selected.pilotSuccessCriteria} />}
                {selected.pilotNotes && <DemoSection label="Pilot Notes" content={selected.pilotNotes} />}
                <Button variant="ghost" size="sm" onClick={() => openEdit(selected)}>
                  <Pencil className="w-3.5 h-3.5" /> Edit Proposal / Pilot details
                </Button>
              </div>
            )}

            {activeTab === "onboarding" && (selected.status === "pilot_active" || selected.status === "won") && (
              <div className="max-w-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Onboarding Checklist</p>
                    <p className="text-xs text-text-muted mt-0.5">{onboardingProgress}% complete</p>
                  </div>
                  <div className="w-24 h-2 bg-surface-3 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-green rounded-full transition-all" style={{ width: `${onboardingProgress}%` }} />
                  </div>
                </div>

                {onboardingLoading && <p className="text-xs text-text-muted">Loading checklist...</p>}

                <div className="space-y-1.5">
                  {onboardingItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-surface-2 border border-white/[0.06] rounded-xl group">
                      <button onClick={() => toggleOnboardingItem(item)}>
                        {item.completed
                          ? <CheckCircle2 className="w-4 h-4 text-accent-green flex-shrink-0" />
                          : <div className="w-4 h-4 rounded-full border-2 border-text-ghost hover:border-accent-purple transition-colors flex-shrink-0" />
                        }
                      </button>
                      <span className={cn("flex-1 text-sm", item.completed ? "text-text-muted line-through" : "text-text-primary")}>{item.text}</span>
                      <button onClick={() => deleteOnboardingItem(item.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent-red/10 text-text-ghost hover:text-accent-red transition-all">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addOnboardingItem()}
                    placeholder="Add checklist item..."
                    className="flex-1 text-sm bg-surface-3 border border-white/[0.08] rounded-lg px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50"
                  />
                  <Button variant="ghost" size="sm" onClick={addOnboardingItem}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        !loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-text-muted">
              <Users className="w-8 h-8 mx-auto mb-3 text-text-ghost" />
              <p className="text-sm">Select a lead to view details</p>
              <button onClick={openCreate} className="text-xs text-accent-purple mt-2 hover:underline">or create a new lead</button>
            </div>
          </div>
        )
      )}

      {/* Lead Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingLead ? `Edit — ${editingLead.companyName}` : "New Lead"}>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company Name *">
              <input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} placeholder="Acme BV" className={inputCls} autoFocus />
            </Field>
            <Field label="Contact Name">
              <input value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} placeholder="Jan de Vries" className={inputCls} />
            </Field>
            <Field label="Email">
              <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="jan@acme.nl" className={inputCls} type="email" />
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+31 6 12345678" className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Industry">
              <input value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} placeholder="Legal, Finance, HR..." className={inputCls} />
            </Field>
            <Field label="Company Size">
              <input value={form.companySize} onChange={(e) => setForm((f) => ({ ...f, companySize: e.target.value }))} placeholder="10–50 people" className={inputCls} />
            </Field>
          </div>

          <Field label="Pain Point">
            <div className="flex gap-2">
              <textarea value={form.painPoint} onChange={(e) => setForm((f) => ({ ...f, painPoint: e.target.value }))} rows={2} placeholder="What problem does this lead have?" className={`${inputCls} resize-none flex-1`} />
              <button onClick={suggestProduct} title="Suggest matching product" className="px-3 py-2 rounded-lg bg-accent-purple/15 border border-accent-purple/25 text-accent-purple hover:bg-accent-purple/25 transition-all flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </Field>

          {matchSuggestion && (
            <div className="bg-accent-purple/10 border border-accent-purple/20 rounded-xl p-3 text-xs text-text-secondary">
              <p className="font-semibold text-accent-purple mb-1">Suggested: {matchSuggestion.productName}</p>
              <p>{matchSuggestion.explanation}</p>
              <p className="text-text-muted mt-1">Demo prep fields have been pre-filled.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Recommended Product">
              <select value={form.recommendedProductId} onChange={(e) => setForm((f) => ({ ...f, recommendedProductId: e.target.value }))} className={inputCls}>
                <option value="">— None —</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Lead Source">
              <select value={form.leadSource} onChange={(e) => setForm((f) => ({ ...f, leadSource: e.target.value }))} className={inputCls}>
                {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
                {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className={inputCls}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Estimated Value (€)">
              <input value={form.estimatedValue} onChange={(e) => setForm((f) => ({ ...f, estimatedValue: e.target.value }))} placeholder="5000" className={inputCls} type="number" />
            </Field>
            <Field label="Next Action Date">
              <input value={form.nextActionDate} onChange={(e) => setForm((f) => ({ ...f, nextActionDate: e.target.value }))} className={inputCls} type="date" />
            </Field>
          </div>

          <Field label="Next Action">
            <input value={form.nextAction} onChange={(e) => setForm((f) => ({ ...f, nextAction: e.target.value }))} placeholder="Send follow-up email" className={inputCls} />
          </Field>

          <Field label="Notes">
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Internal notes..." className={`${inputCls} resize-none`} />
          </Field>

          <details className="border border-white/[0.06] rounded-xl overflow-hidden">
            <summary className="px-3 py-2.5 text-xs text-text-muted cursor-pointer hover:text-text-secondary flex items-center gap-2">
              <ChevronDown className="w-3 h-3" /> Demo Prep
            </summary>
            <div className="px-3 pb-3 space-y-3 border-t border-white/[0.06] pt-3">
              <Field label="Demo Angle">
                <textarea value={form.demoAngle} onChange={(e) => setForm((f) => ({ ...f, demoAngle: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
              </Field>
              <Field label="Discovery Questions (one per line)">
                <textarea value={form.discoveryQuestions} onChange={(e) => setForm((f) => ({ ...f, discoveryQuestions: e.target.value }))} rows={3} className={`${inputCls} resize-none`} />
              </Field>
              <Field label="Likely Objections (one per line)">
                <textarea value={form.likelyObjections} onChange={(e) => setForm((f) => ({ ...f, likelyObjections: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
              </Field>
              <Field label="Pilot Structure">
                <textarea value={form.pilotStructure} onChange={(e) => setForm((f) => ({ ...f, pilotStructure: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
              </Field>
              <Field label="Pricing Suggestion">
                <input value={form.pricingSuggestion} onChange={(e) => setForm((f) => ({ ...f, pricingSuggestion: e.target.value }))} className={inputCls} />
              </Field>
            </div>
          </details>

          <details className="border border-white/[0.06] rounded-xl overflow-hidden">
            <summary className="px-3 py-2.5 text-xs text-text-muted cursor-pointer hover:text-text-secondary flex items-center gap-2">
              <ChevronDown className="w-3 h-3" /> Proposal & Pilot
            </summary>
            <div className="px-3 pb-3 space-y-3 border-t border-white/[0.06] pt-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Proposal Status">
                  <select value={form.proposalStatus} onChange={(e) => setForm((f) => ({ ...f, proposalStatus: e.target.value }))} className={inputCls}>
                    {PROPOSAL_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </Field>
                <Field label="Proposal Amount (€)">
                  <input value={form.proposalAmount} onChange={(e) => setForm((f) => ({ ...f, proposalAmount: e.target.value }))} type="number" className={inputCls} />
                </Field>
                <Field label="Monthly Price (€)">
                  <input value={form.monthlyPrice} onChange={(e) => setForm((f) => ({ ...f, monthlyPrice: e.target.value }))} type="number" className={inputCls} />
                </Field>
                <Field label="Setup Fee (€)">
                  <input value={form.setupFee} onChange={(e) => setForm((f) => ({ ...f, setupFee: e.target.value }))} type="number" className={inputCls} />
                </Field>
                <Field label="Pilot Status">
                  <select value={form.pilotStatus} onChange={(e) => setForm((f) => ({ ...f, pilotStatus: e.target.value }))} className={inputCls}>
                    {PILOT_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </Field>
                <Field label="Decision Deadline">
                  <input value={form.decisionDeadline} onChange={(e) => setForm((f) => ({ ...f, decisionDeadline: e.target.value }))} type="date" className={inputCls} />
                </Field>
                <Field label="Pilot Start">
                  <input value={form.pilotStartDate} onChange={(e) => setForm((f) => ({ ...f, pilotStartDate: e.target.value }))} type="date" className={inputCls} />
                </Field>
                <Field label="Pilot End">
                  <input value={form.pilotEndDate} onChange={(e) => setForm((f) => ({ ...f, pilotEndDate: e.target.value }))} type="date" className={inputCls} />
                </Field>
              </div>
              <Field label="Success Criteria">
                <textarea value={form.pilotSuccessCriteria} onChange={(e) => setForm((f) => ({ ...f, pilotSuccessCriteria: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
              </Field>
              <Field label="Pilot Notes">
                <textarea value={form.pilotNotes} onChange={(e) => setForm((f) => ({ ...f, pilotNotes: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
              </Field>
            </div>
          </details>

          {formError && <p className="text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="flex gap-3 pt-1">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button variant="primary" onClick={save} disabled={saving} className="flex-1">{saving ? "Saving..." : editingLead ? "Save" : "Create Lead"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DemoSection({ label, content, asList }: { label: string; content: string; asList?: boolean }) {
  const lines = content.split("\n").filter(Boolean);
  return (
    <div className="bg-surface-2 border border-white/[0.06] rounded-xl p-4">
      <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-2">{label}</p>
      {asList ? (
        <ul className="space-y-1.5">
          {lines.map((l, i) => <li key={i} className="flex items-start gap-2 text-sm text-text-secondary"><span className="text-accent-purple mt-0.5">•</span>{l}</li>)}
        </ul>
      ) : (
        <p className="text-sm text-text-secondary whitespace-pre-wrap">{content}</p>
      )}
    </div>
  );
}

function DetailField({ label, value, link }: { label: string; value: string | null | undefined; link?: string }) {
  return (
    <div className="bg-surface-2 border border-white/[0.06] rounded-xl p-3">
      <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-1">{label}</p>
      {link
        ? <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-blue hover:underline truncate block">{value || "—"}</a>
        : <p className="text-xs text-text-secondary capitalize">{value || "—"}</p>
      }
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
