/**
 * Phase 1 — Business Unit backfill (idempotent).
 *
 * 1. Upserts the 4 canonical Business Units (by slug).
 * 2. Attributes existing rows (Opportunity, WorkforceOutput, Approval,
 *    RevenueEntry, Assignment) to a BU where businessUnitId is still null.
 *
 * Safe to run repeatedly — only fills nulls, never overwrites. No data is
 * deleted. Run with:  npm run db:backfill-bu
 *
 * Self-contained (own PrismaClient, inline maps) so it runs under tsx without
 * the @/ path alias — same pattern as prisma/seed.ts.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BUSINESS_UNITS = [
  { slug: "ecommerce",        name: "E-Commerce",        kind: "commerce", objective: "Find and launch profitable supplier-fulfilled product opportunities.", sortOrder: 1 },
  { slug: "automation-sales", name: "Automation Sales",  kind: "services", objective: "Discover business pain, design sellable automations, win service customers.", sortOrder: 2 },
  { slug: "content",          name: "Content / Media",   kind: "media",    objective: "Build content channels and media assets that grow audience and revenue.", sortOrder: 3 },
  { slug: "capital",          name: "Capital / Trading", kind: "capital",  objective: "Grow capital responsibly. Research / paper mode by default.", sortOrder: 4 },
];

const TEAM_SLUG_TO_BU: Record<string, string> = {
  "ecommerce": "ecommerce", "commerce": "ecommerce",
  "automation-sales": "automation-sales", "sales": "automation-sales",
  "youtube": "content", "content": "content", "marketing": "content",
  "crypto-stock": "capital", "capital": "capital",
};

const OPP_TYPE_TO_BU: Record<string, string> = {
  "ecommerce_product": "ecommerce", "ecommerce": "ecommerce",
  "automation_service": "automation-sales", "saas_product": "automation-sales", "internal_tool": "automation-sales",
  "content_business": "content", "content": "content",
};

async function main() {
  console.log("── Phase 1 — Business Unit backfill ──");

  // 1. Upsert the 4 canonical units.
  const slugToId: Record<string, string> = {};
  for (const bu of BUSINESS_UNITS) {
    const row = await prisma.businessUnit.upsert({
      where: { slug: bu.slug },
      update: { name: bu.name, kind: bu.kind, sortOrder: bu.sortOrder },
      create: bu,
    });
    slugToId[bu.slug] = row.id;
    console.log(`  unit ✓ ${bu.slug} -> ${row.id}`);
  }

  // 2. Map every WorkforceTeam.id to a BU id (via its slug).
  const teams = await prisma.workforceTeam.findMany({ select: { id: true, slug: true } });
  const teamIdToBuId: Record<string, string> = {};
  for (const t of teams) {
    const buSlug = TEAM_SLUG_TO_BU[t.slug];
    if (buSlug && slugToId[buSlug]) teamIdToBuId[t.id] = slugToId[buSlug];
  }
  console.log(`  mapped ${Object.keys(teamIdToBuId).length}/${teams.length} teams to a unit`);

  let touched = 0;

  // 3a. Opportunities — by opportunityType, fallback assignedWorkflowTemplate.
  const opps = await prisma.opportunity.findMany({
    where: { businessUnitId: null },
    select: { id: true, opportunityType: true, assignedWorkflowTemplate: true },
  });
  for (const o of opps) {
    const buSlug = OPP_TYPE_TO_BU[o.opportunityType] ?? OPP_TYPE_TO_BU[o.assignedWorkflowTemplate ?? ""];
    const buId = buSlug ? slugToId[buSlug] : undefined;
    if (buId) {
      await prisma.opportunity.update({ where: { id: o.id }, data: { businessUnitId: buId } });
      touched++;
    }
  }

  // 3b. Team-anchored tables — one updateMany per mapped team.
  for (const [teamId, buId] of Object.entries(teamIdToBuId)) {
    const [o, a] = await Promise.all([
      prisma.workforceOutput.updateMany({ where: { teamId, businessUnitId: null }, data: { businessUnitId: buId } }),
      prisma.assignment.updateMany({ where: { teamId, businessUnitId: null }, data: { businessUnitId: buId } }),
    ]);
    const ap = await prisma.approval.updateMany({ where: { sourceTeamId: teamId, businessUnitId: null }, data: { businessUnitId: buId } });
    const rev = await prisma.revenueEntry.updateMany({ where: { sourceTeamId: teamId, businessUnitId: null }, data: { businessUnitId: buId } });
    touched += o.count + a.count + ap.count + rev.count;
  }

  // 3c. RevenueEntry fallback — inherit BU from its linked Opportunity.
  const revNoBu = await prisma.revenueEntry.findMany({
    where: { businessUnitId: null, opportunityId: { not: null } },
    select: { id: true, opportunityId: true },
  });
  for (const r of revNoBu) {
    const opp = await prisma.opportunity.findUnique({ where: { id: r.opportunityId! }, select: { businessUnitId: true } });
    if (opp?.businessUnitId) {
      await prisma.revenueEntry.update({ where: { id: r.id }, data: { businessUnitId: opp.businessUnitId } });
      touched++;
    }
  }

  console.log(`  attributed ${touched} existing rows to a business unit`);
  console.log("── done ──");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
