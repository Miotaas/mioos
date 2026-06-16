import { prisma } from "./db";
import { recordHeartbeat, incrementLoopCount } from "./runtime-health";
import { processQueue } from "./runtime-queue";
import { runAlertChecks } from "../lib/alerting/alert-manager";
import { processApprovalTriage } from "../lib/governance/approval-triage";

// How often (in hours) the executive monitor runs — default 4
const EXECUTIVE_INTERVAL_H = Number(process.env.RUNTIME_EXECUTIVE_INTERVAL_HOURS ?? "4");
const KEY_EXEC_LAST_RUN    = "runtime:lastExecutiveRun";

// ── Executive Monitor ─────────────────────────────────────────────────

async function runExecutiveMonitor(): Promise<void> {
  const execTeam = await prisma.workforceTeam.findFirst({
    where: { departmentType: "executive", status: "active" },
    include: { autonomyConfig: true },
  });

  if (!execTeam?.autonomyConfig?.canSelfInitiate) return;

  const now = new Date();
  const [stalledProjects, stalledGoals, pendingApprovals] = await Promise.all([
    prisma.project.findMany({
      where:  { status: "blocked" },
      take:   3,
      select: { name: true, blocker: true },
    }),
    prisma.goal.findMany({
      where:  { status: "active", progress: { lt: 30 } },
      take:   3,
      select: { title: true, progress: true },
    }),
    prisma.approval.count({ where: { status: "pending" } }),
  ]);

  const issues: string[] = [];
  if (stalledProjects.length > 0)
    issues.push(`${stalledProjects.length} blocked project(s): ${stalledProjects.map(p => p.name).join(", ")}`);
  if (stalledGoals.length > 0)
    issues.push(`${stalledGoals.length} goal(s) below 30% progress`);
  if (pendingApprovals > 0)
    issues.push(`${pendingApprovals} approval(s) awaiting founder decision`);

  if (issues.length === 0) return;

  const title       = `Executive Review: ${issues[0]}`;
  const description = `Automated executive monitoring — ${now.toISOString()}\n\nIssues detected:\n${issues.map(i => `• ${i}`).join("\n")}`;

  const assignment = await prisma.assignment.create({
    data: { title, description, teamId: execTeam.id, priority: "high", status: "pending" },
  });

  await prisma.runtimeQueue.create({
    data: {
      teamId:       execTeam.id,
      assignmentId: assignment.id,
      title,
      description,
      priority: "high",
      source:   "executive",
      status:   "queued",
    },
  });

  console.log(`[exec] Created executive review assignment: ${title.slice(0, 60)}`);
}

async function maybeRunExecutiveMonitor(): Promise<void> {
  // Check DB-persisted last run time so restart doesn't re-trigger immediately
  const lastRunRec = await prisma.runtimeState.findUnique({ where: { key: KEY_EXEC_LAST_RUN } }).catch(() => null);
  if (lastRunRec) {
    const hoursSince = (Date.now() - new Date(lastRunRec.value).getTime()) / 3_600_000;
    if (hoursSince < EXECUTIVE_INTERVAL_H) return;
  }

  // Write timestamp before running so concurrent loops don't double-fire
  await prisma.runtimeState.upsert({
    where:  { key: KEY_EXEC_LAST_RUN },
    create: { key: KEY_EXEC_LAST_RUN, value: new Date().toISOString() },
    update: { value: new Date().toISOString() },
  }).catch(() => {});

  try {
    await runExecutiveMonitor();
  } catch (err) {
    console.error("[exec] Executive monitor failed:", err);
  }
}

// ── Schedule Runner (existing agent schedules) ────────────────────────

async function runAgentSchedules(): Promise<void> {
  try {
    const { runDueSchedules } = await import("../lib/scheduleRunner");
    const result = await runDueSchedules();
    if (result.triggered > 0) {
      console.log(`[schedules] Triggered ${result.triggered}, skipped ${result.skipped}, failed ${result.failed}`);
    }
  } catch (err) {
    console.error("[schedules] Failed:", err);
  }
}

