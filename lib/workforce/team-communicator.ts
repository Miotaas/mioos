import { prisma } from "@/lib/db";

// AgentMessage has no FK constraints on fromAgentId/toAgentId, so team IDs work fine.
export async function sendTeamMessage(
  fromTeamId: string,
  toTeamId: string,
  subject: string,
  content: string,
  priority: "low" | "medium" | "high" | "critical" = "medium",
): Promise<void> {
  await prisma.agentMessage.create({
    data: {
      fromAgentId: fromTeamId,
      toAgentId: toTeamId,
      subject,
      content,
      context: JSON.stringify({ source: "team_communication", type: "workforce" }),
      priority,
      status: "unread",
    },
  });
}

export async function getTeamMessages(teamId: string): Promise<Array<{
  id: string;
  subject: string;
  content: string;
  fromTeamId: string;
  priority: string;
  status: string;
  createdAt: string;
}>> {
  const messages = await prisma.agentMessage.findMany({
    where: { toAgentId: teamId, status: { not: "archived" } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return messages.map(m => ({
    id: m.id,
    subject: m.subject,
    content: m.content,
    fromTeamId: m.fromAgentId,
    priority: m.priority,
    status: m.status,
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function markTeamMessagesRead(teamId: string): Promise<void> {
  await prisma.agentMessage.updateMany({
    where: { toAgentId: teamId, status: "unread" },
    data: { status: "read", readAt: new Date() },
  });
}
