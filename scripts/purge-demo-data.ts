/**
 * M4 — purge demo data (HELD: dry-run by default).
 *
 *   npm run db:purge-demo                 # dry-run: report only, deletes nothing
 *   npm run db:purge-demo -- --confirm    # delete the demo categories
 *   npm run db:purge-demo -- --confirm --include-revenue   # also delete demo pipeline revenue
 *
 * Conservative. Keeps anything real: closed/live revenue, approvals the founder
 * acted on, real projects, settings, runtime config, integrations, the autonomous
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
// Off-priority demo examples the workforce must stop producing and that should be removed.
const DEMO_KEYWORDS = [
  "Toast POS", "Labor Compliance", "Restaurant Scheduling", "restaurant scheduling",
  "Affiliate Program", "affiliate program", "affiliate network",
];

function kwOr(field: "title" | "description") {
  return DEMO_KEYWORDS.map((k) => ({ [field]: { contains: k } }));
}

async function main() {
  console.log(`-- M4 purge (${CONFIRM ? "CONFIRM — will delete" : "DRY-RUN — no deletes"}) --`);

  const placeholderOutputs = await prisma.workforceOutput.findMany({ where: { content: { contains: TEMPLATE_MARKER } }, select: { id: true } });
  const phIds = placeholderOutputs.map((o) => o.id);

  const keywordOutputs = await prisma.workforceOutput.findMany({ where: { OR: [...kwOr("title"), ...kwOr("description")] }, select: { id: true } });
  const kwOutIds = keywordOutputs.map((o) => o.id);

  const outputIds = Array.from(new Set([...phIds, ...kwOutIds]));

  const demoOppsFromOutputs = outputIds.length
    ? await prisma.opportunity.findMany({ where: { sourceOutputId: { in: outputIds } }, select: { id: true } })
    : [];
  const keywordOpps = await prisma.opportunity.findMany({ where: { OR: [...kwOr("title"), ...kwOr("description")] }, select: { id: true } });
  const oppIds = Array.from(new Set([...demoOppsFromOutputs.map((o) => o.id), ...keywordOpps.map((o) => o.id)]));

  const fakeApprovals = await prisma.approval.count({ where: { status: "pending", reason: { contains: "governance fallback" } } });
  const keywordApprovals = await prisma.approval.count({ where: { status: { in: ["pending", "auto_approved"] }, OR: [...kwOr("title"), ...kwOr("description")] } });
  const genericObjectives = await prisma.teamObjective.count({ where: { active: false, title: { in: GENERIC_OBJECTIVE_TITLES } } });
  const demoRevenue = await prisma.revenueEntry.count({ where: { revenueType: { in: ["pipeline", "potential"] }, status: "active", opportunityId: null } });

  console.log("Would remove:");
  console.log(`  placeholder/template outputs:     ${phIds.length}`);
  console.log(`  off-priority (keyword) outputs:   ${kwOutIds.length}`);
  console.log(`  demo opportunities (total):       ${oppIds.length}`);
  console.log(`  unreviewed/governance approvals:  ${fakeApprovals}`);
  console.log(`  off-priority (keyword) approvals: ${keywordApprovals}`);
  console.log(`  deactivated generic objectives:   ${genericObjectives}`);
  console.log(`  demo pipeline revenue:            ${demoRevenue}  ${INCLUDE_REVENUE ? "(will delete)" : "(KEEP unless --include-revenue)"}`);
  console.log("Keeps: closed/live revenue, acted-on approvals, real projects, settings, runtime config, integrations, autonomous engine.");
  console.log(`Keyword filter: ${DEMO_KEYWORDS.join(", ")}`);

  if (!CONFIRM) { console.log("-- DRY-RUN only. Re-run with --confirm to delete. --"); return; }

  if (outputIds.length) await prisma.outputFeedback.deleteMany({ where: { outputId: { in: outputIds } } }).catch(() => {});
  if (oppIds.length)    await prisma.opportunity.deleteMany({ where: { id: { in: oppIds } } });
  if (outputIds.length) await prisma.workforceOutput.deleteMany({ where: { id: { in: outputIds } } });
  await prisma.approval.deleteMany({ where: { status: "pending", reason: { contains: "governance fallback" } } });
  await prisma.approval.deleteMany({ where: { status: { in: ["pending", "auto_approved"] }, OR: [...kwOr("title"), ...kwOr("description")] } });
  await prisma.teamObjective.deleteMany({ where: { active: false, title: { in: GENERIC_OBJECTIVE_TITLES } } });
  if (INCLUDE_REVENUE) await prisma.revenueEntry.deleteMany({ where: { revenueType: { in: ["pipeline", "potential"] }, status: "active", opportunityId: null } });
  console.log("-- purge complete --");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
