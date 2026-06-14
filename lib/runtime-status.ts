import { prisma } from "@/lib/db";

export async function getRuntimeHealth(): Promise<{
  status: "running" | "stale" | "offline";
  lastHeartbeat: string | null;
  startTime: string | null;
  uptimeSeconds: number | null;
  loopCount: number;
  queueDepth: number;
  queueRunning: number;
  queueCompleted24h: number;
  queueFailed24h: number;
  pendingApprovals: number;
  busiestTeams: Array<{ teamId: string; teamName: string; completedToday: number }>;
}> {
  const since24h  = new Date(Date.now() - 86_400_000);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    heartbeatRec,
    startRec,
    loopRec,
    queueDepth,
    queueRunning,
    queueCompleted24h,
    queueFailed24h,
    pendingApprovals,
    teamActivity,
  ] = await Promise.all([
    prisma.runtimeState.findUnique({ where: { key: "runtime:heartbeat" } }).catch(() => null),
    prisma.runtimeState.findUnique({ where: { key: "runtime:startTime" } }).catch(() => null),
    prisma.runtimeState.findUnique({ where: { key: "runtime:loopCount" } }).catch(() => null),
    prisma.runtimeQueue.count({ where: { status: "queued" } }).catch(() => 0),
    prisma.runtimeQueue.count({ where: { status: "running" } }).catch(() => 0),
    prisma.runtimeQueue.count({ where: { status: "completed", completedAt: { gte: since24h } } }).catch(() => 0),
    prisma.runtimeQueue.count({ where: { status: "failed", updatedAt: { gte: since24h } } }).catch(() => 0),
    prisma.approval.count({ where: { status: "pending" } }).catch(() => 0),
    prisma.runtimeQueue.groupBy({
      by: ["teamId"],
      where: { status: "completed", completedAt: { gte: startOfDay } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }).catch(() => [] as Array<{ teamId: string; _count: { id: number } }>),
  ]);

  // Resolve team names for the activity breakdown
  const teamIds = teamActivity.map(t => t.teamId);
  const teams = teamIds.length > 0
    ? await prisma.workforceTeam.findMany({
        where: { id: { in: teamIds } },
        select: { id: true, name: true },
      }).catch(() => [] as Array<{ id: string; name: string }>)
    : [] as Array<{ id: string; name: string }>;

  const teamMap = new Map(teams.map(t => [t.id, t.name]));
  const busiestTeams = teamActivity.map(t => ({
    teamId:         t.teamId,
    teamName:       teamMap.get(t.teamId) ?? t.teamId,
    completedToday: t._count.id,
  }));

  const lastHeartbeat = heartbeatRec?.value ?? null;
  const startTime     = startRec?.value ?? null;
  const loopCount     = Number(loopRec?.value ?? "0");

  let status: "running" | "stale" | "offline" = "offline";
  let uptimeSeconds: number | null = null;

  if (lastHeartbeat) {
    const ageMs = Date.now() - new Date(lastHeartbeat).getTime();
    if (ageMs < 120_000)       status = "running";
    else if (ageMs < 600_000)  status = "stale";
  }

  if (startTime) {
    uptimeSeconds = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
  }

  return {
    status,
    lastHeartbeat,
    startTime,
    uptimeSeconds,
    loopCount,
    queueDepth,
    queueRunning,
    queueCompleted24h,
    queueFailed24h,
    pendingApprovals,
    busiestTeams,
  };
}
