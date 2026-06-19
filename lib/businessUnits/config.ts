/**
 * Phase 1 — canonical Business Unit definitions.
 *
 * These are the 4 businesses the founder owns. They are strategic / revenue /
 * UI boundaries — NOT implementation boundaries. All real work runs on the
 * shared platform; transactional rows carry an optional businessUnitId so each
 * unit rolls up its own P&L.
 *
 * NOTE: the legacy WorkforceTeam table uses functional slugs (executive,
 * research, commerce, sales, marketing, content, ...) AND the team-behaviors
 * config uses business-unit slugs (ecommerce, automation-sales, youtube,
 * crypto-stock). The maps below reconcile both onto the 4 canonical units.
 */

export type BusinessUnitKind = "commerce" | "services" | "media" | "capital";

export interface BusinessUnitDef {
  slug: string;
  name: string;
  kind: BusinessUnitKind;
  objective: string;
  sortOrder: number;
}

export const BUSINESS_UNITS: BusinessUnitDef[] = [
  {
    slug: "ecommerce",
    name: "E-Commerce",
    kind: "commerce",
    objective: "Find and launch profitable supplier-fulfilled product opportunities.",
    sortOrder: 1,
  },
  {
    slug: "automation-sales",
    name: "Automation Sales",
    kind: "services",
    objective: "Discover business pain, design sellable automations, win service customers.",
    sortOrder: 2,
  },
  {
    slug: "content",
    name: "Content / Media",
    kind: "media",
    objective: "Build content channels and media assets that grow audience and revenue.",
    sortOrder: 3,
  },
  {
    slug: "capital",
    name: "Capital / Trading",
    kind: "capital",
    objective: "Grow capital responsibly. Research / paper mode by default.",
    sortOrder: 4,
  },
];

export const BUSINESS_UNIT_SLUGS = BUSINESS_UNITS.map((b) => b.slug);

/** Legacy WorkforceTeam.slug (or departmentType) → canonical BU slug. Unmapped → not attributed. */
export const TEAM_SLUG_TO_BU: Record<string, string> = {
  // direct business-unit slugs (team-behaviors style)
  "ecommerce": "ecommerce",
  "automation-sales": "automation-sales",
  "youtube": "content",
  "crypto-stock": "capital",
  // functional department slugs (seed style)
  "commerce": "ecommerce",
  "sales": "automation-sales",
  "content": "content",
  "marketing": "content",
  "capital": "capital",
  // executive / research / operations / support / development → intentionally unmapped
};

/** Opportunity.opportunityType (or assignedWorkflowTemplate) → canonical BU slug. */
export const OPPORTUNITY_TYPE_TO_BU: Record<string, string> = {
  "ecommerce_product": "ecommerce",
  "ecommerce": "ecommerce",
  "automation_service": "automation-sales",
  "saas_product": "automation-sales",
  "internal_tool": "automation-sales",
  "automation_service_template": "automation-sales",
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
