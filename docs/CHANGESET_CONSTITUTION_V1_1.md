# Pending changeset — Constitution v1.1, dormant containment, Solutions scope, allocator

Status: **uncommitted** · Base commit: `a87a92a` · Prepared: 2026-10-18
Production migration has **not** been run. Nothing in this changeset has executed against a database: the local VM has no Prisma query engine for Linux, and all local SQLite files are stale.

## Files

| File | +/− | Group |
|---|---|---|
| `docs/ARCHITECTURE_REALITY_AUDIT.md` | new, 532 lines | Audit |
| `docs/MIOOS_CONSTITUTION.md` | new, 715 lines | Constitution |
| `CLAUDE.md` | +155 / −239 | Constitution |
| `founder-context.example.json` | +36 / −49 | Constitution / Solutions scope |
| `lib/founder-context.ts` | +3 / −2 | Dormant containment |
| `scripts/migrate-workforce-reality.ts` | +288 / −60 | Dormant containment / Solutions scope |
| `lib/company/research-engine.ts` | +108 / −102 | Dormant containment / Solutions scope |
| `lib/autonomous-conditions.ts` | +17 / −76 | Dormant containment / Solutions scope |
| `runtime/runtime-worker.ts` | +1 / −1 | Dormant containment / Solutions scope |
| `runtime/runtime-loop.ts` | +1 / −1 | Dormant containment |
| `lib/solutions-scope.ts` | new, 124 lines | Solutions scope |
| `lib/opportunity-engine.ts` | +179 / −34 | Solutions scope |
| `lib/workflow-router.ts` | +24 / −8 | Solutions scope |
| `lib/businessUnits/config.ts` | +3 / −0 | Solutions scope |
| `scripts/backfill-business-units.ts` | +1 / −1 | Solutions scope |
| `lib/company/capital-allocator.ts` | +222 / −56 | Allocator |

No schema, BusinessUnit slug, approval-logic, runtime-scheduling, budget or external-execution code was changed.

## 1. Constitution v1.1

- `docs/MIOOS_CONSTITUTION.md` is the binding top-level source (v1.0 2026-10-11, v1.1 2026-10-17).
  - Four units with `mio-` slugs; only `mio-solutions` operational; Media, Commerce, Capital dormant (0 runtime, 0 budget).
  - Media and Capital deliberately re-included, overruling earlier decisions.
  - Canonical objects mapped to existing models (`Approval`, `ExecutionHistory`, `ActionResult`, `RevenueEntry`); no parallel models.
  - Budgets and hard caps mandatory before production credentials; §19 reordered with tests first, plus fail-fast/liveness, opt-out/suppression, migrations/backups, assignment closure.
  - v1.1 §2.1.1: priority portfolio is a priority, not a boundary; six opportunity classes; external evidence gate; exclusions; authority (only the founder promotes, demotes or materially reallocates the portfolio).
- `CLAUDE.md` rewritten under the Constitution; includes the Solutions opportunity scope and the portfolio-authority rule.
- Founder context (`founder-context.example.json`, mirrored in the migration script): Mio Solutions operational, dormant units excluded, priority portfolio plus evidence-backed new opportunities.

## 2. Dormant-unit containment (`scripts/migrate-workforce-reality.ts` + runtime topics)

When run, the migration — in one transaction:
1. Writes the new founder context.
2. Creates/updates only the three portfolio projects; pauses active dormant projects (`luxora`, `youtube-channel`, `ecommerce-store`, `investing-portfolio`, `crypto-research`, `public-markets-research`).
3. Pauses teams `youtube`, `commerce`, `ecommerce`, `crypto-stock`, `automation-sales`.
4. For those teams, without deleting: queue `queued/running → cancelled`; assignments `pending/active/review → archived` with a system message; handoffs to or from them `pending/in_progress → rejected` with a note; one summary audit log row.
5. Sets one active objective each for `website-revenue`, `automation-revenue`, `research`, `sales`, `marketing`, `content`, `development`, `operations`, `support`, `executive`; deactivates every other active objective.
6. Fails and rolls back unless: exactly 10 active objectives on exactly those teams, no other active team, all paused-list teams paused, no open work for them, no active dormant project.

