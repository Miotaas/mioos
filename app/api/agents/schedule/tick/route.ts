import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeAgent } from "@/lib/agentEngine";

// Called by the Schedules UI on mount to trigger any due agent runs.
// No external cron required — runs on-demand when the user visits Schedules.
export async function POST() {
  try {
    const now = new Date();
    const due = await prisma.agentSchedule.findMany({
      where: { enabled: true, frequency: { not: "manual" }, nextRunAt: { lte: now } },
      include: { agent: { select: { id: true, status: true } } },
    });

    const triggered: string[] = [];
    for (const s of due) {
      if (s.agent.status !== "active") continue;
      try {
        const runId = await executeAgent(s.agentId);
        triggered.push(runId);
      } catch {
        // continue with remaining schedules
      }
    }

    return NextResponse.json({ triggered, count: triggered.length });
  } catch {
    return NextResponse.json({ error: "Scheduler tick failed" }, { status: 500 });
  }
}
