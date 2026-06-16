import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/auditLog";

export type FocusMode = "conservative" | "normal" | "aggressive";

export interface ThrottleLimits {
  maxDailyOpportunitiesTotal: number;
  maxDailyOpportunitiesByType: Record<string, number>;
  maxDailyWorkflowsRouted: number;
  maxPendingApprovals: number;
  maxActiveOpportunities: number;
  maxActivePipelineProjects: number;
}

const LIMITS: Record<FocusMode, ThrottleLimits> = {
  conservative: {
    maxDailyOpportunitiesTotal:  3,
    maxDailyOpportunitiesByType: { automation_service: 1, ecommerce_product: 1 },
    maxDailyWorkflowsRouted:     2,
    maxPendingApprovals:         5,
    maxActiveOpportunities:      10,
    maxActivePipelineProjects:   3,
  },
  normal: {
    maxDailyOpportunitiesTotal:  8,
    maxDailyOpportunitiesByType: { automation_service: 3, ecommerce_product: 3 },
    maxDailyWorkflowsRouted:     5,
    maxPendingApprovals:         15,
    maxActiveOpportunities:      25,
    maxActivePipelineProjects:   10,
  },
  aggressive: {
    maxDailyOpportunitiesTotal:  20,
    maxDailyOpportunitiesByType: { automation_service: 10, ecommerce_product: 10 },
    maxDailyWorkflowsRouted:     15,
    maxPendingApprovals:         30,
    maxActiveOpportunities:      50,
    maxActivePipelineProjects:   20,
  },
};

const CFG_FOCUS_MODE   = "founder:focus_mode";
const STATE_LAST_PAUSE = "throttle:lastPauseReason";

export async function getFounderFocusMode(): Promise<FocusMode> {
  try {
    const rec = await prisma.systemConfig.findUnique({ where: { key: CFG_FOCUS_MODE } });
    if (rec?.value && rec.value in LIMITS) return rec.value as FocusMode;
  } catch {}
  return "conservative";
}

export async function setFounderFocusMode(mode: FocusMode): Promise<void> {
  await prisma.systemConfig.upsert({
    where:  { key: CFG_FOCUS_MODE },
    create: { key: CFG_FOCUS_MODE, value: mode },
    update: { value: mode },
  });
}

export async function getThrottleLimits(): Promise<ThrottleLimits> {
  const mode = await getFounderFocusMode();
  return LIMITS[mode];
}

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function recordPause(reason: string): Promise<void> {
  try {
    const value = JSON.stringify({ reason, at: new Date().toISOString() });
    await prisma.runtimeState.upsert({
      where:  { key: STATE_LAST_PAUSE },
      create: { key: STATE_LAST_PAUSE, value },
      update: { value },
    });
    await auditLog("system", "throttle", "autonomy_throttled", { reason });
  } catch {}
}

// Returns true if a new opportunity of this type can be created
export async function checkOpportunityCreationAllowed(opportunityType?: string): Promise<boolean> {
  const limits = await getThrottleLimits();
  const since  = todayStart();

  const dailyTotal = await prisma.opportunity.count({ where: { createdAt: { gte: since } } });
  if (dailyTotal >= limits.maxDailyOpportunitiesTotal) {
    await recordPause(`Daily opportunity limit reached (${dailyTotal}/${limits.maxDailyOpportunitiesTotal} today) — internal analysis continues, no new discovery work`);
    return false;
  }

  const activeTotal = await prisma.opportunity.count({
    where: { status: { notIn: ["rejected", "archived"] } },
  });
  if (activeTotal >= limits.maxActiveOpportunities) {
    await recordPause(`Active opportunity limit reached (${activeTotal}/${limits.maxActiveOpportunities}) — review and resolve existing opportunities first`);
    return false;
  }

  if (opportunityType) {
    const typeLimit = limits.maxDailyOpportunitiesByType[opportunityType];
    if (typeLimit !== undefined) {
      const typeCount = await prisma.opportunity.count({
        where: { opportunityType, createdAt: { gte: since } },
      });
      if (typeCount >= typeLimit) {
        await recordPause(`Daily ${opportunityType} cooldown active (${typeCount}/${typeLimit} created today)`);
        return false;
      }
    }
  }

  return true;
}

