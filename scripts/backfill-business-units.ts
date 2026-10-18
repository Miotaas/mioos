/**
 * Business Unit backfill (idempotent) — reality-aligned.
 *
 * 1. Renames legacy units (automation-sales -> ai-ventures) preserving the row id.
 * 2. Upserts the 4 canonical units (AI Ventures, Content/YouTube, E-commerce, Capital).
 * 3. Attributes existing rows (Opportunity, WorkforceOutput, Approval,
 *    RevenueEntry, Assignment) to a unit where businessUnitId is still null.
 *
 * Safe to run repeatedly. Only fills nulls / renames; never deletes. Run with:
 *   npm run db:backfill-bu
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BUSINESS_UNITS = [
  { slug: "ai-ventures", name: "AI Ventures",        kind: "services", objective: "Build and sell AI software/services: AION, Mail Co-Pilot, AI Website Agency, and future AI products.", sortOrder: 1 },
  { slug: "content",     name: "Content / YouTube",  kind: "media",    objective: "Grow YouTube and automation content channels into audience and revenue.", sortOrder: 2 },
  { slug: "ecommerce",   name: "E-commerce",         kind: "commerce", objective: "Find, validate and launch profitable supplier-fulfilled product stores.", sortOrder: 3 },
  { slug: "capital",     name: "Capital / Investing",kind: "capital",  objective: "Grow capital responsibly. Research / paper mode by default.", sortOrder: 4 },
];

const RENAMES: Record<string, { slug: string; name: string; kind: string }> = {
  "automation-sales": { slug: "ai-ventures", name: "AI Ventures", kind: "services" },
};

const TEAM_SLUG_TO_BU: Record<string, string> = {
  "ai-ventures": "ai-ventures",
  "website-revenue": "ai-ventures", "automation-revenue": "ai-ventures", "automation-sales": "ai-ventures", "sales": "ai-ventures", "marketing": "ai-ventures", "development": "ai-ventures",
  "content": "content", "youtube": "content",
  "ecommerce": "ecommerce", "commerce": "ecommerce",
  "capital": "capital", "crypto-stock": "capital",
};

const OPP_TYPE_TO_BU: Record<string, string> = {
  "automation_service": "ai-ventures", "saas_product": "ai-ventures", "internal_tool": "ai-ventures", "software_venture": "ai-ventures", "ai_product": "ai-ventures", "productized_service": "ai-ventures",
  "ecommerce_product": "ecommerce", "ecommerce": "ecommerce",
  "content_business": "content", "content": "content",
};

async function main() {
  console.log("-- Business Unit backfill (reality-aligned) --");

  // 1. Rename legacy units in place (preserve id) when the new slug doesn't already exist.
  for (const [oldSlug, to] of Object.entries(RENAMES)) {
    const existingOld = await prisma.businessUnit.findUnique({ where: { slug: oldSlug } });
    const existingNew = await prisma.businessUnit.findUnique({ where: { slug: to.slug } });
    if (existingOld && !existingNew) {
      await prisma.businessUnit.update({ where: { id: existingOld.id }, data: { slug: to.slug, name: to.name, kind: to.kind } });
      console.log(`  renamed unit ${oldSlug} -> ${to.slug} (kept id ${existingOld.id})`);
    }
  }

  // 2. Upsert the 4 canonical units.
  const slugToId: Record<string, string> = {};
  for (const bu of BUSINESS_UNITS) {
    const row = await prisma.businessUnit.upsert({
      where: { slug: bu.slug },
      update: { name: bu.name, kind: bu.kind, sortOrder: bu.sortOrder },
      create: bu,
    });
    slugToId[bu.slug] = row.id;
    console.log(`  unit ok ${bu.slug} -> ${row.id}`);
  }

  // 3. Map teams to units, then attribute null rows.
  const teams = await prisma.workforceTeam.findMany({ select: { id: true, slug: true } });
  const teamIdToBuId: Record<string, string> = {};
  for (const t of teams) {
    const buSlug = TEAM_SLUG_TO_BU[t.slug];
    if (buSlug && slugToId[buSlug]) teamIdToBuId[t.id] = slugToId[buSlug];
  }

  let touched = 0;

  const opps = await prisma.opportunity.findMany({ where: { businessUnitId: null }, select: { id: true, opportunityType: true, assignedWorkflowTemplate: true } });
  for (const o of opps) {
    const buSlug = OPP_TYPE_TO_BU[o.opportunityType] ?? OPP_TYPE_TO_BU[o.assignedWorkflowTemplate ?? ""];
    const buId = buSlug ? slugToId[buSlug] : undefined;
    if (buId) { await prisma.opportunity.update({ where: { id: o.id }, data: { businessUnitId: buId } }); touched++; }
  }

  for (const [teamId, buId] of Object.entries(teamIdToBuId)) {
    const [o, a, ap, rev] = await Promise.all([
      prisma.workforceOutput.updateMany({ where: { teamId, businessUnitId: null }, data: { businessUnitId: buId } }),
      prisma.assignment.updateMany({ where: { teamId, businessUnitId: null }, data: { businessUnitId: buId } }),
      prisma.approval.updateMany({ where: { sourceTeamId: teamId, businessUnitId: null }, data: { businessUnitId: buId } }),
      prisma.revenueEntry.updateMany({ where: { sourceTeamId: teamId, businessUnitId: null }, data: { businessUnitId: buId } }),
    ]);
    touched += o.count + a.count + ap.count + rev.count;
  }

  const revNoBu = await prisma.revenueEntry.findMany({ where: { businessUnitId: null, opportunityId: { not: null } }, select: { id: true, opportunityId: true } });
  for (const r of revNoBu) {
    const opp = await prisma.opportunity.findUnique({ where: { id: r.opportunityId! }, select: { businessUnitId: true } });
    if (opp?.businessUnitId) { await prisma.revenueEntry.update({ where: { id: r.id }, data: { businessUnitId: opp.businessUnitId } }); touched++; }
  }

  console.log(`  attributed ${touched} existing rows`);
  console.log("-- done --");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
