import type { AgentHealthRecord, AgentHealthStatus, ApprovalPressure, FleetHealthSummary } from "@/types";

const H24 = 24 * 60 * 60 * 1000;
const D7  =  7 * 24 * 60 * 60 * 1000;

/**
 * Deterministic health classification.
 *
 * Priority: OFFLINE → WARNING → HEALTHY
 *
 * OFFLINE  — disabled status, OR no successful run within 7 days (includes never ran)
 * WARNING  — last run older than 24 h, OR failure rate > 20 %
 * HEALTHY  — active, last run within 24 h, failure rate ≤ 20 %
 */
export function computeHealthStatus(
  agentStatus: string,
  lastSuccessAt: string | null,
  lastRunAt: string | null,
  failureRate: number,
): AgentHealthStatus {
  const now = Date.now();

  if (agentStatus === "disabled") return "offline";

  const lastSuccessAge = lastSuccessAt
    ? now - new Date(lastSuccessAt).getTime()
    : Infinity;
  if (lastSuccessAge > D7) return "offline";

  const lastRunAge = lastRunAt
    ? now - new Date(lastRunAt).getTime()
    : Infinity;
  if (lastRunAge > H24 || failureRate > 20) return "warning";

  return "healthy";
}

/** 0–2 pending = low · 3–5 = medium · 6+ = high */
export function computeApprovalPressure(pendingCount: number): ApprovalPressure {
  if (pendingCount >= 6) return "high";
  if (pendingCount >= 3) return "medium";
  return "low";
}

/**
 * Fleet Health Score 0–100
 *
 * Components:
 *   50 pts — health ratio  (healthy=50, warning=25, offline=0 per agent)
 *   30 pts — avg success rate across agents that have runs
 *   20 pts — approval backlog (-2 per pending approval, min 0)
 */
export function computeFleetHealthScore(records: AgentHealthRecord[]): number {
  if (records.length === 0) return 0;

  const total   = records.length;
  const healthy = records.filter(r => r.healthStatus === "healthy").length;
  const warning = records.filter(r => r.healthStatus === "warning").length;

  const healthScore = (healthy * 50 + warning * 25) / total;

  const withRuns = records.filter(r => r.totalRuns > 0);
  const avgSuccess = withRuns.length > 0
    ? withRuns.reduce((s, r) => s + r.successRate, 0) / withRuns.length
    : 100;
  const successScore = (avgSuccess / 100) * 30;

  const totalPending = records.reduce((s, r) => s + r.pendingApprovalCount, 0);
  const approvalScore = Math.max(0, 20 - totalPending * 2);

  return Math.round(Math.min(100, Math.max(0, healthScore + successScore + approvalScore)));
}

export function computeFleetSummary(records: AgentHealthRecord[]): FleetHealthSummary {
  return {
    healthy:          records.filter(r => r.healthStatus === "healthy").length,
    warning:          records.filter(r => r.healthStatus === "warning").length,
    offline:          records.filter(r => r.healthStatus === "offline").length,
    total:            records.length,
    fleetHealthScore: computeFleetHealthScore(records),
  };
}
