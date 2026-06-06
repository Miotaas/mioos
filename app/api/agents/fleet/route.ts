import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeHealthStatus, computeApprovalPressure, computeFleetHealthScore } from "@/lib/agentHealth";
import type { AgentHealthRecord } from "@/types";

export async function GET() {
  try {
    const [agents, pendingApprovals] = await Promise.all([
      prisma.agent.findMany({
        include: {
          runs: {
            orderBy: { createdAt: "desc" },
            select: { id: true, status: true, createdAt: true, completedAt: true, startedAt: true },
          },
          memories:       { select: { id: true } },
          agentTools:     { select: { id: true } },
          sourceWorkflows: { select: { id: true } },
          targetWorkflows: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.approvalQueue.findMany({
        where: { status: "pending" },
        include: { agentRun: { select: { agentId: true } } },
      }),
    ]);

    // Map pending approvals to agent IDs
    const pendingByAgent: Record<string, number> = {};
    for (const ap of pendingApprovals) {
      const agentId = ap.agentRun?.agentId;
      if (agentId) pendingByAgent[agentId] = (pendingByAgent[agentId] ?? 0) + 1;
    }

    const records: AgentHealthRecord[] = agents.map((agent) => {
      const runs = agent.runs;

      const totalRuns    = runs.length;
      const successCount = runs.filter(r => r.status === "completed").length;
      const failureCount = runs.filter(r => r.status === "failed").length;
      const runningCount = runs.filter(r => r.status === "running").length;

      const denom       = successCount + failureCount;
      const successRate = denom > 0 ? Math.round((successCount / denom) * 100) : 0;
      const failureRate = denom > 0 ? Math.round((failureCount / denom) * 100) : 0;

      const lastRun     = runs[0] ?? null;
      const lastSuccess = runs.find(r => r.status === "completed") ?? null;
      const lastFailure = runs.find(r => r.status === "failed")    ?? null;

      const toISO = (d: Date | null | undefined) => d ? new Date(d).toISOString() : null;

      const lastRunAt     = toISO(lastRun?.createdAt);
      const lastSuccessAt = toISO(lastSuccess?.completedAt ?? lastSuccess?.createdAt);
      const lastFailureAt = toISO(lastFailure?.completedAt ?? lastFailure?.createdAt);

      const pendingApprovalCount = pendingByAgent[agent.id] ?? 0;
      const memoryCount          = agent.memories.length;
      const toolCount            = agent.agentTools.length;
      const workflowCount        = agent.sourceWorkflows.length + agent.targetWorkflows.length;

      const healthStatus      = computeHealthStatus(agent.status, lastSuccessAt, lastRunAt, failureRate);
      const approvalPressure  = computeApprovalPressure(pendingApprovalCount);

      return {
        id:   agent.id,
        name: agent.name,
        slug: agent.slug,
        status:          agent.status   as AgentHealthRecord["status"],
        agentType:       agent.agentType as AgentHealthRecord["agentType"],
        requiresApproval: agent.requiresApproval,
        createdAt: new Date(agent.createdAt).toISOString(),
        updatedAt: new Date(agent.updatedAt).toISOString(),
        healthStatus,
        totalRuns,
        successCount,
        failureCount,
        runningCount,
        lastRunAt,
        lastSuccessAt,
        lastFailureAt,
        successRate,
        failureRate,
        pendingApprovalCount,
        memoryCount,
        toolCount,
        workflowCount,
        approvalPressure,
      };
    });

    const fleetHealthScore = computeFleetHealthScore(records);

    return NextResponse.json({
      agents: records,
      summary: {
        healthy:          records.filter(r => r.healthStatus === "healthy").length,
        warning:          records.filter(r => r.healthStatus === "warning").length,
        offline:          records.filter(r => r.healthStatus === "offline").length,
        total:            records.length,
        fleetHealthScore,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch fleet health" }, { status: 500 });
  }
}
