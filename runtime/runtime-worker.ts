/**
 * MioOS Runtime Worker
 *
 * Runs as a standalone Node.js process separate from Next.js.
 * Handles: assignment queue, team objectives, handoff execution,
 * agent schedules, executive monitoring, and intelligence signals.
 *
 * Usage:
 *   npm run runtime          # start persistent worker
 *   npm run runtime:once     # run a single loop iteration and exit
 */

// Load .env.local (Next.js convention) before any other imports
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv(); // fallback to .env if .env.local doesn't cover everything

import { prisma } from "./db";
import { recordStartTime, recordHeartbeat } from "./runtime-health";
import { runRuntimeLoop } from "./runtime-loop";
import { installGlobalErrorGuards, safeTick } from "./error-guards";

const INTERVAL_MS = Number(process.env.RUNTIME_INTERVAL_MS ?? "60000");
const RUN_ONCE    = process.argv.includes("--once");

// ── Default Autonomy Config Per Department ────────────────────────────

const DEPT_DEFAULTS: Record<string, {
  canSelfInitiate: boolean;
  requiresApproval: boolean;
  approvalTriggers: string[];
  maxDailyRuns: number;
  objective: string;
  objectiveTitle: string;
  frequency: string;
}> = {
  research: {
    canSelfInitiate:  true,
    requiresApproval: false,
    approvalTriggers: [],
    maxDailyRuns:     3,
    objectiveTitle:   "Opportunity Discovery & Market Research",
    objective:        "Discover and research concrete business opportunities: automation services for small businesses, e-commerce products, SaaS ideas, or content niches. For each opportunity found, provide: niche/industry, specific pain point, solution approach, revenue potential, target customer, competitive landscape, and a GO/NO-GO recommendation. Focus on opportunities with clear revenue potential within 90 days.",
    frequency:        "daily",
  },
  sales: {
    canSelfInitiate:  true,
    requiresApproval: true,
    approvalTriggers: ["outreach"],
    maxDailyRuns:     2,
    objectiveTitle:   "Pipeline & Prospect Development",
    objective:        "Review active leads, identify stalled opportunities, and prepare outreach strategies. All outreach drafts require founder approval before sending.",
    frequency:        "daily",
  },
  marketing: {
    canSelfInitiate:  true,
    requiresApproval: true,
    approvalTriggers: ["campaign", "publishing"],
    maxDailyRuns:     2,
    objectiveTitle:   "Marketing Strategy & Campaigns",
    objective:        "Identify marketing opportunities and develop campaign strategies for active business initiatives. Campaign drafts require founder approval before launch.",
    frequency:        "daily",
  },
  content: {
    canSelfInitiate:  true,
    requiresApproval: true,
    approvalTriggers: ["publishing"],
    maxDailyRuns:     2,
    objectiveTitle:   "Content Production",
    objective:        "Create content strategies and draft content supporting active business initiatives. All content requires founder review before publishing.",
    frequency:        "daily",
  },
  operations: {
    canSelfInitiate:  true,
    requiresApproval: false,
    approvalTriggers: [],
    maxDailyRuns:     3,
    objectiveTitle:   "Execution & Process Improvement",
    objective:        "Monitor execution bottlenecks, overdue tasks, and blocked projects. Propose process improvements and escalate blockers that require founder attention.",
    frequency:        "daily",
  },
  support: {
    canSelfInitiate:  true,
    requiresApproval: false,
    approvalTriggers: [],
    maxDailyRuns:     3,
    objectiveTitle:   "Customer Support Intelligence",
    objective:        "Review open support issues, identify recurring patterns, and create resolution strategies. Escalate critical issues immediately.",
    frequency:        "daily",
  },
  development: {
    canSelfInitiate:  true,
    requiresApproval: true,
    approvalTriggers: ["deployment"],
    maxDailyRuns:     2,
    objectiveTitle:   "Technical Development & Architecture",
    objective:        "Review active technical projects, identify implementation blockers, and create technical specifications. Deployment decisions require founder approval.",
    frequency:        "daily",
  },
  executive: {
    canSelfInitiate:  true,
    requiresApproval: false,
    approvalTriggers: [],
    maxDailyRuns:     2,
    objectiveTitle:   "Strategic Business Overview",
    objective:        "Monitor overall business health, surface critical decisions requiring founder attention, and generate strategic recommendations across all domains.",
    frequency:        "daily",
  },
  commerce: {
    canSelfInitiate:  true,
    requiresApproval: true,
    approvalTriggers: ["outreach", "campaign"],
    maxDailyRuns:     2,
    objectiveTitle:   "Revenue Opportunity Discovery",
    objective:        "Identify and evaluate digital revenue opportunities including products, services, affiliate programs, and partnerships. Outreach requires founder approval.",
    frequency:        "daily",
  },
};