Runtime: dormant research topics and the e-commerce discovery condition removed; prompt header now "Mio Capital Lab — DORMANT: no autonomous work".

## 3. Mio Solutions scope

- `lib/solutions-scope.ts`: six classes (`software_venture`, `saas_product`, `ai_product`, `automation_service`, `productized_service`, `internal_tool`), priority portfolio, exclusion filter, retrieved-URL verification.
- Opportunity engine gate: Solutions unit and class; no excluded category; monetization path and target customer; new ventures need ≥2 retrieved sources from ≥2 domains; portfolio items without verified evidence capped at confidence 3. Rejections are audit-logged. `businessUnitId` set at creation. Unknown types are rejected (previously coerced to `automation_service`).
- Router: portfolio routes first; new classes mapped to existing chains; discovered `ecommerce_product` / `content_business` rows archived, not routed.
- Research engine: up to 2 portfolio topics + 1 open-discovery topic per run, each with web-search sources attached.

## 4. Capital allocator

- Ranks all opportunities; writes team focus only from AION, Mail Co-Pilot, AI Website Agency opportunities; clears stale `[PRIORITY]` focus; effort % only within the portfolio; plan lists portfolio first.
- A new venture outranking a portfolio candidate creates one `portfolio_review` founder decision (8 required elements). Deduplicated: none while one is pending, never twice per opportunity. Approval only records the decision; the portfolio is not changed.

## Verification

- Typecheck: no errors in changed files. 30 pre-existing errors in `lib/actions/invoice-executor.ts` and `lib/actions/subscription-executor.ts`, caused by a stale generated Prisma client (generated 2026-07-04, schema changed 2026-07-05). CI regenerates the client.
- Exclusion filter tested on 11 phrases (e-commerce automation and webshop maintenance allowed; affiliate, dropshipping, YouTube channel, crypto trading bot, "top 10 ideas", sponsorship newsletter, own webshop blocked).
- Not tested: migration, research engine, opportunity gate, allocator — no runtime execution was possible.

## Before running the migration in production

1. Back up `/data/mioos.db`.
2. Stop the runtime worker (a `running` queue item cancelled mid-execution could still be completed by the worker).
3. Run `npm run db:migrate-reality`. If it fails, read the listed invariant violations; nothing will have been written.
4. Restart the worker.

## Deferred — documented, not part of this changeset

| Item | Detail |
|---|---|
| Dashboard top action | If there are zero portfolio opportunities, the dashboard "top ROI action" shows the best new venture (0% effort, "analysis only" label). |
| Portfolio mutation | No mechanism changes the priority portfolio after a `portfolio_review` approval; needs a dedicated implementation. |
| Rejected portfolio review | Never re-raised for the same opportunity, even if evidence changes materially. |
| Double approval | Approving an approval twice still errors (audit D-8). |
| Evidence gate | Verifies a URL was retrieved, not that it supports the claim. |
| Search dependency and spend | New ventures require a configured search connector; search calls are not spend-capped (§19 item 10). |
| Forecast in `RevenueEntry` | Routing still writes AI estimates as "[Potential]" revenue rows (§5 conflict). |
| Throttle | No per-class daily limits for the new classes; only the total applies. |
| Handoff creation | Ignores team status; a handoff to a paused team stays pending (never accepted). |
| Legacy routed opportunities | Already-routed dormant-type opportunities stall at the paused commerce stage; content stages go to the active `content` team. |
| Prisma client | Regenerate locally to clear the 30 stale-client errors. |
| Project instructions | The claude.ai project instructions still describe three engines. |
