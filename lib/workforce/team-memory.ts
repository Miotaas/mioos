import { prisma } from "@/lib/db";

export interface TeamMemoryContext {
  recentOutputs: Array<{ title: string; outputType: string; preview: string; createdAt: string }>;
  recentFeedback: Array<{ decision: string; comment: string | null; createdAt: string }>;
  previousAssignments: Array<{ title: string; status: string; completedAt: string | null }>;
  teamFocus: string | null;
}

export async function getTeamMemory(teamId: string): Promise<TeamMemoryContext> {
  const [recentOutputs, previousAssignments, team] = await Promise.all([
    prisma.workforceOutput.findMany({
      where: { teamId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        title: true,
        outputType: true,
        content: true,
        createdAt: true,
        feedback: {
          select: { decision: true, comment: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.assignment.findMany({
      where: { teamId, status: { in: ["completed", "review"] } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { title: true, status: true, completedAt: true },
    }),
    prisma.workforceTeam.findUnique({
      where: { id: teamId },
      select: { currentFocus: true },
    }),
  ]);

  const recentFeedback = recentOutputs
    .flatMap(o => o.feedback)
    .slice(0, 3);

  return {
    recentOutputs: recentOutputs.map(o => ({
      title: o.title,
      outputType: o.outputType,
      preview: (o.content ?? "").slice(0, 200),
      createdAt: o.createdAt.toISOString(),
    })),
    recentFeedback: recentFeedback.map(f => ({
      decision: f.decision,
      comment: f.comment,
      createdAt: f.createdAt.toISOString(),
    })),
    previousAssignments: previousAssignments.map(a => ({
      title: a.title,
      status: a.status,
      completedAt: a.completedAt?.toISOString() ?? null,
    })),
    teamFocus: team?.currentFocus ?? null,
  };
}

export function formatTeamMemoryForContext(memory: TeamMemoryContext): string {
  const lines: string[] = [];

  if (memory.previousAssignments.length > 0) {
    lines.push("## Team's Previous Work");
    memory.previousAssignments.forEach(a => {
      lines.push(`- ${a.title} [${a.status}]`);
    });
  }

  if (memory.recentOutputs.length > 0) {
    lines.push("\n## Recent Outputs");
    memory.recentOutputs.forEach(o => {
      lines.push(`- [${o.outputType}] ${o.title}: ${o.preview}...`);
    });
  }

  if (memory.recentFeedback.length > 0) {
    lines.push("\n## Feedback Received on Past Work");
    memory.recentFeedback.forEach(f => {
      lines.push(`- ${f.decision}${f.comment ? `: ${f.comment}` : ""}`);
    });
  }

  if (memory.teamFocus) {
    lines.push(`\n## Current Focus\n${memory.teamFocus}`);
  }

  return lines.join("\n");
}