// ── Crash Recovery ────────────────────────────────────────────────────

// On startup, reset items left in inconsistent states by a previous crash.
// Without this:
//  - Queue items stuck in "running" block forever (dequeueNext checks lockedAt: null)
//  - Assignments stuck in "active" get re-executed but executor skips them,
//    so their queue items loop forever without making progress
async function recoverStuckQueue(): Promise<void> {
  const [queueResult, assignmentResult] = await Promise.all([
    prisma.runtimeQueue.updateMany({
      where: { status: "running" },
      data:  { status: "queued", lockedAt: null },
    }),
    // Reset assignments left "active" by a crash — they'll be re-executed cleanly
    prisma.assignment.updateMany({
      where: { status: "active" },
      data:  { status: "pending" },
    }),
  ]);

  if (queueResult.count > 0)
    console.log(`[worker] Recovered ${queueResult.count} stuck queue item(s) from previous crash`);
  if (assignmentResult.count > 0)
    console.log(`[worker] Reset ${assignmentResult.count} assignment(s) from active → pending`);
}

// ── Automation Rule Bootstrap ─────────────────────────────────────────
//
// Governance depends on AutomationRule records existing. This function
// idempotently creates any missing required rules on every startup.
// It is the safety net for fresh deployments where seed may not have run,
// or for rules that were accidentally deleted.

const REQUIRED_RULES = [
  {
    name: "Research → Sales Handoff",
    trigger: "assignment_completed",
    condition: JSON.stringify({ departmentType: "research" }),
    action: "create_handoff",
    actionConfig: JSON.stringify({
      toTeamType:  "sales",
      title:       "Qualify leads from: {title}",
      description: "Research team has completed '{title}'. Sales team to review findings and build outreach list.",
      priority:    "medium",
    }),
  },
  {
    name: "Sales Outreach → Founder Approval",
    trigger: "assignment_completed",
    condition: JSON.stringify({ departmentType: "sales" }),
    action: "create_approval",
    actionConfig: JSON.stringify({
      title:        "Approve outreach: {title}",
      description:  "Sales team has prepared outreach for '{title}'. Review before sending.",
      priority:     "high",
      decisionType: "approve_outreach",
    }),
  },
  {
    name: "Marketing Campaign → Founder Approval",
    trigger: "assignment_completed",
    condition: JSON.stringify({ departmentType: "marketing" }),
    action: "create_approval",
    actionConfig: JSON.stringify({
      title:        "Approve campaign: {title}",
      description:  "Marketing team has prepared a campaign for '{title}'. Review before launch.",
      priority:     "high",
      decisionType: "approve_campaign",
    }),
  },
  {
    name: "Content → Founder Approval",
    trigger: "assignment_completed",
    condition: JSON.stringify({ departmentType: "content" }),
    action: "create_approval",
    actionConfig: JSON.stringify({
      title:        "Approve content: {title}",
      description:  "Content team has prepared '{title}'. Review before publishing.",
      priority:     "medium",
      decisionType: "approve_content",
    }),
  },
  {
    name: "Development → Operations Handoff",
    trigger: "assignment_completed",
    condition: JSON.stringify({ departmentType: "development" }),
    action: "create_handoff",
    actionConfig: JSON.stringify({
      toTeamType:  "operations",
      title:       "Deploy and monitor: {title}",
      description: "Development has completed '{title}'. Operations to handle deployment and monitoring.",
      priority:    "medium",
    }),
  },
  {
    name: "Commerce Validation → Founder Approval",
    trigger: "assignment_completed",
    condition: JSON.stringify({ departmentType: "commerce" }),
    action: "create_approval",
    actionConfig: JSON.stringify({
      title:        "Review product opportunity: {title}",
      description:  "Commerce team has validated '{title}'. Review findings before proceeding.",
      priority:     "medium",
      decisionType: "approve_product",
    }),
  },
  {
    name: "Support → Development Handoff",
    trigger: "assignment_completed",
    condition: JSON.stringify({ departmentType: "support" }),
    action: "create_handoff",
    actionConfig: JSON.stringify({
      toTeamType:  "development",
      title:       "Technical fix required: {title}",
      description: "Support team identified a technical issue in '{title}'. Development to investigate and resolve.",
      priority:    "medium",
    }),
  },
  {
    name: "Operations → Executive Handoff",
    trigger: "assignment_completed",
    condition: JSON.stringify({ departmentType: "operations" }),
    action: "create_handoff",
    actionConfig: JSON.stringify({
      toTeamType:  "executive",
      title:       "Operational insight: {title}",
      description: "Operations team has completed '{title}'. Executive to review for strategic implications.",
      priority:    "low",
    }),
  },
] as const;

