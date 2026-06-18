import { prisma } from "@/lib/db";

export interface TeamMemoryContext {
  // All-time assignment titles — AI must not repeat these
  allCoveredTopics:     string[];
  // Opportunities that were explicitly rejected — AI must avoid these directions
  rejectedOpportunities: Array<{ title: string; description?: string | null }>;
  // Opportunities that were approved or are active — AI should build on these
  approvedOpportunities: Array<{ title: string; status: string; estimatedRevenue?: number | null }>;
  // Recent outputs with preview (last 8)
  recentOutputs:        Array<{ title: string; outputType: string; preview: string; createdAt: string }>;
  // Recent founder feedback
  recentFeedback:       Array<{ decision: string; comment: string | null; createdAt: string }>;
  // Recent completed/review assignments (last 5)
  previousAssignments:  Array<{ title: string; status: string; completedAt: string | null }>;
  teamFocus:            string | null;
  // Active opportunities (not rejected/archived) linked to this team
  linkedOpportunities:  Array<{ title: string; type: string; status: string; score: number }>;
  revenueContribution:  number;
  recentArtifacts:      Array<{ title: string; artifactType: string; createdAt: string }>;
  approvedOutputCount:  number;
  rejectedOutputCount:  number;
}

export async function getTeamMemory(teamId: string): Promise<TeamMemoryContext> {
  const [
    allAssignmentTitles,
    recentOutputs,
    previousAssignments,
    team,
    recentArtifacts,
    revenueAgg,
    feedbackStats,
  ] = await Promise.all([
    // ALL assignment titles ever for this team — for deduplication in AI prompts
    prisma.assignment.findMany({
      where:  { teamId },
      select: { title: true },
      orderBy: { createdAt: "desc" },
    }),
    // Recent outputs with preview
    prisma.workforceOutput.findMany({
      where:   { teamId },
      orderBy: { createdAt: "desc" },
      take:    8,
      select:  {
        title: true, outputType: true, content: true, createdAt: true,
        feedback: {
          select: { decision: true, comment: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    // Recent completed/review assignments
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
    // Artifacts produced
    prisma.artifact.findMany({
      where:   { sourceTeamId: teamId, status: { not: "archived" } },
      orderBy: { createdAt: "desc" },
      take:    5,
      select:  { title: true, artifactType: true, createdAt: true },
    }),
    // Revenue attributed to team
    prisma.revenueEntry.aggregate({
      _sum: { amount: true },
      where: { sourceTeamId: teamId, status: "active" },
    }),
    // Feedback approval/rejection stats
    prisma.outputFeedback.groupBy({
      by:    ["decision"],
      _count: { id: true },
      where: { teamId },
    }),
  ]);

  // Opportunity IDs linked to this team via assignments or outputs
  const [assignmentOppLinks, outputIds] = await Promise.all([
    prisma.assignment.findMany({
      where:   { teamId, opportunityId: { not: null } },
      select:  { opportunityId: true },
      distinct: ["opportunityId"],
    }),
    prisma.workforceOutput.findMany({
      where:  { teamId },
      select: { id: true },
    }),
  ]);

  const assignmentOppIds = [...new Set(
    assignmentOppLinks.map(a => a.opportunityId).filter(Boolean)
  )] as string[];
  const outputIdList = outputIds.map(o => o.id);

  // Load all opportunities — split by status for memory context
  const allLinkedOpps = await prisma.opportunity.findMany({
    where: {
      OR: [
        ...(assignmentOppIds.length > 0 ? [{ id: { in: assignmentOppIds } }] : []),
        ...(outputIdList.length > 0 ? [{ sourceOutputId: { in: outputIdList } }] : []),
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      opportunityType: true,
      status: true,
      score: true,
      estimatedRevenue: true,
    },
  });

  const REJECTED_STATUSES  = new Set(["rejected", "archived"]);
  const APPROVED_STATUSES  = new Set(["approved", "building", "marketing", "selling", "demo", "pilot", "deployment", "live", "revenue_generating"]);
  const ACTIVE_STATUSES    = new Set(["discovered", "researching", "validating"]);

  const rejectedOpportunities  = allLinkedOpps.filter(o => REJECTED_STATUSES.has(o.status));
  const approvedOpportunities  = allLinkedOpps.filter(o => APPROVED_STATUSES.has(o.status));
  const linkedOpportunities    = allLinkedOpps.filter(o => ACTIVE_STATUSES.has(o.status));

  const recentFeedback = recentOutputs.flatMap(o => o.feedback).slice(0, 5);

  const approvedCount = feedbackStats.find(f => f.decision === "approved")?._count.id ?? 0;
  const rejectedCount = feedbackStats.find(f => f.decision === "rejected")?._count.id ?? 0;

  return {
    allCoveredTopics:      allAssignmentTitles.map(a => a.title),
    rejectedOpportunities: rejectedOpportunities.map(o => ({
      title:       o.title,
      description: o.description,
    })),
    approvedOpportunities: approvedOpportunities.map(o => ({
      title:           o.title,
      status:          o.status,
      estimatedRevenue: o.estimatedRevenue,
    })),
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

  // ── Critical: What this team must not repeat ──────────────────
  if (memory.allCoveredTopics.length > 0) {
    lines.push("## Topics This Team Has Already Covered — Do Not Repeat");
    lines.push("You MUST NOT generate work that duplicates any of the following. Choose a new angle, deeper analysis, or adjacent area instead.");
    memory.allCoveredTopics.forEach(t => {
      lines.push(`- ${t}`);
    });
  }

  // ── Rejected directions — explicitly warn off ─────────────────
  if (memory.rejectedOpportunities.length > 0) {
    lines.push("\n## Rejected Opportunities — Avoid These Directions");
    lines.push("The following were evaluated and rejected. Do not re-propose or revisit unless you have substantially new evidence.");
    memory.rejectedOpportunities.forEach(o => {
      lines.push(`- ${o.title}${o.description ? ` — ${o.description.slice(0, 120)}` : ""}`);
    });
  }

  // ── Active in-progress opportunities ─────────────────────────
  if (memory.linkedOpportunities.length > 0) {
    lines.push("\n## Opportunities Currently In Discovery");
    lines.push("These are being actively researched. Your work may complement or deepen them.");
    memory.linkedOpportunities.forEach(o => {
      lines.push(`- [${o.type}] "${o.title}" — status: ${o.status}, score: ${o.score}/10`);
    });
  }

  // ── Approved / in progress — build on these ──────────────────
  if (memory.approvedOpportunities.length > 0) {
    lines.push("\n## Approved Opportunities — Build On These");
    lines.push("The founder has approved these. Your new work should support or accelerate them where relevant.");
    memory.approvedOpportunities.forEach(o => {
      const rev = o.estimatedRevenue ? ` · €${o.estimatedRevenue.toLocaleString()} potential` : "";
      lines.push(`- "${o.title}" [${o.status}]${rev}`);
    });
  }

  // ── Recent artifacts ──────────────────────────────────────────
  if (memory.recentArtifacts.length > 0) {
    lines.push("\n## Recent Artifacts Produced");
    memory.recentArtifacts.forEach(a => {
      lines.push(`- [${a.artifactType}] ${a.title}`);
    });
  }

  // ── Recent outputs ────────────────────────────────────────────
  if (memory.recentOutputs.length > 0) {
    lines.push("\n## Recent Outputs (with preview)");
    memory.recentOutputs.forEach(o => {
      lines.push(`- [${o.outputType}] ${o.title}: ${o.preview}...`);
    });
  }

  // ── Founder feedback ──────────────────────────────────────────
  if (memory.recentFeedback.length > 0) {
    lines.push("\n## Founder Feedback on Past Work");
    memory.recentFeedback.forEach(f => {
      lines.push(`- ${f.decision.toUpperCase()}${f.comment ? `: "${f.comment}"` : ""}`);
    });
  }

  // ── Quality track record ──────────────────────────────────────
  if (memory.approvedOutputCount > 0 || memory.rejectedOutputCount > 0) {
    const total = memory.approvedOutputCount + memory.rejectedOutputCount;
    const ratio = total > 0 ? Math.round((memory.approvedOutputCount / total) * 100) : 0;
    lines.push(`\n## Quality Track Record\n${memory.approvedOutputCount} approved, ${memory.rejectedOutputCount} rejected (${ratio}% approval rate)`);
  }

  // ── Revenue contribution ──────────────────────────────────────
  if (memory.revenueContribution > 0) {
    lines.push(`\n## Revenue Contribution\n€${memory.revenueContribution.toLocaleString()} attributed to this team's work`);
  }

  // ── Current strategic focus ───────────────────────────────────
  if (memory.teamFocus) {
    lines.push(`\n## Current Strategic Focus\n${memory.teamFocus}`);
  }

  return lines.join("\n");
}
