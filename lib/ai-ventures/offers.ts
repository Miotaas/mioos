/**
 * AI Ventures — revenue offers (Sprint 1).
 * Offers within the AI Ventures business unit, split into two revenue tracks:
 *   "website"    → Website Revenue Team
 *   "automation" → Automation Revenue Team
 * Deal-value ranges: setup €750–€7,500, monthly €0–€1,500.
 */
export type RevenueTrack = "website" | "automation";

export interface Offer {
  id: string;
  name: string;
  track: RevenueTrack;
  description: string;
  setupMin: number;
  setupMax: number;
  monthlyMin: number;
  monthlyMax: number;
  triggers: string[];
}

export const OFFERS: Offer[] = [
  { id: "ai-website-refresh",    name: "AI Website Refresh",    track: "website",    description: "Modern, conversion-focused website/webshop with AI-assisted build (+ optional maintenance plan).", setupMin: 750,  setupMax: 4000, monthlyMin: 0,   monthlyMax: 300,  triggers: ["outdated design", "weak cta", "no lead capture", "poor navigation", "low websitescore", "no contact form", "webshop", "maintenance"] },
  { id: "ai-inbox-assistant",    name: "AI Inbox Assistant (Mail Co-Pilot)", track: "automation", description: "Email triage + AI-drafted replies (recurring).", setupMin: 750,  setupMax: 3000, monthlyMin: 99,  monthlyMax: 1500, triggers: ["high inquiry volume", "slow email", "many contact forms", "support load", "lead response"] },
  { id: "ai-proposal-assistant", name: "AI Proposal Assistant", track: "automation", description: "Automated quotation/proposal generation (recurring).", setupMin: 1500, setupMax: 5000, monthlyMin: 99,  monthlyMax: 1000, triggers: ["manual quotations", "manual proposals", "quoting", "estimates", "tenders"] },
  { id: "ai-dispatch-assistant", name: "AI Dispatch Assistant", track: "automation", description: "AI dispatch/route planning for transport & logistics.", setupMin: 2500, setupMax: 7500, monthlyMin: 250, monthlyMax: 1500, triggers: ["transport", "logistics", "fleet", "dispatch", "delivery", "routing"] },
  { id: "ai-warehouse-assistant",name: "AI Warehouse Assistant",track: "automation", description: "AI inventory/warehouse operations support.", setupMin: 2500, setupMax: 7500, monthlyMin: 250, monthlyMax: 1500, triggers: ["warehouse", "inventory", "wholesale", "stock", "fulfillment"] },
  { id: "custom-ai-automation",  name: "Custom AI Automation",  track: "automation", description: "Bespoke AI automation for a specific repetitive workflow.", setupMin: 1500, setupMax: 7500, monthlyMin: 0,   monthlyMax: 1500, triggers: ["manual process", "repetitive", "automation", "data entry", "workflow"] },
  { id: "aion-deployment",       name: "AION Deployment",       track: "automation", description: "Deploy AION gateway/control plane for AI-heavy teams.", setupMin: 2500, setupMax: 7500, monthlyMin: 250, monthlyMax: 1500, triggers: ["multiple ai providers", "ai platform", "model routing", "ai cost", "ai gateway"] },
];

export function getOffer(id: string): Offer | undefined {
  return OFFERS.find((o) => o.id === id);
}

export function trackForOffer(id: string): RevenueTrack {
  return getOffer(id)?.track ?? "automation";
}

/** Rule-based offer match from industry + pain-point signals. Returns the best offer id. */
export function matchOffer(opts: { industry?: string | null; painPoints?: string[]; websiteScore?: number | null }): string {
  const hay = [(opts.industry ?? "").toLowerCase(), ...(opts.painPoints ?? []).map((p) => p.toLowerCase())].join(" ");
  if (/transport|logistic|fleet|courier|delivery/.test(hay)) return "ai-dispatch-assistant";
  if (/warehouse|wholesale|inventory|stock|fulfil/.test(hay)) return "ai-warehouse-assistant";
  for (const offer of OFFERS) {
    if (offer.id === "custom-ai-automation") continue;
    if (offer.triggers.some((t) => hay.includes(t))) return offer.id;
  }
  if (typeof opts.websiteScore === "number" && opts.websiteScore <= 5) return "ai-website-refresh";
  return "custom-ai-automation";
}

/** Estimate setup/monthly value within the offer band, scaled by complexity (0..1). */
export function estimateDealValue(offerId: string, complexity = 0.5): { setup: number; monthly: number } {
  const o = getOffer(offerId);
  if (!o) return { setup: 1500, monthly: 0 };
  const c = Math.max(0, Math.min(1, complexity));
  const round = (n: number) => Math.round(n / 50) * 50;
  return { setup: round(o.setupMin + (o.setupMax - o.setupMin) * c), monthly: round(o.monthlyMin + (o.monthlyMax - o.monthlyMin) * c) };
}
