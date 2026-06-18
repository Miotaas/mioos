import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const team = await prisma.workforceTeam.findUnique({ where: { slug } });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const [outputIds, assignmentOppLinks, revenueAgg, totalAssignments] = await Promise.all([
    prisma.workforceOutput.findMany({
      where:  { teamId: team.id },
      select: { id: true },
    }),
    prisma.assignment.findMany({
      where:    { teamId: team.id, opportunityId: { not: null } },
      select:   { opportunityId: true },
      distinct: ["opportunityId"],
    }),
    prisma.revenueEntry.aggregate({
      _sum:  { amount: true },
      where: { sourceTeamId: team.id, status: "active" },
    }),
    prisma.assignment.count({ where: { teamId: team.id } }),
  ]);

  const outputIdList     = outputIds.map(o => o.id);
  const assignmentOppIds = [...new Set(
    assignmentOppLinks.map(a => a.opportunityId).filter(Boolean)
  )] as string[];

  const orClauses = [
    ...(outputIdList.length     > 0 ? [{ sourceOutputId: { in: outputIdList } }]  : []),
    ...(assignmentOppIds.length > 0 ? [{ id: { in: assignmentOppIds } }]          : []),
  ];

  const empty = {
    discovered: 0, researching: 0, approved: 0, rejected: 0,
    archived: 0, active: 0, pipelineValue: 0, revenueAttributed: 0,
    successRate: null as number | null, totalAssignments,
    recentWins: [] as Array<{ title: string; status: string; estimatedRevenue?: number | null }>,
    recentFailures: [] as Array<{ title: string }>,
  };

  if (orClauses.length === 0) {
    return NextResponse.json(empty);
  }

  const opportunities = await prisma.opportunity.findMany({
    where:  { OR: orClauses },
    select: { status: true, title: true, estimatedRevenue: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const counts = {
    discovered:  0,
    researching: 0,
    approved:    0,
    rejected:    0,
    archived:    0,
  };
  let pipelineValue = 0;
  const wins: Array<{ title: string; status: string; estimatedRevenue?: number | null }> = [];
  const fails: Array<{ title: string }> = [];

  const WIN_STATUSES  = new Set(["approved", "building", "marketing", "selling", "demo", "pilot", "deployment", "live", "revenue_generating"]);
  const ACTIVE_PIPELINE_STATUSES = new Set(["discovered", "researching", "validating", "approved", "building", "marketing", "selling", "demo", "pilot"]);

  for (const opp of opportunities) {
    const s = opp.status;

    if (s === "discovered") {
      counts.discovered++;
    } else if (s === "researching" || s === "validating") {
      counts.researching++;
    } else if (WIN_STATUSES.has(s)) {
      counts.approved++;
    } else if (s === "rejected") {
      counts.rejected++;
    } else if (s === "archived") {
      counts.archived++;
    }

    if (ACTIVE_PIPELINE_STATUSES.has(s) && opp.estimatedRevenue) {
      pipelineValue += opp.estimatedRevenue;
    }

    if (WIN_STATUSES.has(s) && wins.length < 5) {
      wins.push({ title: opp.title, status: s, estimatedRevenue: opp.estimatedRevenue });
    }
    if (s === "rejected" && fails.length < 5) {
      fails.push({ title: opp.title });
    }
  }

  const active          = counts.discovered + counts.researching;
  const revenueAttributed = revenueAgg._sum.amount ?? 0;
  const decided         = counts.approved + counts.rejected;
  const successRate     = decided > 0 ? Math.round((counts.approved / decided) * 100) : null;

  return NextResponse.json({
    discovered:       counts.discovered,
    researching:      counts.researching,
    approved:         counts.approved,
    rejected:         counts.rejected,
    archived:         counts.archived,
    active,
    pipelineValue,
    revenueAttributed,
    successRate,
    totalAssignments,
    recentWins:     wins,
    recentFailures: fails,
  });
}
