/**
 * autonomous-engine.ts — V2
 *
 * Lifecycle-aware autonomous workforce engine.
 *
 * V2 change: before selecting a work item the engine checks the team's
 * current opportunity pipeline state and routes to the appropriate lifecycle stage:
 *   discovery  — no active opportunities yet; generate new ones
 *   validation — discovered opportunities need evidence and scoring
 *   execution  — validated opportunities need launch/outreach prep → Decide
 *
 * This means each team's autonomous work adapts to where its pipeline is stuck,
 * rather than cycling through all work items in order.
 *
 * Safety model (unchanged):
 *   off           → 0 work items per team per day
 *   conservative  → 1 per team per day (default)
 *   normal        → 3 per team per day
 *   aggressive    → 6 per team per day
 *   Emergency Stop (autonomy_paused=true) always overrides
 */

import { prisma } from "@/lib/db";
import { isAutonomyPaused } from "@/lib/autonomy";
import { TEAM_BEHAVIORS, WorkItemLifecycle } from "./team-behaviors";

export const WORKFORCE_AUTONOMY_KEY = "workforce_autonomy_level";

const DAILY_LIMITS: Record<string, number> = {
  off:          0,
  conservative: 1,
  normal:       3,
  aggressive:   6,
};

const SLUG_TO_DEPARTMENT: Record<string, string> = {
  "ecommerce":        "commerce",
  "automation-sales": "sales",
  "youtube":          "content",
  "crypto-stock":     "research",
};

const DISCOVERY_STATUSES  = new Set(["discovered"]);
const VALIDATION_STATUSES = new Set(["researching", "validating"]);
const APPROVED_STATUSES   = new Set(["approved", "building", "marketing", "selling", "demo", "pilot"]);

export interface TeamEngineResult {
  team:      string;
  action:    "queued" | "skipped" | "at_limit" | "team_missing";
  reason?:   string;
  workItem?: string;
  lifecycle?: WorkItemLifecycle;
}

export interface AutonomyEngineResult {
  level:   string;
  teams:   TeamEngineResult[];
  queued:  number;
  skipped: number;
}

async function getTargetLifecycle(teamId: string): Promise<WorkItemLifecycle> {
  // Pull all linked opportunity statuses for this team
  const [outputIds, assignmentOppLinks] = await Promise.all([
    prisma.workforceOutput.findMany({ where: { teamId }, select: { id: true } }),
    prisma.assignment.findMany({
      where:    { teamId, opportunityId: { not: null } },
      select:   { opportunityId: true },
      distinct: ["opportunityId"],
    }),
  ]);

  const assignmentOppIds = assignmentOppLinks
    .map(a => a.opportunityId)
    .filter(Boolean) as string[];
  const outputIdList = outputIds.map(o => o.id);

  if (assignmentOppIds.length === 0 && outputIdList.length === 0) {
    return "discovery";
  }

  const orClauses = [
    ...(assignmentOppIds.length > 0 ? [{ id: { in: assignmentOppIds } }]                  : []),
    ...(outputIdList.length > 0     ? [{ sourceOutputId: { in: outputIdList } }]           : []),
  ];

  const opps = await prisma.opportunity.findMany({
    where:  { OR: orClauses },
    select: { status: true },
  });

  if (opps.length === 0) return "discovery";

  const hasApproved   = opps.some(o => APPROVED_STATUSES.has(o.status));
  const hasValidating = opps.some(o => VALIDATION_STATUSES.has(o.status));
  const hasDiscovered = opps.some(o => DISCOVERY_STATUSES.has(o.status));

  if (hasApproved)   return "execution";
  if (hasValidating) return "execution";
  if (hasDiscovered) return "validation";
  return "discovery";
}

export async function runAutonomousWorkforce(): Promise<AutonomyEngineResult> {
  if (await isAutonomyPaused()) {
    return { level: "paused", teams: [], queued: 0, skipped: 0 };
  }

  const cfg = await prisma.systemConfig
    .findUnique({ where: { key: WORKFORCE_AUTONOMY_KEY } })
    .catch(() => null);
  const level      = (cfg?.value ?? "conservative").toLowerCase();
  const dailyLimit = DAILY_LIMITS[level] ?? 1;

  if (dailyLimit === 0) {
    return { level, teams: [], queued: 0, skipped: 0 };
  }

  const results: TeamEngineResult[] = [];
  let queued  = 0;
  let skipped = 0;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  for (const behavior of TEAM_BEHAVIORS) {
    // Ensure team record exists
    let team = await prisma.workforceTeam.findFirst({ where: { slug: behavior.slug } });
    if (!team) {
      team = await prisma.workforceTeam.create({
        data: {
          name:           behavior.name,
          slug:           behavior.slug,
          departmentType: SLUG_TO_DEPARTMENT[behavior.slug] ?? "custom",
          objective:      behavior.defaultObjective,
          currentFocus:   behavior.dailyRoutine.slice(0, 200),
          status:         "active",
        },
      });
    }

    // Daily output cap
    const todayOutputs = await prisma.workforceOutput.count({
      where: { teamId: team.id, createdAt: { gte: todayStart } },
    });
    if (todayOutputs >= dailyLimit) {
      results.push({
        team:   behavior.name,
        action: "at_limit",
        reason: `${todayOutputs}/${dailyLimit} daily outputs reached`,
      });
      skipped++;
      continue;
    }

    // Don't pile up more than 2 pending/active assignments per team
    const activeCount = await prisma.assignment.count({
      where: { teamId: team.id, status: { in: ["pending", "active", "review"] } },
    });
    if (activeCount >= 2) {
      results.push({
        team:   behavior.name,
        action: "skipped",
        reason: `${activeCount} active assignments already queued`,
      });
      skipped++;
      continue;
    }

    // V2: determine which lifecycle stage to target based on opportunity pipeline
    const targetLifecycle = await getTargetLifecycle(team.id);

    // All titles ever run (for dedup)
    const existingTitles = await prisma.assignment.findMany({
      where:  { teamId: team.id },
      select: { title: true },
    });
    const existingSet = new Set(existingTitles.map(a => a.title));

    // Filter work items to the target lifecycle, skipping already-run titles
    let candidates = behavior.workItems.filter(
      w => w.lifecycle === targetLifecycle && !existingSet.has(w.title)
    );

    // If all lifecycle-stage items have been run, restart that stage
    if (candidates.length === 0) {
      candidates = behavior.workItems.filter(w => w.lifecycle === targetLifecycle);
    }

    // Final fallback: any work item not yet run
    if (candidates.length === 0) {
      candidates = behavior.workItems.filter(w => !existingSet.has(w.title));
    }

    // Absolute fallback: first item in catalog
    const nextItem = candidates[0] ?? behavior.workItems[0];

    // Create Assignment first (RuntimeQueue needs a valid assignmentId)
    const assignment = await prisma.assignment.create({
      data: {
        title:       nextItem.title,
        description: nextItem.description,
        teamId:      team.id,
        status:      "pending",
        priority:    nextItem.priority,
      },
    });

    // Create RuntimeQueue entry — this is what processQueueItems() reads
    await prisma.runtimeQueue.create({
      data: {
        teamId:       team.id,
        assignmentId: assignment.id,
        title:        nextItem.title,
        description:  nextItem.description,
        priority:     nextItem.priority,
        status:       "queued",
        source:       "runtime",
      },
    });

    results.push({
      team:      behavior.name,
      action:    "queued",
      workItem:  nextItem.title,
      lifecycle: nextItem.lifecycle,
    });
    queued++;
  }

  return { level, teams: results, queued, skipped };
}
