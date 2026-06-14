/**
 * Alert Manager — sends operational alerts when MioOS needs founder attention.
 *
 * Providers (configure via env vars):
 *   ALERT_DISCORD_WEBHOOK  → Discord channel webhook URL
 *   ALERT_NTFY_TOPIC       → ntfy topic name (posts to ntfy.sh or ALERT_NTFY_SERVER)
 *   ALERT_NTFY_SERVER      → ntfy server base URL (default: https://ntfy.sh)
 *
 * Deduplication: each alert type has a cooldown window. The same alert type
 * won't fire again until the cooldown expires, preventing spam.
 *
 * Safety: read-only side effects only — creates AlertLog records, sends HTTP POST.
 */

import { prisma } from "@/lib/db";

export type AlertType =
  | "runtime_offline"
  | "runtime_stale"
  | "queue_stuck"
  | "assignment_failure"
  | "critical_approval"
  | "high_approval_stale"
  | "project_blocked"
  | "api_failure"
  | "connector_failure";

export type AlertSeverity = "info" | "warning" | "error" | "critical";

interface AlertPayload {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  dedupKey?: string;       // defaults to type + YYYY-MM-DD
  cooldownMinutes?: number; // defaults to per-type defaults below
  metadata?: Record<string, unknown>;
}

const DEFAULT_COOLDOWNS: Record<AlertType, number> = {
  runtime_offline:      60,   // re-alert every 1h
  runtime_stale:        120,  // re-alert every 2h
  queue_stuck:          60,
  assignment_failure:   240,  // re-alert every 4h
  critical_approval:    60,   // every 1h until actioned
  high_approval_stale:  720,  // every 12h
  project_blocked:      480,  // every 8h
  api_failure:          120,
  connector_failure:    240,
};

function detectAlertChannel(): "discord" | "ntfy" | "none" {
  if (process.env.ALERT_DISCORD_WEBHOOK) return "discord";
  if (process.env.ALERT_NTFY_TOPIC)      return "ntfy";
  return "none";
}

