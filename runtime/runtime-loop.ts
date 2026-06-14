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

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[loop] Tick complete in ${elapsed}s | queue: +${queueResult.processed} done, ${queueResult.failed} failed`);
  } catch (err) {
    console.error("[loop] Unhandled error:", err);
  }
}