// Returns true if a discovered opportunity can be routed to a workflow pipeline
export async function checkWorkflowRoutingAllowed(): Promise<boolean> {
  const limits = await getThrottleLimits();
  const since  = todayStart();

  const pendingApprovals = await prisma.approval.count({ where: { status: "pending" } });
  if (pendingApprovals >= limits.maxPendingApprovals) {
    await recordPause(`Autonomy paused because approval queue is full (${pendingApprovals}/${limits.maxPendingApprovals} pending). New external-facing work paused until founder reviews the queue.`);
    return false;
  }

  const dailyRouted = await prisma.opportunity.count({
    where: { workflowRoutedAt: { gte: since } },
  });
  if (dailyRouted >= limits.maxDailyWorkflowsRouted) {
    await recordPause(`Daily workflow limit reached (${dailyRouted}/${limits.maxDailyWorkflowsRouted} routed today) — remaining opportunities queued for tomorrow`);
    return false;
  }

  const activeProjects = await prisma.project.count({
    where: { autoCreated: true, status: { in: ["active", "paused"] } },
  });
  if (activeProjects >= limits.maxActivePipelineProjects) {
    await recordPause(`Pipeline project limit reached (${activeProjects}/${limits.maxActivePipelineProjects} active) — complete or archive existing pipeline projects to unlock capacity`);
    return false;
  }

  return true;
}

export async function getLastThrottlePause(): Promise<{ reason: string; at: string } | null> {
  try {
    const rec = await prisma.runtimeState.findUnique({ where: { key: STATE_LAST_PAUSE } });
    if (!rec) return null;
    return JSON.parse(rec.value) as { reason: string; at: string };
  } catch {
    return null;
  }
}

export interface ThrottleStatus {
  mode: FocusMode;
  limits: ThrottleLimits;
  current: {
    dailyOpportunitiesCreated: number;
    activeOpportunities: number;
    pendingApprovals: number;
    dailyWorkflowsRouted: number;
    activePipelineProjects: number;
  };
  breaches: string[];
  lastPauseReason: string | null;
}

export async function getThrottleStatus(): Promise<ThrottleStatus> {
  const [mode, limits] = await Promise.all([getFounderFocusMode(), getThrottleLimits()]);
  const since = todayStart();

  const [dailyOpps, activeOpps, pendingApprovals, dailyRouted, activeProjects, lastPause] = await Promise.all([
    prisma.opportunity.count({ where: { createdAt: { gte: since } } }),
    prisma.opportunity.count({ where: { status: { notIn: ["rejected", "archived"] } } }),
    prisma.approval.count({ where: { status: "pending" } }),
    prisma.opportunity.count({ where: { workflowRoutedAt: { gte: since } } }),
    prisma.project.count({ where: { autoCreated: true, status: { in: ["active", "paused"] } } }),
    getLastThrottlePause(),
  ]);

  const breaches: string[] = [];
  if (dailyOpps      >= limits.maxDailyOpportunitiesTotal)  breaches.push(`Daily opportunities: ${dailyOpps}/${limits.maxDailyOpportunitiesTotal}`);
  if (activeOpps     >= limits.maxActiveOpportunities)       breaches.push(`Active opportunities: ${activeOpps}/${limits.maxActiveOpportunities}`);
  if (pendingApprovals >= limits.maxPendingApprovals)        breaches.push(`Pending approvals: ${pendingApprovals}/${limits.maxPendingApprovals}`);
  if (dailyRouted    >= limits.maxDailyWorkflowsRouted)      breaches.push(`Daily workflows routed: ${dailyRouted}/${limits.maxDailyWorkflowsRouted}`);
  if (activeProjects >= limits.maxActivePipelineProjects)    breaches.push(`Pipeline projects: ${activeProjects}/${limits.maxActivePipelineProjects}`);

  return {
    mode,
    limits,
    current: {
      dailyOpportunitiesCreated: dailyOpps,
      activeOpportunities:       activeOpps,
      pendingApprovals,
      dailyWorkflowsRouted:      dailyRouted,
      activePipelineProjects:    activeProjects,
    },
    breaches,
    lastPauseReason: lastPause?.reason ?? null,
  };
}