async function ensureAutomationRules(): Promise<void> {
  for (const rule of REQUIRED_RULES) {
    const existing = await prisma.automationRule.findFirst({ where: { name: rule.name } });
    if (!existing) {
      await prisma.automationRule.create({ data: { ...rule, active: true } });
      console.log(`[init] Created automation rule: ${rule.name}`);
    }
  }
}

// ── Initialization ────────────────────────────────────────────────────

async function initializeAutonomyConfigs(): Promise<void> {
  const teams = await prisma.workforceTeam.findMany({
    where:   { status: "active" },
    include: { autonomyConfig: true, objectives: { where: { active: true }, take: 1 } },
  });

  for (const team of teams) {
    const dept     = team.departmentType.toLowerCase();
    const defaults = DEPT_DEFAULTS[dept];
    if (!defaults) continue;

    // Create autonomy config if missing
    if (!team.autonomyConfig) {
      await prisma.autonomyConfig.create({
        data: {
          teamId:           team.id,
          canSelfInitiate:  defaults.canSelfInitiate,
          requiresApproval: defaults.requiresApproval,
          approvalTriggers: JSON.stringify(defaults.approvalTriggers),
          maxDailyRuns:     defaults.maxDailyRuns,
        },
      });
      console.log(`[init] Created autonomy config for: ${team.name}`);
    }

    // Create default objective if none exist
    if (team.objectives.length === 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      await prisma.teamObjective.create({
        data: {
          teamId:      team.id,
          title:       defaults.objectiveTitle,
          description: defaults.objective,
          frequency:   defaults.frequency,
          active:      true,
          nextRunAt:   tomorrow,
        },
      });
      console.log(`[init] Created objective for: ${team.name}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(" MioOS Runtime Worker");
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Mode:     ${RUN_ONCE ? "single tick" : `persistent (${INTERVAL_MS / 1000}s interval)`}`);
  console.log(`Database: ${process.env.DATABASE_URL ?? "(not set)"}`);
  console.log(`AI:       ${process.env.ANTHROPIC_API_KEY ? "Claude (configured)" : process.env.OPENAI_API_KEY ? "OpenAI (configured)" : "Template mode (no key)"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  installGlobalErrorGuards();

  await recordStartTime();
  await recordHeartbeat();
  await recoverStuckQueue();
  await initializeAutonomyConfigs();
  await ensureAutomationRules();

  if (RUN_ONCE) {
    console.log("[worker] Running single loop iteration…");
    await safeTick("single", runRuntimeLoop);
    console.log("[worker] Done.");
    await prisma.$disconnect();
    process.exit(0);
    return;
  }

  // First tick immediately
  await safeTick("startup", runRuntimeLoop);

  // Then on interval — a failed tick is recorded but never stops the loop
  const interval = setInterval(() => {
    void safeTick("interval", runRuntimeLoop);
  }, INTERVAL_MS);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[worker] ${signal} received — shutting down…`);
    clearInterval(interval);
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT",  () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  console.log(`[worker] Runtime active. Press Ctrl+C to stop.`);
}

main().catch(err => {
  console.error("[worker] Fatal error:", err);
  process.exit(1);
});
