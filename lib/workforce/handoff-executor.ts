import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/auditLog";
import { sendTeamMessage } from "./team-communicator";

export async function processPendingHandoffs(): Promise<{ processed: number }> {
  let processed = 0;

  const handoffs = await prisma.teamHandoff.findMany({
    where: { status: "pending" },
    include: {
      fromTeam: { select: { id: true, name: true } },
      toTeam: {
        include: { autonomyConfig: true },
      },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 5,
  });

  for (const handoff of handoffs) {
    const toTeam = handoff.toTeam;
    const config = toTeam.autonomyConfig;

    if (!config?.canSelfInitiate) continue;
    if (toTeam.status !== "active") continue;

    const title = `[Handoff] ${handoff.title}`;
    const description = [
      `Handoff received from: ${handoff.fromTeam.name}`,
      handoff.description ? `\nContext: ${handoff.description}` : "",
      handoff.notes ? `\nNotes: ${handoff.notes}` : "",
    ].filter(Boolean).join("");

    const assignment = await prisma.assignment.create({
      data: {
        title,
        description,
        teamId: toTeam.id,
        priority: handoff.priority,
        status: "pending",
        projectId: handoff.projectId ?? null,
      },
    });

    await prisma.runtimeQueue.create({
      data: {
        teamId: toTeam.id,
        assignmentId: assignment.id,
        title,
        description,
        priority: handoff.priority,
        source: "handoff",
        status: "queued",
      },
    });

    await prisma.teamHandoff.update({
      where: { id: handoff.id },
      data: { status: "accepted", acceptedAt: new Date() },
    });

    await sendTeamMessage(
      handoff.fromTeam.id,
      toTeam.id,
      `Handoff accepted: ${handoff.title}`,
      `${toTeam.name} received your handoff and created assignment #${assignment.id}. Queued for execution.`,
    ).catch(() => {});

    await auditLog("assignment", assignment.id, "handoff_auto_accepted", {
      handoffId: handoff.id,
      fromTeam: handoff.fromTeam.name,
      toTeam: toTeam.name,
    });

    processed++;
  }

  return { processed };
}
