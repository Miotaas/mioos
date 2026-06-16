import { prisma } from "@/lib/db";

export interface TeamMemoryContext {
  recentOutputs:        Array<{ title: string; outputType: string; preview: string; createdAt: string }>;
  recentFeedback:       Array<{ decision: string; comment: string | null; createdAt: string }>;
  previousAssignments:  Array<{ title: string; status: string; completedAt: string | null }>;
  teamFocus:            string | null;
  // V2 additions
  linkedOpportunities:  Array<{ title: string; type: string; status: string; score: number }>;
  revenueContribution:  number;
  recentArtifacts:      Array<{ title: string; artifactType: string; createdAt: string }>;
  approvedOutputCount:  number;
  rejectedOutputCount:  number;
}

export async function getTeamMemory(teamId: string): Promise<TeamMemoryContext> {
  const [recentOutputs, previousAssignments, team, recentArtifacts, revenueAgg, feedbackStats] =
    await Promise.all([
      prisma.workforceOutput.findMany({
        where:   { teamId },
        orderBy: { createdAt: "desc" },
        take:    5,
        select:  {
          title: true, outputType: true, content: true, createdAt: true,
          feedback: {
            select: { decision: true, comment: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.assignment.findMany({
        where:   { teamId, status: { in: ["completed", "review"] } },
        orderBy: { updatedAt: "desc" },
        take:    5,
        select:  { title: true, status: true, completedAt: true },
      }),
      prisma.workforceTeam.findUnique({
        where:  { id: teamId },
        select: { currentFocus: true },
      }),
      // V2: Recent artifacts produced by this team
      prisma.artifact.findMany({
        where:   { sourceTeamId: teamId, status: { not: "archived" } },
        orderBy: { createdAt: "desc" },
        take:    3,
        select:  { title: true, artifactType: true, createdAt: true },
      }),
      // V2: Revenue entries linked through outputs/opportunities by this team
      prisma.revenueEntry.aggregate({
        _sum: { amount: true },
        where: { sourceTeamId: teamId, status: "active" },
      }),
      // V2: Feedback stats (approved vs rejected ratio)
      prisma.outputFeedback.groupBy({
        by:    ["decision"],
        _count: { id: true },
        where: { teamId },
      }),
    ]);

  // V2: Load linked opportunities from assignments
  const opportunityIds = await prisma.assignment.findMany({
    where:   { teamId, opportunityId: { not: null } },
    select:  { opportunityId: true },
    orderBy: { createdAt: "desc" },
    take:    5,
    distinct: ["opportunityId"],
  });

  const uniqueOppIds = [...new Set(opportunityIds.map(a => a.opportunityId).filter(Boolean))] as string[];
  const linkedOpportunities = uniqueOppIds.length > 0
    ? await prisma.opportunity.findMany({
        where:  { id: { in: uniqueOppIds }, status: { notIn: ["rejected", "archived"] } },
        select: { title: true, opportunityType: true, status: true, score: true },
      })
    : [];

  const recentFeedback = recentOutputs.flatMap(o => o.feedback).slice(0, 3);

  const approvedCount = feedbackStats.find(f => f.decision === "approved")?._count.id ?? 0;
  const rejectedCount = feedbackStats.find(f => f.decision === "rejected")?._count.id ?? 0;

  return {
    recentOutputs: recentOutputs.map(o => ({
      title:      o.title,
      outputType: o.outputType,
      preview:    (o.content ?? "").slice(0, 250),
      createdAt:  o.createdAt.toISOString(),
    })),
    recentFeedback: recentFeedback.map(f => ({
      decision:  f.decision,
      comment:   f.comment,
      createdAt: f.createdAt.toISOString(),
    })),
    previousAssignments: previousAssignments.map(a => ({
      title:       a.title,
      status:      a.status,
      completedAt: a.completedAt?.toISOString() ?? null,
    })),
    teamFocus: team?.currentFocus ?? null,
    linkedOpportunities: linkedOpportunities.map(o => ({
      title:  o.title,
      type:   o.opportunityType,
      status: o.status,
      score:  o.score,
    })),
    revenueContribution: revenueAgg._sum.amount ?? 0,
    recentArtifacts: recentArtifacts.map(a => ({
      title:        a.title,
      artifactType: a.artifactType,
      createdAt:    a.createdAt.toISOString(),
    })),
    approvedOutputCount: approvedCount,
    rejectedOutputCount: rejectedCount,
  };
}

export function formatTeamMemoryForContext(memory: TeamMemoryContext): string {
  const lines: string[] = [];

  if (memory.previousAssignments.length > 0) {
    lines.push("## Team's Recent Assignments");
    memory.previousAssignments.forEach(a => {
      lines.push(`- ${a.title} [${a.status}]`);
    });
  }

  if (memory.linkedOpportunities.length > 0) {
    lines.push("\n## Active Opportunities This Team Is Working On");
    memory.linkedOpportunities.forEach(o => {
      lines.push(`- [${o.type}] "${o.title}" — status: ${o.status}, score: ${o.score}/10`);
    });
  }

  if (memory.recentArtifacts.length > 0) {
    lines.push("\n## Artifacts Produced by This Team");
    memory.recentArtifacts.forEach(a => {
      lines.push(`- [${a.artifactType}] ${a.title}`);
    });
  }

  if (memory.recentOutputs.length > 0) {
    lines.push("\n## Recent Outputs (with preview)");
    memory.recentOutputs.forEach(o => {
      lines.push(`- [${o.outputType}] ${o.title}: ${o.preview}...`);
    });
  }

  if (memory.recentFeedback.length > 0) {
    lines.push("\n## Founder Feedback on Past Work");
    memory.recentFeedback.forEach(f => {
      lines.push(`- ${f.decision.toUpperCase()}${f.comment ? `: "${f.comment}"` : ""}`);
    });
  }

  if (memory.approvedOutputCount > 0 || memory.rejectedOutputCount > 0) {
    const total = memory.approvedOutputCount + memory.rejectedOutputCount;
    const ratio = total > 0 ? Math.round((memory.approvedOutputCount / total) * 100) : 0;
    lines.push(`\n## Quality Track Record\n${memory.approvedOutputCount} approved, ${memory.rejectedOutputCount} rejected (${ratio}% approval rate)`);
  }

  if (memory.revenueContribution > 0) {
    lines.push(`\n## Revenue Contribution\n€${memory.revenueContribution.toLocaleString()} attributed to this team's work`);
  }

  if (memory.teamFocus) {
    lines.push(`\n## Current Strategic Focus\n${memory.teamFocus}`);
  }

  return lines.join("\n");
}