// ── Handoff Executor ──────────────────────────────────────────────────

async function runHandoffExecutor(): Promise<void> {
  try {
    const { processPendingHandoffs } = await import("../lib/workforce/handoff-executor");
    const result = await processPendingHandoffs();
    if (result.processed > 0) {
      console.log(`[handoffs] Auto-accepted ${result.processed} handoff(s)`);
    }
  } catch (err) {
    console.error("[handoffs] Failed:", err);
  }
}

// ── Objective Evaluator ───────────────────────────────────────────────

async function runObjectiveEvaluator(): Promise<void> {
  try {
    const { evaluateObjectives } = await import("../lib/workforce/objective-evaluator");
    const result = await evaluateObjectives();
    if (result.created > 0) {
      console.log(`[objectives] Created ${result.created} autonomous assignment(s)`);
    }
  } catch (err) {
    console.error("[objectives] Failed:", err);
  }
}

// ── Intelligence Signals ──────────────────────────────────────────────

async function runSignalCollection(): Promise<void> {
  try {
    const {
      fetchAllSignals,
      createInternalSignalSource,
      registerSource,
    } = await import("../lib/intelligence/source-manager");

    // Internal signals (always registered)
    registerSource(createInternalSignalSource());

    // External signals (only if configured)
    const { createWebSignalSource }      = await import("../lib/intelligence/web-signal-source");
    const { createCalendarSignalSource } = await import("../lib/intelligence/calendar-signal-source");
    const { createEmailSignalSource }    = await import("../lib/intelligence/email-signal-source");

    registerSource(createWebSignalSource());
    registerSource(createCalendarSignalSource());
    registerSource(createEmailSignalSource());

    const { fetched } = await fetchAllSignals();
    if (fetched > 0) console.log(`[signals] Collected ${fetched} intelligence signal(s)`);

    const { processUnprocessedSignals } = await import("../lib/intelligence/signal-processor");
    await processUnprocessedSignals();
  } catch (err) {
    console.error("[signals] Failed:", err);
  }
}

// ── Approval Triage ───────────────────────────────────────────────────

async function runApprovalTriage(): Promise<void> {
  try {
    const result = await processApprovalTriage();
    if (result.autoApproved > 0)
      console.log(`[triage] Auto-approved ${result.autoApproved} low-risk approval(s)`);
    if (result.escalated > 0)
      console.log(`[triage] Escalated ${result.escalated} stale high-risk approval(s)`);
  } catch (err) {
    console.error("[triage] Approval triage failed:", err);
  }
}

// ── Alert Checks ──────────────────────────────────────────────────────

async function runAlerts(): Promise<void> {
  try {
    await runAlertChecks();
  } catch (err) {
    console.error("[alerts] Alert check failed:", err);
  }
}

// ── Capital Allocator ─────────────────────────────────────────────────

const KEY_LAST_ALLOCATION   = "runtime:lastCapitalAllocation";
const ALLOCATION_INTERVAL_H = Number(process.env.ALLOCATION_INTERVAL_H ?? "12");

async function maybeRunCapitalAllocation(): Promise<void> {
  const lastRunRec = await prisma.runtimeState.findUnique({ where: { key: KEY_LAST_ALLOCATION } }).catch(() => null);
  if (lastRunRec) {
    const hoursSince = (Date.now() - new Date(lastRunRec.value as string).getTime()) / 3_600_000;
    if (hoursSince < ALLOCATION_INTERVAL_H) return;
  }

  await prisma.runtimeState.upsert({
    where:  { key: KEY_LAST_ALLOCATION },
    create: { key: KEY_LAST_ALLOCATION, value: new Date().toISOString() },
    update: { value: new Date().toISOString() },
  }).catch(() => {});

  try {
    const { runCapitalAllocation } = await import("../lib/company/capital-allocator");
    const { allocationPlan } = await runCapitalAllocation();
    if (allocationPlan.length > 0) {
      console.log(`[allocator] Updated allocation for ${allocationPlan.length} opportunities — top: "${allocationPlan[0]?.title ?? "none"}"`);
    }
  } catch (err) {
    console.error("[allocator] Capital allocation failed:", err);
  }
}

