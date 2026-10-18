/**
 * Mio Solutions opportunity scope (Constitution v1 — Mio Solutions is the only
 * operational Business Unit).
 *
 * AION, Mail Co-Pilot and the AI Website Agency are the current PRIORITY
 * portfolio, not the scope boundary. Mio Solutions may autonomously discover new
 * AI, software and automation opportunities, provided each one:
 *   - is classified as one of SOLUTIONS_OPPORTUNITY_TYPES,
 *   - has a credible monetization path,
 *   - (for a new venture) is backed by external evidence whose source URL was
 *     actually retrieved by MioOS's web-search connector.
 *
 * Generic ideation, affiliate, media/content businesses, e-commerce products and
 * capital/trading opportunities never enter Mio Solutions.
 */
import { prisma } from "@/lib/db";

export const SOLUTIONS_OPPORTUNITY_TYPES = [
  "software_venture",
  "saas_product",
  "ai_product",
  "automation_service",
  "productized_service",
  "internal_tool", // only with a commercialization path
] as const;
export type SolutionsOpportunityType = (typeof SOLUTIONS_OPPORTUNITY_TYPES)[number];

export const SOLUTIONS_TYPE_LABELS: Record<SolutionsOpportunityType, string> = {
  software_venture:    "Software venture",
  saas_product:        "SaaS product",
  ai_product:          "AI product",
  automation_service:  "Automation service",
  productized_service: "Productized service",
  internal_tool:       "Internal tool with commercialization potential",
};

/** Current priority portfolio. "new" = a new Mio Solutions opportunity. */
export const PRIORITY_VENTURES = ["aion", "mail-copilot", "ai-website-agency"] as const;
export type VentureTag = (typeof PRIORITY_VENTURES)[number] | "new";

export function isSolutionsType(t: unknown): t is SolutionsOpportunityType {
  return typeof t === "string" && (SOLUTIONS_OPPORTUNITY_TYPES as readonly string[]).includes(t);
}

export function normalizeVenture(v: unknown): VentureTag {
  const s = String(v ?? "").toLowerCase().replace(/[\s_]+/g, "-");
  if (s.includes("aion")) return "aion";
  if (s.includes("mail")) return "mail-copilot";
  if (s.includes("website") || s.includes("agency")) return "ai-website-agency";
  return "new";
}

/**
 * Categories that never belong to Mio Solutions. Matched against the candidate's
 * title, description, market, customer and monetization path. Deliberately narrow:
 * automation FOR an e-commerce or media company is allowed; running one is not.
 */
const EXCLUDED_PATTERNS: Array<[RegExp, string]> = [
  [/\baffiliate\b/i,                                                         "affiliate"],
  [/drop-?ship/i,                                                             "e-commerce product"],
  [/print[- ]on[- ]demand/i,                                                  "e-commerce product"],
  [/\b(our|own|mio'?s)\s+(web)?(shop|store)\b/i,                              "e-commerce product"],
  [/\bsell(ing)?\s+(physical\s+)?products?\s+(online|on amazon|via shopify)/i, "e-commerce product"],
  [/\bamazon fba\b/i,                                                         "e-commerce product"],
  [/\bfaceless\b/i,                                                           "media business"],
  [/\b(youtube|tiktok|instagram)\s+(channel|account|page|shorts)\b/i,          "media business"],
  [/\b(ad|advertising) revenue\b/i,                                           "media business"],
  [/\bsponsorships?\b/i,                                                      "media business"],
  [/\binfluencer\b/i,                                                         "media business"],
  [/\b(crypto|forex|stock|options|day)[- ]?trading\b/i,                       "capital/trading"],
  [/\btrading (bot|strategy|strategies|signals?)\b/i,                          "capital/trading"],
  [/\b(investment|investing) (portfolio|strategy|strategies)\b/i,              "capital/trading"],
  [/\b(top|best)\s+\d+\s+(saas|business|startup)?\s*ideas\b/i,                "generic ideation"],
];

export function excludedCategory(text: string): string | null {
  for (const [re, label] of EXCLUDED_PATTERNS) if (re.test(text)) return label;
  return null;
}

/** host + path, lowercased, no www, no query/fragment, no trailing slash. */
export function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return `${u.hostname.replace(/^www\./, "").toLowerCase()}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

export function extractUrls(text: string): string[] {
  return (text.match(/https?:\/\/[^\s)\]>"'`]+/g) ?? []).map(u => u.replace(/[.,;:]+$/, ""));
}

/**
 * URLs that MioOS actually retrieved through its web-search connector in the last
 * `days` days. Evidence counts as "verified external evidence" only if its URL is
 * in this set — an LLM cannot invent a URL that passes.
 */
export async function getRetrievedSourceUrls(days = 30): Promise<Set<string>> {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await prisma.searchResearch.findMany({
    where:  { status: "completed", createdAt: { gte: since }, sources: { not: null } },
    select: { sources: true },
  });
  const set = new Set<string>();
  for (const r of rows) {
    try {
      for (const s of JSON.parse(r.sources ?? "[]") as Array<{ url?: string }>) {
        const n = s?.url ? normalizeUrl(s.url) : null;
        if (n) set.add(n);
      }
    } catch { /* skip malformed row */ }
  }
  return set;
}

export const SOLUTIONS_SCOPE_TEXT =
  "Mio Solutions scope: the current priority portfolio is AION, Mail Co-Pilot and the AI Website Agency — work on these first. " +
  "New AI, software and automation opportunities are allowed when they are backed by real external evidence (cite source URLs) and a credible monetization path, " +
  "classified as one of: software venture, SaaS product, AI product, automation service, productized service, internal tool with commercialization potential. " +
  "Never: generic ideation, affiliate ideas, media/content businesses, e-commerce products, capital/trading opportunities. " +
  "Do no work for Mio Media, Mio Commerce or Mio Capital Lab (dormant units).";
