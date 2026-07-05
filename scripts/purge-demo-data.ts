/**
 * M4 — purge demo data (HELD: dry-run by default).
 *
 *   npm run db:purge-demo                 # dry-run: report only, deletes nothing
 *   npm run db:purge-demo -- --confirm    # delete the demo categories
 *   npm run db:purge-demo -- --confirm --include-revenue   # also delete demo pipeline revenue
 *
 * Conservative. Keeps anything real: closed/live revenue, approvals the founder
 * acted on, real projects, settings, runtime config, integrations, autonomous
 * engine. Run AFTER db:migrate-reality and AFTER a backup (sh scripts/backup-db.sh).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CONFIRM = process.argv.includes("--confirm");
const INCLUDE_REVENUE = process.argv.includes("--include-revenue");

const TEMPLATE_MARKER = "Template output; AI provider not configured";
const GENERIC_OBJECTIVE_TITLES = [
  "Opportunity Discovery & Market Research", "Pipeline & Prospect Development",
  "Marketing Strategy & Campaigns", "Content Production", "Execution & Process Improvement",
  "Customer Support Intelligence", "Technical Development & Architecture",
  "Strategic Business Overview", "Revenue Opportunity Discovery",
];
const DEMO_KEYWORDS = [
  "Toast POS", "Labor Compliance", "Restaurant Scheduling", "restaurant scheduling",
  "Affiliate Program", "affiliate program", "affiliate network",
];
// Early/unacted opportunity stages — safe to remove when pre-reality and unlinked.
const EARLY_OPP_STATUSES = ["discovered", "researching", "validating", "rejected", "archived"];

function kwOr(field: "title" | "description") {
  return DEMO_KEYWORDS.map((k) => ({ [field]: { contains: k } }));
}

async function main() {
  console.log(`-- M4 purge (${CONFIRM ? "CONFIRM — will delete" : "DRY-RUN — no deletes"}) --`);

  const placeholderOutputs = await prisma.workforceOutput.findMany({ where: { content: { contains: TEMPLATE_MARKER } }, select: { id: true } });
  const phIds = placeholderOutputs.map((o) => o.id);
  const keywordOutputs = await prisma.workforceOutput.findMany({ where: { OR: [...kwOr("title"), ...kwOr("description")] }, select: { id: true } });
  const outputIds = Array.from(new Set([...phIds, ...keywordOutputs.map((o) => o.id)]));

  const demoOppsFromOutputs = outputIds.length ? await prisma.opportunity.findMany({ where: { sourceOutputId: { in: outputIds } }, select: { id: true } }) : [];
  const keywordOpps = await prisma.opportunity.findMany({ where: { OR: [...kwOr("title"), ...kwOr("description")] }, select: { id: true } });
  const keywordOppIds = Array.from(new Set([...demoOppsFromOutputs.map((o) => o.id), ...keywordOpps.map((o) => o.id)]));

  // ROOT-CAUSE category: pre-reality demo-era opportunities the keyword filter can't catch
  // (e.g. "Premium Pet Probiotics & Digestive Supplements"). Reliable signal = created
  // before Founder Context existed, still early-stage, never acted on (no project/revenue).
  const fcRow = await prisma.systemConfig.findUnique({ where: { key: "founder_context" } });
  const cutoff = fcRow?.updatedAt ?? null;
  const staleWhere = cutoff
    ? { createdAt: { lt: cutoff }, status: { in: EARLY_OPP_STATUSES }, projectId: null, revenueEntryId: null }
    : null;
  const staleOppRows = staleWhere ? await prisma.opportunity.findMany({ where: staleWhere, select: { id: true } }) : [];
  const staleOppIds = staleOppRows.map((o) => o.id);

  const allOppIds = Array.from(new Set([...keywordOppIds, ...staleOppIds]));

  const fakeApprovals = await prisma.approval.count({ where: { status: "pending", reason: { contains: "governance fallback" } } });
  const keywordApprovals = await prisma.approval.count({ where: { status: { in: ["pending", "auto_approved"] }, OR: [...kwOr("title"), ...kwOr("description")] } });
  const genericObjectives = await prisma.teamObjective.count({ where: { active: false, title: { in: GENERIC_OBJECTIVE_TITLES } } });
  const demoRevenue = await prisma.revenueEntry.count({ where: { revenueType: { in: ["pipeline", "potential"] }, status: "active", opportunityId: null } });

  console.log("Would remove:");
  console.log(`  placeholder/template outputs:      ${phIds.length}`);
  console.log(`  off-priority (keyword) outputs:    ${keywordOutputs.length}`);
  console.log(`  keyword-matched opportunities:     ${keywordOppIds.length}`);
  console.log(`  pre-reality demo opportunities:    ${staleOppIds.length}  ${cutoff ? `(created before ${cutoff.toISOString()})` : "(no founder_context cutoff — skipped)"}`);
  console.log(`  → total opportunities to delete:   ${allOppIds.length}`);
  console.log(`  unreviewed/governance approvals:   ${fakeApprovals}`);
  console.log(`  off-priority (keyword) approvals:  ${keywordApprovals}`);
  console.log(`  deactivated generic objectives:    ${genericObjectives}`);
  console.log(`  demo pipeline revenue:             ${demoRevenue}  ${INCLUDE_REVENUE ? "(will delete)" : "(KEEP unless --include-revenue)"}`);
  console.log("Keeps: closed/live revenue, acted-on approvals, real projects, opportunities with a project/revenue, settings, runtime config, integrations.");

  if (!CONFIRM) { console.log("-- DRY-RUN only. Re-run with --confirm to delete. --"); return; }

  if (outputIds.length) await prisma.outputFeedback.deleteMany({ where: { outputId: { in: outputIds } } }).catch(() => {});
  if (allOppIds.length) await prisma.opportunity.deleteMany({ where: { id: { in: allOppIds } } });
  if (outputIds.length) await prisma.workforceOutput.deleteMany({ where: { id: { in: outputIds } } });
  await prisma.approval.deleteMany({ where: { status: "pending", reason: { contains: "governance fallback" } } });
  await prisma.approval.deleteMany({ where: { status: { in: ["pending", "auto_approved"] }, OR: [...kwOr("title"), ...kwOr("description")] } });
  await prisma.teamObjective.deleteMany({ where: { active: false, title: { in: GENERIC_OBJECTIVE_TITLES } } });
  if (INCLUDE_REVENUE) await prisma.revenueEntry.deleteMany({ where: { revenueType: { in: ["pipeline", "potential"] }, status: "active", opportunityId: null } });
  console.log("-- purge complete --");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
