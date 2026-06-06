"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { PIPELINE_STAGES, LEAD_STATUS_LABELS, LEAD_STATUSES } from "@/lib/productMatching";
import type { LeadStatus } from "@/lib/productMatching";
import { GitBranch, AlertCircle, Calendar, ArrowRight } from "lucide-react";

interface Product { id: string; name: string; }
interface Lead {
  id: string;
  companyName: string;
  contactName: string | null;
  status: string;
  priority: string;
  estimatedValue: number | null;
  nextAction: string | null;
  nextActionDate: string | null;
  recommendedProductId: string | null;
  recommendedProduct: Product | null;
}

const PRIORITY_COLOR: Record<string, string> = {
  low: "#10b981", medium: "#f59e0b", high: "#f97316", urgent: "#ef4444",
};

const ACTIVE_STAGES = PIPELINE_STAGES.filter((s) => s.id !== "lost" && s.id !== "archived");

function isOverdue(date: string | null): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

function fmtDate(date: string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function PipelineView() {
  const { showToast } = useAppStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetch("/api/leads")
      .then((r) => r.json())
      .then((data) => { setLeads(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function updateStatus(leadId: string, status: string) {
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const updated = await res.json();
    setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)));
    showToast(`Moved to ${LEAD_STATUS_LABELS[status as LeadStatus] ?? status}`);
  }

  const stages = showArchived ? PIPELINE_STAGES : ACTIVE_STAGES;
  const activeLeads = leads.filter((l) => l.status !== "archived" && l.status !== "lost");
  const lostLeads = leads.filter((l) => l.status === "lost");
  const wonLeads = leads.filter((l) => l.status === "won");
  const totalValue = activeLeads.reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0);
  const overdueCount = leads.filter((l) => isOverdue(l.nextActionDate) && l.status !== "won" && l.status !== "lost" && l.status !== "archived").length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-accent-purple" />
            Pipeline
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            {activeLeads.length} active · {wonLeads.length} won · {lostLeads.length} lost
            {totalValue > 0 && <span className="text-accent-green ml-2">€{totalValue.toLocaleString()} pipeline</span>}
            {overdueCount > 0 && <span className="text-accent-red ml-2">{overdueCount} overdue</span>}
          </p>
        </div>
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="text-xs text-text-muted hover:text-text-secondary px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.12] transition-all"
        >
          {showArchived ? "Hide archived" : "Show archived"}
        </button>
      </div>

      {/* Pipeline stages */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">Loading pipeline...</div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 space-y-2">
            {stages.map((stage) => {
              const stageLeads = leads.filter((l) => l.status === stage.id);
              return (
                <div key={stage.id} className="border border-white/[0.06] rounded-xl overflow-hidden">
                  {/* Stage header */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-surface-2 border-b border-white/[0.04]">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage.color }} />
                    <span className="text-xs font-semibold text-text-secondary">{stage.label}</span>
                    <span className="text-[10px] text-text-ghost font-mono">{stageLeads.length}</span>
                    {stageLeads.length > 0 && (
                      <span className="ml-auto text-[10px] text-text-muted">
                        €{stageLeads.reduce((s, l) => s + (l.estimatedValue ?? 0), 0).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Cards */}
                  {stageLeads.length > 0 ? (
                    <div className="px-3 py-2 space-y-1.5">
                      {stageLeads.map((lead) => {
                        const overdue = isOverdue(lead.nextActionDate) && lead.status !== "won" && lead.status !== "lost";
                        return (
                          <div
                            key={lead.id}
                            className={cn(
                              "p-3 rounded-xl border transition-all",
                              overdue ? "border-accent-red/25 bg-accent-red/5" : "border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03]"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-semibold text-text-primary truncate">{lead.companyName}</span>
                                  {overdue && <AlertCircle className="w-3 h-3 text-accent-red flex-shrink-0" />}
                                </div>
                                {lead.recommendedProduct && (
                                  <span className="text-[10px] text-text-muted mt-0.5 block truncate">{lead.recommendedProduct.name}</span>
                                )}
                                {lead.nextAction && (
                                  <div className={cn("flex items-center gap-1 mt-1.5 text-[10px]", overdue ? "text-accent-red" : "text-text-muted")}>
                                    <ArrowRight className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{lead.nextAction}</span>
                                    {lead.nextActionDate && (
                                      <span className="flex items-center gap-0.5 flex-shrink-0">
                                        <Calendar className="w-2.5 h-2.5" />
                                        {fmtDate(lead.nextActionDate)}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                {lead.estimatedValue && (
                                  <span className="text-[10px] text-accent-green font-medium">€{lead.estimatedValue.toLocaleString()}</span>
                                )}
                                <span className="text-[10px] px-1.5 py-0.5 rounded capitalize font-medium" style={{ color: PRIORITY_COLOR[lead.priority], background: `${PRIORITY_COLOR[lead.priority]}15` }}>
                                  {lead.priority}
                                </span>
                                <select
                                  value={lead.status}
                                  onChange={(e) => updateStatus(lead.id, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] bg-surface-3 border border-white/[0.08] rounded px-1.5 py-1 text-text-muted focus:outline-none focus:border-accent-purple/50 cursor-pointer"
                                >
                                  {LEAD_STATUSES.map((s) => (
                                    <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-[10px] text-text-ghost">No leads in this stage</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
