import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  try {
    const today = startOfToday();

    const [
      pendingExecutions,
      executedToday,
      failedToday,
      workflowTriggersToday,
      scheduleRunsToday,
      memorySuggestionsPending,
    ] = await Promise.all([
      prisma.executionHistory.count({ where: { status: "pending" } }),
      prisma.executionHistory.count({ where: { status: "executed", executedAt: { gte: today } } }),
      prisma.executionHistory.count({ where: { status: "failed", executedAt: { gte: today } } }),
      prisma.workflowExecution.count({ where: { status: "executed", executedAt: { gte: today } } }),
      prisma.scheduleExecution.count({ where: { status: "success", completedAt: { gte: today } } }),
      prisma.memorySuggestion.count({ where: { status: "pending" } }),
    ]);

    return NextResponse.json({
      pendingExecutions,
      executedToday,
      failedToday,
      workflowTriggersToday,
      scheduleRunsToday,
      memorySuggestionsPending,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch execution overview" }, { status: 500 });
  }
}
