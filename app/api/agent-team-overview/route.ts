import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeWorkspaces, activeDelegations, unreadMessages, pendingResearch, completedDelegationsToday] =
      await Promise.all([
        prisma.agentWorkspace.count({ where: { status: "active" } }),
        prisma.agentDelegation.count({ where: { status: { in: ["pending", "accepted", "running"] } } }),
        prisma.agentMessage.count({ where: { status: "unread" } }),
        prisma.agentDelegation.count({ where: { status: "pending" } }),
        prisma.agentDelegation.count({
          where: { status: "completed", completedAt: { gte: today } },
        }),
      ]);

    return NextResponse.json({
      activeWorkspaces,
      activeDelegations,
      unreadMessages,
      pendingResearch,
      completedDelegationsToday,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch team overview" }, { status: 500 });
  }
}