async function sendDiscord(message: string, severity: AlertSeverity): Promise<void> {
  const colors: Record<AlertSeverity, number> = {
    info:     0x3498db,
    warning:  0xf39c12,
    error:    0xe74c3c,
    critical: 0x8e44ad,
  };
  const body = {
    username: "MioOS",
    embeds: [{
      title:       `MioOS Alert`,
      description: message,
      color:       colors[severity],
      timestamp:   new Date().toISOString(),
      footer:      { text: `Severity: ${severity.toUpperCase()}` },
    }],
  };
  const res = await fetch(process.env.ALERT_DISCORD_WEBHOOK!, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Discord webhook failed: ${res.status}`);
}

async function sendNtfy(message: string, severity: AlertSeverity): Promise<void> {
  const server    = process.env.ALERT_NTFY_SERVER ?? "https://ntfy.sh";
  const topic     = process.env.ALERT_NTFY_TOPIC!;
  const priorityMap: Record<AlertSeverity, string> = {
    info:     "low",
    warning:  "default",
    error:    "high",
    critical: "urgent",
  };
  const res = await fetch(`${server}/${topic}`, {
    method:  "POST",
    headers: {
      "Content-Type": "text/plain",
      "Title":        "MioOS Alert",
      "Priority":     priorityMap[severity],
      "Tags":         severity === "critical" ? "rotating_light" : "bell",
    },
    body: message,
  });
  if (!res.ok) throw new Error(`ntfy failed: ${res.status}`);
}

async function isOnCooldown(dedupKey: string, cooldownMinutes: number): Promise<boolean> {
  const since = new Date(Date.now() - cooldownMinutes * 60 * 1000);
  const existing = await prisma.alertLog.findFirst({
    where: { dedupKey, sentAt: { gte: since } },
  }).catch(() => null);
  return existing !== null;
}

export async function sendAlert(payload: AlertPayload): Promise<boolean> {
  const today       = new Date().toISOString().slice(0, 10);
  const dedupKey    = payload.dedupKey ?? `${payload.type}:${today}`;
  const cooldown    = payload.cooldownMinutes ?? DEFAULT_COOLDOWNS[payload.type];

  // Deduplication check
  if (await isOnCooldown(dedupKey, cooldown)) return false;

  const channel = detectAlertChannel();

  try {
    if (channel === "discord") await sendDiscord(payload.message, payload.severity);
    if (channel === "ntfy")    await sendNtfy(payload.message, payload.severity);

    await prisma.alertLog.create({
      data: {
        alertType: payload.type,
        severity:  payload.severity,
        message:   payload.message,
        channel,
        dedupKey,
        metadata:  JSON.stringify(payload.metadata ?? {}),
      },
    });

    return true;
  } catch (err) {
    // Log failure but don't throw — alerting must never crash the runtime
    console.error(`[alerts] Failed to send ${payload.type}:`, err);

    // Still record the attempt so we don't spam retries
    await prisma.alertLog.create({
      data: {
        alertType: payload.type,
        severity:  payload.severity,
        message:   `SEND FAILED: ${payload.message}`,
        channel:   "none",
        dedupKey,
        metadata:  JSON.stringify({ error: String(err) }),
      },
    }).catch(() => {});

    return false;
  }
}

// ── Runtime health check ─────────────────────────────────────────────

export async function runAlertChecks(): Promise<void> {
  const channel = detectAlertChannel();
  if (channel === "none") return; // no alerting configured — skip

  const now = new Date();

  // 1. Check runtime health
  const heartbeatRec = await prisma.runtimeState.findUnique({
    where: { key: "runtime:heartbeat" },
  }).catch(() => null);

  if (!heartbeatRec) {
    await sendAlert({
      type: "runtime_offline",
      severity: "critical",
      message: "MioOS runtime worker has never started or heartbeat record is missing.",
    });
  } else {
    const ageMinutes = (now.getTime() - new Date(heartbeatRec.value).getTime()) / 60_000;
    if (ageMinutes > 10) {
      await sendAlert({
        type: "runtime_offline",
        severity: "critical",
        message: `MioOS runtime worker is OFFLINE. Last heartbeat: ${Math.round(ageMinutes)} minutes ago.`,
        dedupKey: `runtime_offline:${now.toISOString().slice(0, 13)}`, // hourly dedup
      });
    } else if (ageMinutes > 3) {
      await sendAlert({
        type: "runtime_stale",
        severity: "warning",
        message: `MioOS runtime worker is stale. Last heartbeat: ${Math.round(ageMinutes)} minutes ago.`,
        dedupKey: `runtime_stale:${now.toISOString().slice(0, 13)}`,
      });
    }
  }

  // 2. Check for stuck queue
  const stuckCount = await prisma.runtimeQueue.count({
    where: {
      status:   "running",
      lockedAt: { lt: new Date(now.getTime() - 15 * 60 * 1000) }, // stuck > 15 min
    },
  }).catch(() => 0);

  if (stuckCount > 0) {
    await sendAlert({
      type: "queue_stuck",
      severity: "error",
      message: `${stuckCount} queue item(s) have been stuck in "running" state for over 15 minutes. Restart runtime worker.`,
      metadata: { stuckCount },
    });
  }

  // 3. Check for repeated assignment failures
  const since1h = new Date(now.getTime() - 3_600_000);
  const failedCount = await prisma.runtimeQueue.count({
    where: { status: "failed", updatedAt: { gte: since1h } },
  }).catch(() => 0);

  if (failedCount >= 3) {
    await sendAlert({
      type: "assignment_failure",
      severity: "warning",
      message: `${failedCount} assignment(s) have failed in the last hour. Check AI key configuration and logs.`,
      metadata: { failedCount },
    });
  }

  // 4. Check for critical approvals that haven't been escalated yet
  const criticalApprovals = await prisma.approval.findMany({
    where: {
      status:       "pending",
      riskLevel:    "critical",
      escalatedAt:  null,
    },
    select: { id: true, title: true },
    take: 5,
  }).catch(() => []);

  for (const approval of criticalApprovals) {
    await sendAlert({
      type: "critical_approval",
      severity: "critical",
      message: `CRITICAL approval requires immediate attention: "${approval.title}"`,
      dedupKey: `critical_approval:${approval.id}`,
      cooldownMinutes: 60,
      metadata: { approvalId: approval.id },
    });
    // Mark as escalated
    await prisma.approval.update({
      where: { id: approval.id },
      data:  { escalatedAt: now },
    }).catch(() => {});
  }

  // 5. Check for high-risk approvals stale > 3 days
  const staleCutoff = new Date(now.getTime() - 3 * 24 * 3_600_000);
  const staleHighApprovals = await prisma.approval.count({
    where: {
      status:    "pending",
      riskLevel: "high",
      createdAt: { lt: staleCutoff },
    },
  }).catch(() => 0);

  if (staleHighApprovals > 0) {
    await sendAlert({
      type: "high_approval_stale",
      severity: "warning",
      message: `${staleHighApprovals} high-risk approval(s) have been waiting for over 3 days without founder decision.`,
      metadata: { count: staleHighApprovals },
    });
  }

  // 6. Check for blocked high-value projects
  const blockedProjects = await prisma.project.findMany({
    where: {
      status:   "blocked",
      priority: { in: ["high", "urgent"] },
    },
    select: { name: true, blocker: true },
    take: 3,
  }).catch(() => []);

  if (blockedProjects.length > 0) {
    await sendAlert({
      type: "project_blocked",
      severity: "warning",
      message: `${blockedProjects.length} high-priority project(s) are blocked: ${blockedProjects.map(p => p.name).join(", ")}`,
      metadata: { projects: blockedProjects },
    });
  }
}
