import { prisma } from "./db";

const KEY_HEARTBEAT  = "runtime:heartbeat";
const KEY_START_TIME = "runtime:startTime";
const KEY_LOOP_COUNT = "runtime:loopCount";

export async function recordHeartbeat(): Promise<void> {
  const now = new Date().toISOString();
  await prisma.runtimeState.upsert({
    where:  { key: KEY_HEARTBEAT },
    create: { key: KEY_HEARTBEAT, value: now },
    update: { value: now },
  });
}

export async function recordStartTime(): Promise<void> {
  const now = new Date().toISOString();
  await prisma.runtimeState.upsert({
    where:  { key: KEY_START_TIME },
    create: { key: KEY_START_TIME, value: now },
    update: { value: now },
  });
}

export async function incrementLoopCount(): Promise<void> {
  const existing = await prisma.runtimeState.findUnique({ where: { key: KEY_LOOP_COUNT } });
  const next = String(Number(existing?.value ?? "0") + 1);
  await prisma.runtimeState.upsert({
    where:  { key: KEY_LOOP_COUNT },
    create: { key: KEY_LOOP_COUNT, value: next },
    update: { value: next },
  });
}

export async function getHealth(): Promise<{
  status: "running" | "stale" | "offline";
  lastHeartbeat: string | null;
  startTime: string | null;
  uptimeSeconds: number | null;
  loopCount: number;
  queueDepth: number;
  queueRunning: number;
}> {
  const [heartbeatRec, startRec, loopRec, queueDepth, queueRunning] = await Promise.all([
    prisma.runtimeState.findUnique({ where: { key: KEY_HEARTBEAT } }).catch(() => null),
    prisma.runtimeState.findUnique({ where: { key: KEY_START_TIME } }).catch(() => null),
    prisma.runtimeState.findUnique({ where: { key: KEY_LOOP_COUNT } }).catch(() => null),
    prisma.runtimeQueue.count({ where: { status: "queued" } }).catch(() => 0),
    prisma.runtimeQueue.count({ where: { status: "running" } }).catch(() => 0),
  ]);

  const lastHeartbeat  = heartbeatRec?.value ?? null;
  const startTime      = startRec?.value ?? null;
  const loopCount      = Number(loopRec?.value ?? "0");

  let status: "running" | "stale" | "offline" = "offline";
  let uptimeSeconds: number | null = null;

  if (lastHeartbeat) {
    const ageMs = Date.now() - new Date(lastHeartbeat).getTime();
    if (ageMs < 120_000)       status = "running";
    else if (ageMs < 600_000)  status = "stale";
    else                       status = "offline";
  }

  if (startTime) {
    uptimeSeconds = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
  }

  return { status, lastHeartbeat, startTime, uptimeSeconds, loopCount, queueDepth, queueRunning };
}
