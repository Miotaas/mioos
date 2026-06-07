"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Connector, ConnectorProvider, ConnectorStatus } from "@/types";
import { ShieldAlert, CheckCircle2, Clock, XCircle } from "lucide-react";

const PROVIDER_ICONS: Record<ConnectorProvider, string> = {
  linkedin: "in", gmail: "G", outlook: "O", stripe: "S",
  meta_ads: "M", google_ads: "G+", shopify: "Sh", gumroad: "Gu",
  web_search: "W", browser: "Br",
};

const PROVIDER_USE_CASES: Record<ConnectorProvider, string> = {
  linkedin: "Prospect research · Outreach draft preparation",
  gmail: "Outreach drafts · Order confirmation · Delivery emails",
  outlook: "Alternative email channel · Notifications",
  stripe: "Checkout link generation · Order tracking · Invoice drafts",
  meta_ads: "Facebook/Instagram ad campaign drafts",
  google_ads: "Search & display ad campaign drafts",
  shopify: "Product listing drafts · Order data sync",
  gumroad: "Digital product publishing drafts · PLR / affiliate",
  web_search: "Market research · Competitor analysis · Prospect discovery",
  browser: "Form fill drafts · Data extraction · Scraping (rate-limited)",
};

function statusIcon(status: ConnectorStatus) {
  if (status === "configured") return <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" />;
  if (status === "disabled") return <XCircle className="w-3.5 h-3.5 text-accent-red" />;
  return <Clock className="w-3.5 h-3.5 text-text-ghost" />;
}

function statusBadge(status: ConnectorStatus) {
  const cfg: Record<ConnectorStatus, string> = {
    planned: "bg-white/[0.06] text-text-ghost border-white/[0.08]",
    configured: "bg-accent-green/10 text-accent-green border-accent-green/20",
    disabled: "bg-accent-red/10 text-accent-red border-accent-red/20",
  };
  return cfg[status];
}

const SAFETY_RULES = [
  "Agents may discover, draft, recommend, prepare, and queue for approval.",
  "Agents may NOT send outreach automatically.",
  "Agents may NOT launch ads or spend any budget.",
  "Agents may NOT create live Stripe products without approval.",
  "Agents may NOT deliver products without approval.",
  "Agents may NOT scrape aggressively or bypass platform limits.",
  "Agents may NOT resell products without verified rights.",
  "Agents may NOT issue refunds automatically.",
];

export function ConnectorsView() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await fetch("/api/commerce/connectors").then(r => r.json());
      setConnectors(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }

  async function setStatus(id: string, status: ConnectorStatus) {
    await fetch(`/api/commerce/connectors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text-primary">Connector Registry</h1>
          <p className="text-xs text-text-muted mt-0.5">External integrations — all approval-first. None are connected yet.</p>
        </div>

        {/* Safety Policy */}
        <div className="bg-surface-2 border border-accent-amber/20 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2.5 mb-3">
            <ShieldAlert className="w-4 h-4 text-accent-amber flex-shrink-0" />
            <h2 className="text-sm font-semibold text-accent-amber">Commerce Safety Policy</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {SAFETY_RULES.map((rule, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-accent-amber/60 mt-1.5 flex-shrink-0" />
                <p className="text-xs text-text-muted">{rule}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Connector grid */}
        {loading ? (
          <div className="text-center py-20 text-text-muted text-sm">Loading connectors…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {connectors.map(c => (
              <div key={c.id} className="bg-surface-2 border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-xs font-bold text-text-secondary flex-shrink-0">
                      {PROVIDER_ICONS[c.provider as ConnectorProvider] ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{c.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {statusIcon(c.status as ConnectorStatus)}
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border", statusBadge(c.status as ConnectorStatus))}>
                          {c.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  {c.requiresApproval && (
                    <span className="flex-shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded bg-accent-amber/10 text-accent-amber border border-accent-amber/20">
                      Approval required
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-ghost leading-relaxed mb-3">
                  {PROVIDER_USE_CASES[c.provider as ConnectorProvider]}
                </p>
                {c.notes && (
                  <p className="text-[11px] text-text-ghost leading-relaxed mb-3 italic">{c.notes}</p>
                )}
                <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.04]">
                  <p className="text-[10px] text-text-ghost flex-1">Future phase — not connected</p>
                  {c.status === "planned" && (
                    <button onClick={() => setStatus(c.id, "disabled")} className="text-[10px] px-2 py-1 rounded bg-white/[0.04] text-text-ghost border border-white/[0.06] hover:text-text-muted transition-colors">Disable</button>
                  )}
                  {c.status === "disabled" && (
                    <button onClick={() => setStatus(c.id, "planned")} className="text-[10px] px-2 py-1 rounded bg-accent-green/10 text-accent-green border border-accent-green/20 hover:bg-accent-green/15 transition-colors">Re-enable</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
