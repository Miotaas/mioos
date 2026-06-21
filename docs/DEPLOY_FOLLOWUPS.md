# MioOS — Post-Deployment Follow-ups

Deferred deliberately so deployment is not blocked. None of these stop a fresh
deploy from producing an opportunity + approval (with an AI key set).

## 1. Dual autonomy systems (highest priority follow-up)
There are two work-generation paths:
- **Scheduled (active):** `runRuntimeLoop` → `objective-evaluator` → `executor`
  → `opportunity-engine`. Uses the **functional** WorkforceTeams
  (research/sales/commerce/...). This is what runs autonomously today.
- **Manual only (dormant):** `runAutonomousWorkforce` (lifecycle-aware, uses the
  business-unit slugs in `team-behaviors.ts`). Wired ONLY to
  `POST /api/runtime/trigger`; never called by the scheduled loop, and it
  expects BU-slug teams the seed does not create (would report `team_missing`).

**Decision needed (post-deploy):** either (a) wire `runAutonomousWorkforce` into
the loop AND seed BU-slug teams (or resolve teams by `departmentType`), or
(b) retire the BU-slug engine and keep the scheduled path as the single system.
Do NOT do this before deployment is stable.

## 2. Seed vs business-unit slug seam
`seed.ts` creates functional teams; `BusinessUnit` rows use BU slugs
(ecommerce/automation-sales/content/capital). Attribution bridges them via
`businessUnitId` (Phase 1) + `opportunityType`. The Workforce portfolio route is
keyed by team slug — migrate it to query by `businessUnitId` so each unit shows
its own pipeline reliably.

## 3. Memory write-back
`team-memory` is read for output context but not written automatically on the
discovery tick. Add a `recordTeamMemory(...)` write on opportunity
route/reject/win so "self-improvement" actually persists outcomes.

## 4. Phase B (revenue capture) — not built
Outreach can send (Phase A) once a draft has a recipient + approval, but there is
no `invoice.create` / Stripe / payment → RevenueEntry path yet. Required before
the system can book a real euro autonomously.

## 5. First-tick latency note
Objectives now fire on the first tick (`nextRunAt = new Date()`); they then
recur per `frequency`. No action needed — documented for clarity.
