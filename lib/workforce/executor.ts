import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/auditLog";
import { generateOutputContent, resolveOutputType } from "./output-generator";
import { runHandoffEngine } from "./handoff-engine";
import { getTeamMemory, formatTeamMemoryForContext } from "./team-memory";
import { isInternalRequest, buildInternalContextPack } from "@/lib/intelligence/internal-context";
import type { AssignmentExecutionResult, Assignment, WorkforceOutput } from "@/types";

/**
 * Executes a workforce assignment through its full lifecycle:
 * PENDING → ACTIVE → (output generated) → (rules evaluated) → COMPLETED or REVIEW
 *
 * This is synchronous — runs entirely in the API call.
 * Returns the full result including created output, handoff count, and approval count.
 */
export async function executeAssignment(assignmentId: string): Promise<AssignmentExecutionResult> {
  const logs: string[] = [];

  // Load assignment with team
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      team: { select: { id: true, name: true, slug: true, departmentType: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!assignment) throw new Error(`Assignment ${assignmentId} not found`);
  if (["completed", "archived"].includes(assignment.status)) {
    throw new Error(`Assignment ${assignmentId} is already ${assignment.status}`);
  }

  const team = assignment.team;
  const departmentType = team.departmentType ?? "custom";

  // ── 1. Mark assignment as active ─────────────────────────────────

  await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      status:    "active",
      startedAt: assignment.startedAt ?? new Date(),
    },
  });

  await auditLog("assignment", assignmentId, "assignment_started", {
    team: team.name,
    title: assignment.title,
  });

  logs.push(`Assignment started by ${team.name}`);

  // ── 2. Generate output content ────────────────────────────────────

  const outputType = resolveOutputType(departmentType);
  let outputContent: string;

  // Assemble team memory for richer context
  let memoryContext: string | undefined;
  try {
    const memory = await getTeamMemory(team.id);
    memoryContext = formatTeamMemoryForContext(memory) || undefined;
  } catch { /* non-fatal — proceed without memory */ }

  // Detect internal requests (about the founder's own MioOS data) and inject live context
  let internalContext: string | undefined;
  const requestText = `${assignment.title} ${assignment.description ?? ""}`;
  if (isInternalRequest(requestText)) {
    try {
      internalContext = await buildInternalContextPack();
    } catch { /* non-fatal — fall back to standard prompt */ }
  }

  try {
    outputContent = await generateOutputContent({
      title:          assignment.title,
      description:    assignment.description,
      departmentType,
      teamName:       team.name,
      priority:       assignment.priority,
      memoryContext,
      internalContext,
    });
    logs.push(`Output generated (${outputType})`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logs.push(`Output generation failed: ${msg}`);
    outputContent = `# ${assignment.title}\n\n*Output generation encountered an error. Please review manually.*\n\nError: ${msg}`;
  }

  // ── 3. Save WorkforceOutput ───────────────────────────────────────

  const output = await prisma.workforceOutput.create({
    data: {
      teamId:      team.id,
      title:       assignment.title,
      description: outputContent.slice(0, 300), // Short preview for lists
      content:     outputContent,               // Full markdown content
      outputType,
      status:      "draft",
      projectId:   assignment.projectId ?? null,
      goalId:      assignment.goalId ?? null,
      revenueEntryId: assignment.revenueEntryId ?? null,
    },
    include: { team: { select: { id: true, name: true, slug: true, departmentType: true } } },
  });

  await auditLog("workforce_output", output.id, "output_created", {
    assignmentId,
    outputType,
    team: team.name,
  });

  logs.push(`Output saved: ${output.id}`);

  // Post a system message to the assignment thread
  await prisma.assignmentMessage.create({
    data: {
      assignmentId,
      senderType: "system",
      content:    `✓ Output generated (${outputType.replace(/_/g, " ")}). ID: ${output.id}`,
    },
  });

  // ── 4. Evaluate automation rules ─────────────────────────────────

  const { handoffsCreated, approvalsCreated } = await runHandoffEngine({
    assignmentId,
    teamId:         team.id,
    departmentType,
    outputType,
    outputId:       output.id,
    priority:       assignment.priority,
    title:          assignment.title,
  });

  if (handoffsCreated > 0) logs.push(`${handoffsCreated} handoff(s) created`);
  if (approvalsCreated > 0) logs.push(`${approvalsCreated} approval(s) created`);

  // ── 5. Governance safety net ──────────────────────────────────────
  //
  // If requiresApproval=true on this team's AutonomyConfig but no AutomationRule
  // created an approval, create one here as a fallback. This ensures governance
  // holds even if automation rules were deleted or never seeded.
  let totalApprovals = approvalsCreated;
  if (approvalsCreated === 0) {
    const autonomyConfig = await prisma.autonomyConfig.findUnique({
      where: { teamId: team.id },
    }).catch(() => null);

    if (autonomyConfig?.requiresApproval) {
      await prisma.approval.create({
        data: {
          title:           `Review required: ${assignment.title}`,
          description:     `${team.name} completed an assignment that requires founder approval: "${assignment.title}"`,
          reason:          "Team AutonomyConfig.requiresApproval=true — governance fallback (no matching AutomationRule)",
          status:          "pending",
          sourceTeamId:    team.id,
          relatedOutputId: output.id,
          priority:        assignment.priority === "urgent" ? "urgent" : "high",
          decisionType:    "founder_decision",
        },
      });
      await auditLog("assignment", assignmentId, "approval_requested", {
        team:   team.name,
        reason: "governance_fallback",
      });
      totalApprovals++;
      logs.push("Approval created (governance fallback — requiresApproval=true)");
    }
  }

  // ── 6. Determine final status ─────────────────────────────────────

  // If approvals were created, the assignment moves to "review" so the founder can see it.
  // Otherwise it goes straight to "completed".
  const finalStatus = totalApprovals > 0 ? "review" : "completed";
  const now = new Date();

  const finalAssignment = await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      status:      finalStatus,
      completedAt: finalStatus === "completed" ? now : null,
    },
    include: {
      team: { select: { id: true, name: true, slug: true, departmentType: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  await auditLog("assignment", assignmentId, "assignment_completed", {
    finalStatus,
    outputId:  output.id,
    handoffs:  handoffsCreated,
    approvals: totalApprovals,
  });

  logs.push(`Assignment ${finalStatus}`);

  // Serialize Dates to ISO strings; cast Prisma string fields to union types via unknown
  const serializedAssignment = {
    ...finalAssignment,
    createdAt:   finalAssignment.createdAt.toISOString(),
    startedAt:   finalAssignment.startedAt?.toISOString() ?? null,
    completedAt: finalAssignment.completedAt?.toISOString() ?? null,
    updatedAt:   finalAssignment.updatedAt.toISOString(),
  } as unknown as Assignment;

  const serializedOutput = {
    ...output,
    createdAt:   output.createdAt.toISOString(),
    updatedAt:   output.updatedAt.toISOString(),
    reviewedAt:  null,
    approvedAt:  null,
    completedAt: null,
    ownerTeamId: null,
  } as unknown as WorkforceOutput;

  return {
    assignment:      serializedAssignment,
    output:          serializedOutput,
    handoffsCreated,
    approvalsCreated: totalApprovals,
    logs,
  };
}
