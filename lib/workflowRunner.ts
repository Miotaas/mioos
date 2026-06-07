import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/auditLog";

// Max chained executions to prevent infinite loops
const MAX_CHAIN_DEPTH = 5;

export async function triggerWorkflows(
  event: "completed_run" | "approved_action" | "manual",
  sourceAgentId: string,
  chainDepth = 0,
): Promise<void> {
  if (chainDepth >= MAX_CHAIN_DEPTH) {
    await auditLog("workflow", sourceAgentId, "workflow_chain_halted", {
      reason: `Max chain depth ${MAX_CHAIN_DEPTH} reached`,
      event,
      chainDepth,
    });
    return;
  }

  // Find all enabled workflows sourced from this agent with the matching trigger
  const workflows = await prisma.agentWorkflow.findMany({
    where: { sourceAgentId, triggerType: event, enabled: true },
  });

  if (workflows.length === 0) return;

  for (const wf of workflows) {
    // Validate target agent is active
    const targetAgent = await prisma.agent.findUnique({
      where: { id: wf.targetAgentId },
      select: { id: true, status: true, requiresApproval: true },
    });

    if (!targetAgent || targetAgent.status !== "active") {
      await prisma.workflowExecution.create({
        data: {
          workflowId: wf.id,
          sourceAgentId: wf.sourceAgentId,
          targetAgentId: wf.targetAgentId,
          triggerType: event,
          status: "blocked",
          reason: targetAgent ? `Target agent is ${targetAgent.status}` : "Target agent not found",
        },
      });
      await auditLog("workflow", wf.id, "workflow_blocked", {
        reason: targetAgent ? `agent status: ${targetAgent.status}` : "agent not found",
        targetAgentId: wf.targetAgentId,
      });
      continue;
    }

    // Create execution record
    const exec = await prisma.workflowExecution.create({
      data: {
        workflowId: wf.id,
        sourceAgentId: wf.sourceAgentId,
        targetAgentId: wf.targetAgentId,
        triggerType: event,
        status: "pending",
      },
    });

    try {
      // Dynamic import breaks the circular dependency with agentEngine
      const { executeAgent } = await import("@/lib/agentEngine");
      await executeAgent(wf.targetAgentId);

      await prisma.workflowExecution.update({
        where: { id: exec.id },
        data: { status: "executed", executedAt: new Date() },
      });

      await auditLog("workflow", wf.id, "workflow_executed", {
        sourceAgentId: wf.sourceAgentId,
        targetAgentId: wf.targetAgentId,
        triggerType: event,
        chainDepth,
      });

      // Chain: trigger completed_run workflows for the target agent
      await triggerWorkflows("completed_run", wf.targetAgentId, chainDepth + 1);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Unknown error";
      await prisma.workflowExecution.update({
        where: { id: exec.id },
        data: { status: "failed", reason, executedAt: new Date() },
      });
      await auditLog("workflow", wf.id, "workflow_failed", {
        error: reason,
        targetAgentId: wf.targetAgentId,
        chainDepth,
      });
    }
  }
}