// ── Autonomous Research Engine ─────────────────────────────────────────

const KEY_LAST_RESEARCH   = "runtime:lastAutonomousResearch";
const RESEARCH_INTERVAL_H = Number(process.env.RESEARCH_INTERVAL_H ?? "6");

async function maybeRunAutonomousResearch(): Promise<void> {
  const lastRunRec = await prisma.runtimeState.findUnique({ where: { key: KEY_LAST_RESEARCH } }).catch(() => null);
  if (lastRunRec) {
    const hoursSince = (Date.now() - new Date(lastRunRec.value as string).getTime()) / 3_600_000;
    if (hoursSince < RESEARCH_INTERVAL_H) return;
  }

  await prisma.runtimeState.upsert({
    where:  { key: KEY_LAST_RESEARCH },
    create: { key: KEY_LAST_RESEARCH, value: new Date().toISOString() },
    update: { value: new Date().toISOString() },
  }).catch(() => {});

  try {
    const { runAutonomousResearch } = await import("../lib/company/research-engine");
    const result = await runAutonomousResearch();
    if (result.tasksCreated > 0) {
      console.log(`[research-engine] Created ${result.tasksCreated} autonomous discovery task(s)`);
    }
  } catch (err) {
    console.error("[research-engine] Autonomous research failed:", err);
  }
}

// ── Opportunity Extractor ──────────────────────────────────────────────
// Scans recent research outputs and extracts opportunities from unprocessed ones

