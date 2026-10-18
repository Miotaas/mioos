/**
 * Canonical Business Unit definitions — reality-aligned (4 units).
 *
 * AI Ventures is the home for AION, Mail Co-Pilot, AI Website Agency and future
 * AI products (these are PROJECTS/ventures under the unit, not separate units).
 * Business units are strategic / revenue / UI boundaries — not implementation
 * boundaries. Transactional rows carry businessUnitId for per-unit P&L rollups.
 */

export type BusinessUnitKind = "services" | "media" | "commerce" | "capital";

export interface BusinessUnitDef {
  slug: string;
  name: string;
  kind: BusinessUnitKind;
  objective: string;
  sortOrder: number;
}

export const BUSINESS_UNITS: BusinessUnitDef[] = [
  {
    slug: "ai-ventures",
    name: "AI Ventures",
    kind: "services",
    objective: "Build and sell AI software/services: AION, Mail Co-Pilot, AI Website Agency, and future AI products.",
    sortOrder: 1,
  },
  {
    slug: "content",
    name: "Content / YouTube",
    kind: "media",
    objective: "Grow YouTube and automation content channels into audience and revenue.",
    sortOrder: 2,
  },
  {
    slug: "ecommerce",
    name: "E-commerce",
    kind: "commerce",
    objective: "Find, validate and launch profitable supplier-fulfilled product stores.",
    sortOrder: 3,
  },
  {
    slug: "capital",
    name: "Capital / Investing",
    kind: "capital",
    objective: "Grow capital responsibly. Research / paper mode by default.",
    sortOrder: 4,
  },
];

export const BUSINESS_UNIT_SLUGS = BUSINESS_UNITS.map((b) => b.slug);

/**
 * Legacy slugs that must be renamed to the canonical slug on migration.
 * Preserves the existing BusinessUnit row id so attribution survives.
 */
export const BUSINESS_UNIT_RENAMES: Record<string, string> = {
  "automation-sales": "ai-ventures",
};

/** Functional WorkforceTeam.slug (or departmentType) → canonical BU slug. */
export const TEAM_SLUG_TO_BU: Record<string, string> = {
  // AI Ventures — the AI software/services business
  "ai-ventures": "ai-ventures",
  "website-revenue": "ai-ventures", "automation-revenue": "ai-ventures",
  "automation-sales": "ai-ventures",
  "sales": "ai-ventures",
  "marketing": "ai-ventures",
  "development": "ai-ventures",
  // Content / YouTube
  "content": "content",
  "youtube": "content",
  // E-commerce
  "ecommerce": "ecommerce",
  "commerce": "ecommerce",
  // Capital / Investing
  "capital": "capital",
  "crypto-stock": "capital",
  // research / executive / operations / support → cross-cutting, intentionally unmapped
};

/** Opportunity.opportunityType (or assignedWorkflowTemplate) → canonical BU slug. */
export const OPPORTUNITY_TYPE_TO_BU: Record<string, string> = {
  "automation_service": "ai-ventures",
  "saas_product": "ai-ventures",
  "internal_tool": "ai-ventures",
  "software_venture": "ai-ventures",
  "ai_product": "ai-ventures",
  "productized_service": "ai-ventures",
  "ecommerce_product": "ecommerce",
  "ecommerce": "ecommerce",
  "content_business": "content",
  "content": "content",
};

export function buForTeamSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return TEAM_SLUG_TO_BU[slug] ?? null;
}

export function buForOpportunityType(type: string | null | undefined): string | null {
  if (!type) return null;
  return OPPORTUNITY_TYPE_TO_BU[type] ?? null;
}