async function runOpportunityExtractor(): Promise<void> {
  try {
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000); // last 48h

    // Get recent research outputs
    const researchOutputs = await prisma.workforceOutput.findMany({
      where: {
        outputType: "research",
        createdAt:  { gte: since },
        content:    { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    if (researchOutputs.length === 0) return;

    const { extractOpportunitiesFromOutput } = await import("../lib/opportunity-engine");
    let extracted = 0;

    for (const output of researchOutputs) {
      // Skip if opportunities already extracted from this output
      const existing = await prisma.opportunity.count({ where: { sourceOutputId: output.id } });
      if (existing > 0) continue;
      if (!output.content) continue;

      const count = await extractOpportunitiesFromOutput({
        id:        output.id,
        title:     output.title,
        content:   output.content,
        goalId:    output.goalId,
        projectId: output.projectId,
      });
      extracted += count;
    }

    if (extracted > 0) {
      console.log(`[opportunities] Extracted ${extracted} opportunit(ies) from research outputs`);
    }
  } catch (err) {
    console.error("[opportunities] Extractor failed:", err);
  }
}

// ── Opportunity Router ─────────────────────────────────────────────────

async function runOpportunityRouter(): Promise<void> {
  try {
    const { processDiscoveredOpportunities } = await import("../lib/opportunity-engine");
    const result = await processDiscoveredOpportunities();
    if (result.routed > 0) {
      console.log(`[opportunities] Routed ${result.routed}/${result.processed} discovered opportunit(ies) to workflows`);
    }
  } catch (err) {
    console.error("[opportunities] Router failed:", err);
  }
}

// ── Executive Orchestrator ─────────────────────────────────────────────

async function maybeRunExecutiveOrchestrator(): Promise<void> {
  const {
    KEY_LAST_ORCHESTRATION,
    ORCHESTRATION_INTERVAL_H,
  } = await import("../lib/executive-orchestrator");

  const lastRunRec = await prisma.runtimeState.findUnique({ where: { key: KEY_LAST_ORCHESTRATION } }).catch(() => null);
  if (lastRunRec) {
    const hoursSince = (Date.now() - new Date(lastRunRec.value).getTime()) / 3_600_000;
    if (hoursSince < ORCHESTRATION_INTERVAL_H) return;
  }

  await prisma.runtimeState.upsert({
    where:  { key: KEY_LAST_ORCHESTRATION },
    create: { key: KEY_LAST_ORCHESTRATION, value: new Date().toISOString() },
    update: { value: new Date().toISOString() },
  }).catch(() => {});

  try {
    const { runExecutiveOrchestrator } = await import("../lib/executive-orchestrator");
    const result = await runExecutiveOrchestrator();
    if (result.acted) {
      console.log(`[orchestrator] Daily review: ${result.summary}`);
    } else {
      console.log(`[orchestrator] Daily review complete — ${result.summary}`);
    }
  } catch (err) {
    console.error("[orchestrator] Executive orchestrator failed:", err);
  }
}

// ── Autonomous Conditions ──────────────────────────────────────────────

const KEY_LAST_CONDITIONS     = "runtime:lastConditionCheck";
const CONDITIONS_INTERVAL_H   = 12; // check every 12 hours

async function maybeRunAutonomousConditions(): Promise<void> {
  const lastRunRec = await prisma.runtimeState.findUnique({ where: { key: KEY_LAST_CONDITIONS } }).catch(() => null);
  if (lastRunRec) {
    const hoursSince = (Date.now() - new Date(lastRunRec.value).getTime()) / 3_600_000;
    if (hoursSince < CONDITIONS_INTERVAL_H) return;
  }

  await prisma.runtimeState.upsert({
    where:  { key: KEY_LAST_CONDITIONS },
    create: { key: KEY_LAST_CONDITIONS, value: new Date().toISOString() },
    update: { value: new Date().toISOString() },
  }).catch(() => {});

  try {
    const { checkAutonomousConditions } = await import("../lib/autonomous-conditions");
    const result = await checkAutonomousConditions();
    if (result.assignmentsCreated > 0) {
      console.log(`[conditions] Created ${result.assignmentsCreated} autonomous assignment(s): ${result.results.map(r => r.condition).join(", ")}`);
    }
  } catch (err) {
    console.error("[conditions] Autonomous conditions check failed:", err);
  }
}

// ── Main Loop ─────────────────────────────────────────────────────────

export async function runRuntimeLoop(): Promise<void> {
  const start = Date.now();

  try {
    await recordHeartbeat();
    await incrementLoopCount();

    // 1. Process existing assignment queue
    const queueResult = await processQueue().catch(e => { console.error("[loop] Queue failed:", e); return { processed: 0, failed: 0 }; });

    // 2. Run due agent schedules
    await runAgentSchedules();

    // 3. Auto-accept pending handoffs
    await runHandoffExecutor();

    // 4. Evaluate team objectives → create new assignments
    await runObjectiveEvaluator();

    // 5. Executive monitoring (every N hours, persisted across restarts)
    await maybeRunExecutiveMonitor();

    // 6. Collect and process intelligence signals (internal + external)
    await runSignalCollection();

    // 7. Approval triage — score risk, auto-approve safe internal approvals
    await runApprovalTriage();

    // 8. Send operational alerts if any critical conditions exist
    await runAlerts();

    // 9. Autonomous research — ensure Research team always has discovery tasks
    await maybeRunAutonomousResearch();

    // 10. Extract opportunities from recent research outputs
    await runOpportunityExtractor();

    // 11. Route newly discovered opportunities to sequential pipeline chains
    await runOpportunityRouter();

    // 12. Check autonomous conditions (revenue gap, ecommerce goals, stalled projects)
    await maybeRunAutonomousConditions();

    // 13. Capital allocator — score ROI, update team focus, recommend effort distribution
    await maybeRunCapitalAllocation();

    // 14. Executive orchestrator — daily portfolio review, auto-reject weak opps, promote strong ones
    await maybeRunExecutiveOrchestrator();

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[loop] Tick complete in ${elapsed}s | queue: +${queueResult.processed} done, ${queueResult.failed} failed`);
  } catch (err) {
    console.error("[loop] Unhandled error:", err);
  }
}
