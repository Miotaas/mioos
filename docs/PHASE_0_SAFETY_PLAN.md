# Phase 0 — Safety Plan (Constitution §19)

| | |
|---|---|
| Status | **Plan only. Nothing in this document is implemented.** |
| Version | 0.1 — 2026-10-18 |
| Scope | The items of Constitution §19 (1–15 and 5A), and nothing else |
| Subordinate to | `docs/MIOOS_CONSTITUTION.md` v1.4 |
| Order | Founder decision FD-002, enacted as Constitution v1.2 §19 |
| Founder decisions | FD-B to FD-H decided in FD-003; OQ-1 decided in FD-004 (2026-10-18). FD-F is partially open. |
| Related | `docs/ARCHITECTURE_REALITY_AUDIT.md` (finding IDs G-, D-, RA-, P- below), `docs/FIRST_REVENUE_LOOP.md` (Phase 0), `docs/FOUNDER_DECISIONS.md` |

Phase 0 is complete only when every item (1–15 and 5A) is **proven**. Every item has:
- automated tests that pin the behaviour;
- tests that run in CI and pass;
- acceptance criteria that are demonstrated.

Until then:
- no production credential is enabled, requested or configured (SMTP, IMAP, Stripe, web search, LLM keys used by the production runtime, publishing, advertising, trading);
- `docs/FIRST_REVENUE_LOOP.md` phases 1–6 do not start against real providers.

Code reality below was verified against the working tree on 2026-10-18 (commit `d5b77e5`). File paths are exact. Line numbers are indicative and will drift.

---

## Founder decisions for Phase 0

All decisions were made on 2026-10-18 (`docs/FOUNDER_DECISIONS.md`, FD-002 and FD-003).

| # | Decision | Status | Affects |
|---|---|---|---|
| FD-A | Database safety baseline as item 5A, between items 5 and 6 | **Decided.** Constitution v1.2 §19 | 5A, 6–15 |
| FD-B | Vitest; a throw-away SQLite file per test file; fake providers injected through `lib/providers`; `npm test` in CI | **Decided** | 1 |
| FD-C | Emergency Stop blocks all external writes and all paid third-party reads (LLM, search, prospect website fetches). It does not block read-only IMAP checks, alerts to founder-owned channels or internal read-only diagnostics. Unverifiable state fails closed for all external and financial actions. | **Decided.** Constitution v1.3 §8 | 2 |
| FD-D | Separate `CostEntry` model with the same Business Unit, period, provider-reference and integer-cents conventions as `RevenueEntry`. Same economic ledger, not a parallel revenue model. | **Decided.** Constitution v1.3 §5 | 10, 13 |
| FD-E | Backups go to S3-compatible object storage with versioning, preferably Hetzner Object Storage. A same-server copy never counts as off-server. The encryption key is founder-held and never on the production server. Liveness uses healthchecks.io or equivalent, pinged only after a successfully completed tick; missing pings alert the founder. Safety-infrastructure credentials are allowed before general production credentials. | **Decided.** Constitution v1.3 §19 | 3, 5A, 15 |
| FD-F | Europe/Amsterdam timezone; advertising 0; financial exposure 0 until the invoice/payment phase is explicitly enabled; outreach cap 10 per day; at most 2 follow-ups | **Partially decided** | 10, 11 |
| FD-F (open) | LLM, search and tool spend caps (daily and monthly) and provider-side limits | **Open.** Measured in item 1, then recommended to the founder | 10 |
| FD-G | All auto-approval disabled. Scoring, escalation and reminders stay. Existing `auto_approved` rows are inert: never executed, never converted. No internal allowlist. | **Decided** | 5 |
| FD-H | SQLite for Phase 0 and the first revenue loop. Revisit PostgreSQL later. Litestream is optional in item 15 and not required for 5A. | **Decided** | 5A, 15 |

### Open questions that do not block item 1

These came up while applying the decisions. OQ-1 is now decided; OQ-2 is open.

| # | Question | Needed by |
|---|---|---|
| OQ-1 | ~~Liveness pings and backups during Emergency Stop.~~ **Decided (FD-004, Constitution v1.4 §8):** the stop does not stop liveness heartbeats, off-server backups or founder-owned safety alerts, provided their credentials are scoped exclusively to safety infrastructure. | — |
| OQ-2 | Does Hetzner Object Storage support bucket versioning in the form FD-E requires? This must be verified when 5A/15 starts. If it does not, FD-E allows another S3-compatible provider. | 5A, 15 |

---

## Working rules for all of Phase 0

1. **Tests first, always.** For every change: first write the test that fails on today's code, or that pins today's correct behaviour. Then change the code. No test, no change (§19 item 1).
2. **One governance module, not scattered checks.** Items 2, 5, 6, 7, 10, 11 and 12 all feed one ordered gate, `lib/governance/gate.ts`. It runs Global Safety → BU Policy → Connector → Budget → Action Policy → Approval, as in §7. Every executor calls it immediately before the provider call.
3. **Fail closed** (§14). A gate that cannot read its state returns "deny". `isAutonomyPaused` currently returns `false` when the database read fails. That pattern is banned.
4. **No behaviour change to external execution beyond what an item requires.** No new connectors, no new external actions, no UI work except where an item needs it (the Decide payload view for item 6, the connector-mode display for item 7).
5. **No production run** of `scripts/migrate-workforce-reality.ts` until 5A is complete, including its verified production backup.
6. **CI must run the tests.** Adding `npm test` to `.github/workflows/ci.yml` is part of item 1.

---

## Item 1 — Test harness and tests for every external action

**Constitution:** "A test harness with fake providers and a controllable clock, and automated tests for every external action. No item below is changed without a test that pins its behaviour."

**Current code reality.**
- [Certain] There are no tests: no `*.test.*` or `*.spec.*` files, no Vitest or Jest. `playwright` is used only by screenshot scripts.
- [Certain] CI runs `prisma generate`, `db push`, lint and `next build`. `next build` does not compile `runtime/` (audit P-16).
- [Certain] There are no test seams:
  - executors call `prisma`, `fetch`, Nodemailer and `imapflow` directly;
  - time comes from `Date.now()` and `new Date()`;
  - "today" uses server-local `setHours(0,0,0,0)` (P-12).
- [Certain] Partial seams exist: `lib/providers/index.ts` exposes `getEmailProvider()` and `getPaymentProvider()`, and `lib/providers/types.ts` defines the interfaces.

**Files / modules affected.**
- New:
  - `vitest.config.ts`
  - `test/` (helpers)
  - `lib/clock.ts` (injectable `now()`)
  - `lib/providers/fakes/` (fake email, payment, IMAP, web-search, website-fetch, LLM and alert providers)
  - `test/db.ts` (one throw-away SQLite file per test file, created with `prisma db push` against the current schema)
- Changed (seams only, no behaviour change):
  - `lib/providers/index.ts`: allow provider override in tests;
  - `lib/connectors/email.ts`, `lib/connectors/webSearch.ts`, `lib/ai-ventures/website-analyzer.ts`, `lib/ai/provider.ts`, `lib/alerting/alert-manager.ts`: route through injectable clients;
  - time-dependent modules: replace `Date.now()` with `clock.now()`, starting with the files the tests below touch;
  - `package.json` (`test` script, Vitest dev dependency);
  - `.github/workflows/ci.yml` (`npm test` step; also type-check `runtime/` with `tsc --noEmit`).

**Tests required first.** Characterization tests that pin today's behaviour. They are written so that the later items flip specific assertions.

| Area | What is pinned now |
|---|---|
| Email send | No send unless `Approval.status === "approved"`; none for `pending`, `rejected` or `auto_approved`. One send per draft under two concurrent `processOutboundEmail` calls (the CAS claim works). |
| Follow-ups | `scheduleFollowups` creates a draft and an approval after 3 days, max 2. |
| Stripe invoice and subscription | Executors run only on `approved`. Marked as **known-failing** (`it.fails`): no idempotency key, a retry creates a second customer (D-6). |
| Stripe webhook | A valid signature is processed. Marked known-failing: reachable without a session (C-3); event de-duplication (D-7). |
| Alerts | Discord/ntfy POST is made only when configured. |
| Paid reads | LLM, web-search and website-fetch fakes record every call, so later items can assert call counts and costs. |
| Runtime tick | One full `runRuntimeLoop` with every provider faked and a fixed clock. Snapshot of which steps made which provider calls. |

**Implementation change.** Harness, fakes, the clock and the CI step only. No production behaviour changes.

**Cost measurement for FD-F.** The fakes record every LLM, search and fetch call made by a simulated 24-hour run (1,440 ticks under the fake clock, with representative seeded data). For each LLM call they record the size of the real prompt and of the output allowed, and for each search the number of queries.

From that, a cost estimate is computed against a documented provider price table, per day and per month. The estimate is labelled as an estimate: fakes cannot measure real token usage or real reply lengths. The result goes to the founder as a recommendation for:
- daily and monthly LLM, search and tool caps;
- provider-side limits.

The founder decides. No cap value is set by this item.

**Acceptance criteria.**
- `npm test` runs in CI and passes, with known-failing tests explicitly marked.
- Every external action has at least one test: SMTP send, Stripe customer / invoice / subscription / cancel, the Stripe webhook, alert POST.
- A full simulated tick runs with zero real network access. Any real socket attempt fails the test run.
- `runtime/` is type-checked in CI.
- The 24-hour cost estimate and the cap recommendation are delivered to the founder for the open part of FD-F.

**Dependencies.** FD-B (decided).

**Risk if done incorrectly.**
- Fakes that do not match real provider semantics (Stripe idempotency replay, SMTP partial failure, IMAP UID behaviour) give false confidence. Every fake must document which real behaviour it models.
- Leaving a real provider reachable from tests could send real email.

**Recommended order:** 1st, as §19 requires.

---

## Item 2 — Emergency Stop at the loop boundary and before every external side effect

**Constitution:** §8. Emergency Stop is absolute. It is checked at the runtime-loop boundary and immediately before every external side effect. UI state alone is not enforcement.

**Current code reality.**
- [Certain] The stop is the `SystemConfig` key `autonomy_paused`, read by `isAutonomyPaused()` in `lib/autonomy.ts`.
- [Certain] Only the legacy engines check it: `lib/executiveLoop.ts`, `lib/scheduleRunner.ts`, `lib/workforce/autonomous-engine.ts` and `lib/workforce/team-work-scheduler.ts`.
- [Certain] `runtime/runtime-loop.ts` does not check it. None of the executors check it: `lib/actions/executor.ts`, `invoice-executor.ts`, `subscription-executor.ts` (audit G-1). Pressing the stop leaves all worker steps running, SMTP and Stripe included.
- [Certain] **It fails open.** `isAutonomyPaused()` returns `false` when the database read throws.
- [Certain] `workforce_autonomy_level` is read only by the V2 engine.

**Files / modules affected.**
- `lib/autonomy.ts` → becomes `lib/governance/emergency-stop.ts`. It keeps one canonical key and exposes `assertNotStopped()`, which throws when stopped **or unreadable**.
- `runtime/runtime-loop.ts`: check at the top of every tick. When stopped, skip every step that can cause an external call.
- `lib/actions/executor.ts`, `lib/actions/invoice-executor.ts`, `lib/actions/subscription-executor.ts`: check immediately before each provider call, including between Stripe sub-calls.
- `lib/ai-ventures/discovery.ts`, `lib/ai-ventures/website-analyzer.ts`, `lib/connectors/webSearch.ts`, `lib/ai/provider.ts`: blocked by the stop (paid third-party reads, FD-C).
- **Not** blocked:
  - `lib/actions/reply-matcher.ts` / `lib/connectors/email.ts` (IMAP read-only);
  - internal read-only diagnostics;
  - safety infrastructure: the liveness heartbeat (item 3), off-server backups (5A/15) and founder-owned safety alerts (`lib/alerting/alert-manager.ts`).
  - Safety infrastructure continues only through a separate safety-only credential path (FD-C, FD-004).
- `app/api/runtime/trigger/route.ts`, `app/api/assignments/[id]/execute/route.ts`, `app/api/executive-loop/run/route.ts`, `app/api/agents/schedule/tick/route.ts`: check at entry.
- `app/api/autonomy/status/route.ts`: the existing toggle. Keep it, and make it write the canonical key.

**Tests required first.**
- Stop active → a full simulated tick makes **zero** calls to the email-send, payment, LLM, search and website-fetch fakes (FD-C).
- Stop active → the IMAP read fake, the founder-alert fake, the liveness-heartbeat fake and the backup-upload fake are still called (FD-C, FD-004).
- Stop active, with a safety path configured with a credential that is not safety-scoped (for example, an alert channel reusing a business connector) → that call is blocked as an external write.
- Stop key unreadable (database read throws) → zero external-write, financial and paid-read calls (fail closed, Constitution §8 / §14).
- Stop switched on between two drafts in one batch → the remaining drafts are not sent.
- Stop switched on between the Stripe "create invoice item" and "finalize" calls → finalize is not called, and the state is recorded as stopped, not failed-and-retry.
- Each manual trigger route returns a refusal while stopped.

**Implementation change.** One guard function called at the loop boundary and inside every executor immediately before the side effect. Remove the `catch { return false }` pattern.

**Acceptance criteria.** All the tests above pass. A grep for direct provider calls (`getEmailProvider().send`, payment provider writes, alert POST) finds each one preceded by the guard in the same function.

**Dependencies.** Item 1; FD-C and FD-004 (decided).

**Risk if done incorrectly.**
- Checking only at the loop boundary misses a stop pressed mid-tick. A multi-minute tick (D-1) keeps sending.
- Checking without fail-closed means a locked database becomes "not stopped".
- Stopping in the middle of a Stripe sequence without recording state strands half-made objects (see item 9).

**Recommended order:** 2nd.

---

## Item 3 — Single-flight runtime, fail-fast, external liveness with alerting

**Constitution:** §13. One runtime, single-flight. Exit on uncaught exceptions. Liveness is checked from outside the runtime, and alerts reach the founder.

**Current code reality.**
- [Certain] **Overlapping ticks (D-1).** `runtime/runtime-worker.ts:341` uses `setInterval(() => void safeTick(...), 60000)`, which starts a new tick whether or not the previous one has finished.
- [Certain] No cross-process lock. `app/api/runtime/trigger/route.ts` runs its own `processQueueItems()` concurrently with the worker (item 8).
- [Certain] **Fail-open on crash (P-1).** `runtime/error-guards.ts:42-47` catches `uncaughtException`, records an alert and continues. `restart: always` in `docker-compose.prod.yml` therefore never fires.
- [Certain] **Watchdog inside the watched (P-4).** The heartbeat is written to `RuntimeState` (`runtime/runtime-health.ts`), and the `runtime_offline` / `runtime_stale` alerts in `lib/alerting/alert-manager.ts` are raised only from inside the worker loop. The default alert channel is none.
- [Certain] `app/api/health/route.ts` reports database, auth and autonomy state, but not runtime heartbeat staleness.
- [Certain] **Invisible step failures (P-3).** Each loop step catches and logs to the console only.

**Files / modules affected.**
- `runtime/runtime-worker.ts`: replace `setInterval` with an await-then-schedule loop.
- New `runtime/lease.ts`: a database lease in `RuntimeState` (owner id, expiry, renewed per step) that every entry point into loop work must hold.
- `runtime/error-guards.ts`: record, then `process.exit(1)`.
- `runtime/runtime-loop.ts`: write each step's failure to a founder-visible record (`AlertLog` / `SystemExecutionLog`). This is the §13 requirement; it is listed here because liveness without step visibility is incomplete.
- `app/api/health/route.ts`: add heartbeat age and stale/offline status.
- `docker-compose.prod.yml`: a healthcheck for the `mioos-runtime` service that fails on a stale heartbeat.
- External monitor (FD-E): healthchecks.io or an equivalent dead-man's-switch service, pinged **only after a successfully completed tick**. Missing pings alert the founder. Its credential is a safety-infrastructure credential (Constitution §19 exception) and is used by nothing else.

**Tests required first.**
- With the fake clock, a tick that takes longer than the interval → the next tick does not start until the first has finished. Exactly one tick in flight at any time.
- Two worker processes (simulated with two lease holders) → only one executes loop work. The other idles, then takes over after lease expiry.
- `/api/runtime/trigger` while the worker holds the lease → no concurrent execution.
- An uncaught exception → the alert is recorded, then the process exits non-zero (asserted with a stubbed `process.exit`).
- A step throws → a founder-visible failure record exists for that step.
- Heartbeat older than the threshold → `/api/health` reports stale.
- A failed or aborted tick sends no liveness ping. Only a successfully completed tick does.
- A tick during an Emergency Stop completes with its blocked steps skipped, and it still sends the ping (FD-004).

**Implementation change.** Serial loop, database lease, fail-fast, step-failure records, staleness in health, an external monitor.

**Acceptance criteria.**
- The tests above pass.
- A staging run with a deliberately slow fake LLM shows no overlap.
- Killing the runtime container, or hanging it, produces a founder alert from **outside** the runtime within the configured threshold.

**Dependencies.** Items 1 and 2; FD-E and FD-004 (decided).

**Risk if done incorrectly.**
- A lease without expiry deadlocks the runtime after a crash.
- A lease with too short an expiry allows two holders during a long LLM call.
- Fail-fast without a supervisor gives an outage instead of a restart. `restart: always` must be verified on the host.
- An external monitor that pings `/api/health` on the web container only proves the web container is alive.

**Recommended order:** 3rd.

---

## Item 4 — Production session-secret enforcement

**Current code reality.**
- [Certain] `lib/auth.ts:66-84`:
  - `getSessionSecret()` throws in production when `SESSION_SECRET` is unset, so login fails.
  - `getSessionSecretSafe()`, used by `middleware.ts` to verify sessions, falls back to the constant `DEV_FALLBACK`, which is committed in the repository.
  - A token signed with that constant passes the middleware in production when the variable is unset (G-6).
- [Certain] The public `/api/health` reports `auth.configured`, which tells an attacker whether this applies.
- [Certain] `docker-entrypoint.sh` does not check the variable.

**Files / modules affected.** `lib/auth.ts`, `middleware.ts`, `docker-entrypoint.sh`, `app/api/health/route.ts`.

**Tests required first.**
- `NODE_ENV=production`, secret unset → the middleware rejects every session, including one signed with `DEV_FALLBACK`.
- `NODE_ENV=production`, secret shorter than 32 characters → startup refuses.
- `NODE_ENV=development` → the current dev behaviour is unchanged.
- Public health output contains no auth configuration detail.

**Implementation change.**
- The middleware uses a secret getter that returns "no valid secret" in production, so verification fails closed.
- The entrypoint exits when `SESSION_SECRET` is missing or short.
- Remove `auth.configured` from the public health payload. Keep it in authenticated diagnostics.

**Acceptance criteria.** The tests pass. A production container without the secret does not start. A forged `DEV_FALLBACK` token gets a 401.

**Dependencies.** Item 1.

**Risk if done incorrectly.** Locking the founder out of production when the secret is set but is read differently by the edge middleware and the Node runtime. Test both runtimes.

**Recommended order:** 4th. It is small and independent.

---

## Item 5 — Strict approval state machine

**Constitution:** §5.
- Only `pending` may become `approved` or `rejected`.
- A decided approval never changes again.
- An approval is never created in a decided state.
- An approval for an action type that has an executor is never auto-approved.

**Current code reality.**
- [Certain] `app/api/workforce-approvals/[id]/route.ts` accepts `approved` / `rejected` from **any** current state, so rejected → approved works.
- [Certain] Approving twice re-runs `dispatchApprovalAction`. That creates duplicate drafts, then a 500 on the `ActionResult.approvalId` unique constraint (D-8).
- [Certain] `app/api/workforce-approvals/route.ts` passes the request body straight to `prisma.approval.create`. A caller can create an approval already `approved`, with any `decisionType` (G-5).
- [Certain] `lib/governance/approval-triage.ts` sets the extra status `auto_approved` for `low`-risk approvals after 48 h. The only barrier against executing one is a keyword list plus the string mismatch with executors that look for `approved` (G-3).
- [Certain] `lib/actions/followup-scheduler.ts` creates external-email approvals with `riskLevel: "low"` hard-coded.
- [Certain] Approval creators:
  - `lib/actions/followup-scheduler.ts`
  - `lib/actions/invoice-executor.ts`
  - `lib/actions/subscription-executor.ts` (×2)
  - `lib/ai-ventures/prospect-engine.ts`
  - `lib/company/capital-allocator.ts`
  - `lib/workforce/executor.ts`
  - `lib/workforce/handoff-engine.ts`
  - `app/api/workforce/outputs/[id]/to-approval/route.ts`
  - `app/api/workforce-approvals/route.ts`
- [Certain] The legacy `ApprovalQueue` (`lib/approvalExecutor.ts`, `lib/agentEngine.ts`) is a second approval boundary (G-11).

**Files / modules affected.**
- New `lib/governance/approval-state.ts`:
  - `createApproval()` always sets `pending`, using whitelisted fields;
  - `decideApproval(id, decision, actor)` is a compare-and-swap `updateMany where status = "pending"`. A count of 0 returns 409. Dispatch only after a successful transition.
- `app/api/workforce-approvals/route.ts` and `[id]/route.ts`.
- Every creator listed above → `createApproval()`.
- `lib/governance/approval-triage.ts`: remove all auto-approval (FD-G). Keep scoring, escalation and reminders. No internal allowlist. Remove the hard-coded `low` risk in the follow-up scheduler.
- `lib/actions/approval-dispatcher.ts`: idempotent on `ActionResult` (upsert, not create).
- Legacy `ApprovalQueue` executor: confined to its internal-only whitelist, or disabled, so that it cannot dispatch any action type that has an executor.

**Tests required first.**
- Every illegal transition is rejected:
  - rejected → approved;
  - approved → rejected;
  - approved → approved;
  - any state → pending.
- Double approve → exactly one dispatch and no 500.
- Two concurrent approve requests → one wins, the other gets 409.
- `POST` with `status: "approved"` → stored as `pending`. Unknown fields are ignored.
- A simulated 30 days of ticks with the fake clock → triage changes no approval's status. It escalates only.
- A grep-style test: `prisma.approval.create` / `.update` is called only inside `approval-state.ts`.

**Implementation change.** As above. Existing rows with `auto_approved` are left as they are; they are not executed and are not converted. A data note is recorded for the founder.

**Acceptance criteria.** The tests pass. Decide shows the 409 case as "already decided".

**Dependencies.** Item 1; FD-G (decided).

**Risk if done incorrectly.**
- Transitioning without compare-and-swap keeps the race.
- Dispatching before the transition commits allows two dispatches.
- Silently migrating `auto_approved` → `approved` would execute old, unreviewed actions.

**Recommended order:** 5th.

---

## Item 5A — Database safety baseline (moved forward from item 15)

**Constitution:** §19 item 5A (founder decision FD-002) and §13.1.
- Establish a versioned migration baseline.
- Create and verify a production backup.
- Prove the restore procedure on a copy or test environment where possible.
- No schema change for items 6–14 is applied before 5A is complete.

**Current code reality.**
- [Certain] `docker-entrypoint.sh` runs `prisma db push --skip-generate` on **every container start, in both containers** (web and runtime). There is no migration history and no rollback (P-6). A destructive change crash-loops both containers.
- [Certain] The PostgreSQL branch calls `migrate deploy`, but there is no `prisma/migrations/` folder.
- [Certain] The seed and the BU backfill run on every start and are non-fatal.
- [Certain] `scripts/backup-db.sh`:
  - expects host cron and the host path `/data/mioos.db`, but the database lives in a named Docker volume;
  - `sqlite3` is not in the image, so it falls back to `cp` of a live WAL database, which can be inconsistent;
  - keeps no off-server copy, has no restore procedure, and is [Likely] not running (P-7).
- [Certain] Locally, four stale databases exist under `prisma/` (P-13). None of them represents production.
- [Certain] Production has never been inspected from this workspace. Its actual schema is unknown here.

**Files / modules affected.**
- New `prisma/migrations/0_baseline/`: generated with `prisma migrate diff` **from the production database's actual schema**, compared against `schema.prisma`. Any difference is resolved before the baseline is accepted. Production is then marked baseline-applied with `prisma migrate resolve --applied`.
- `docker-entrypoint.sh`:
  - the web container alone runs `prisma migrate deploy`;
  - the runtime container waits for the expected schema version and never migrates;
  - `db push` is removed from the production path.
- `docker-compose.prod.yml`: start order (runtime after web is healthy).
- `package.json` scripts and `.github/workflows/ci.yml`: CI applies migrations to a scratch database and fails on drift against `schema.prisma`.
- `scripts/backup-db.sh` → a consistent snapshot that does not need the `sqlite3` binary (`VACUUM INTO` via Prisma `$executeRawUnsafe`), compressed, with a checksum.
- New `docs/RESTORE_RUNBOOK.md`, first version: how to restore a snapshot into a fresh volume and verify it.

**Tests required first.**
- CI: migrations apply cleanly to an empty database, and the result equals `schema.prisma`.
- CI: the baseline applied to a copy of a database with the current schema is a no-op (`migrate resolve` path).
- Backup test: a snapshot taken while the fake runtime is writing opens and passes `PRAGMA integrity_check`.
- Entrypoint test: the runtime container never runs a migration command, and no production path calls `db push`.

**Implementation change.** As above.

The two production steps require an explicit founder go and are run by the founder or under founder supervision:
- taking the production backup;
- marking the baseline as applied.

**Acceptance criteria.**
- The tests pass.
- One production backup has been created, its checksum recorded, and verified with `integrity_check` and row counts.
- That backup has been restored into a scratch volume or local copy, the app has started against it, and the row counts match. If a full restore is impossible, the gap is written down in the runbook as an open 15 item.
- Production runs the baseline through `migrate deploy` with no schema change.

**Dependencies.** Items 1 and 5 (in sequence only; no code dependency); FD-H (decided: SQLite, Litestream not required).
- `scripts/migrate-workforce-reality.ts` may run in production only after this item's verified backup exists.

**Risk if done incorrectly.**
- A baseline generated from the local stale databases, or from `schema.prisma` alone, can differ from production. The first `migrate deploy` may then try to recreate or drop tables.
- Marking the baseline applied on a database whose schema differs hides the drift until a later migration fails.
- A backup taken with `cp` on a live WAL database can be silently inconsistent. Only an integrity-checked snapshot counts.

**Recommended order:** after item 5, before item 6 (Constitution §19).

---

## Item 6 — Approvals bound to immutable execution payloads

**Constitution:** §5. One action against one payload, bound by a stored hash. A changed payload invalidates the approval.

**Current code reality.**
- [Certain] `Approval` stores only a title and description, with no payload or hash.
- [Certain] At execution, recipient, subject and body are read from the mutable `EmailDraft` row, which is editable via `app/api/drafts/[id]/route.ts`. Invoice and subscription amounts and customers are read from `WorkforceOutput.content` (G-4).
- [Certain] What was approved and what is executed can differ.

**Files / modules affected.**
- `prisma/schema.prisma`: `Approval.payload` (canonical JSON snapshot), `Approval.payloadHash` (sha256), `Approval.invalidatedAt`. Applied through a versioned migration (item 5A).
- New `lib/governance/payload.ts`: canonical serialization (sorted keys, normalized whitespace and amounts in integer cents) and the hash.
- Creators: `lib/ai-ventures/prospect-engine.ts`, `lib/actions/followup-scheduler.ts`, `lib/actions/invoice-executor.ts`, `lib/actions/subscription-executor.ts`.
- Executors (`lib/actions/executor.ts`, the invoice and subscription executors) execute **from the snapshot**. They verify the hash before the side effect, and refuse and record on mismatch.
- `app/api/drafts/[id]/route.ts`: editing a draft whose approval is pending rejects that approval (reason "payload changed") and creates a new pending one. Editing a draft whose approval is approved but not yet executed sets `invalidatedAt`, and executors refuse it.
- `components/decide/DecideView.tsx`: shows the exact payload being authorized (§16 / CLAUDE.md Decide rules).

**Tests required first.**
- Approve, then edit the draft body → no send, a mismatch is recorded, and a new approval is required.
- Approve, then edit the recipient → no send.
- The executor sends exactly the snapshot, byte for byte, even when the draft row differs.
- Hash stability: the same payload with different key order gives the same hash.
- Invoice: an amount changed in `WorkforceOutput.content` after approval → no Stripe call.

**Implementation change.** As above. Approvals without a payload (legacy rows) are never executable by an executor.

**Acceptance criteria.** The tests pass. Every executable `decisionType` has a payload and a hash at creation (enforced in `createApproval()`).

**Dependencies.** Items 1 and 5; **5A** (first schema change, via migration).

**Risk if done incorrectly.**
- A non-canonical serialization produces false mismatches and blocks legitimate sends.
- Hashing the draft but executing from the row keeps the bug.
- Letting legacy approvals without a payload execute keeps a hole open.

**Recommended order:** 6th, after 5A.

---

## Item 7 — Connector modes enforced in execution code

**Constitution:** §9. `disabled`, `read_only`, `draft_only`, `approval_required` and `autonomous_limited` are enforced in code. A connector is listed as implemented only if code uses it.

**Current code reality.**
- [Certain] The `ConnectorConfig` model (`slug`, `status`, `mode`, default `disabled`) is read and written only by `lib/integrations/connector-catalog.ts` and `app/api/integrations/[id]/mode/route.ts`.
- [Certain] No executor or connector reads the mode. Disabling SMTP in the UI does not stop sending (G-2).
- [Certain] Eight catalog entries are marked implemented without an implementation: Shopify, Printful, Printify, Meta Ads, Google Ads, Gmail, YouTube, Google Drive and "Paper Trading".
- [Certain] Five real integrations are missing from the catalog: IMAP, web search, website fetch, alerts and LLM providers.

**Files / modules affected.**
- New `lib/governance/connector-policy.ts`: `assertConnectorMode(slug, operation)`. A missing row means `disabled`, which fails closed.
- Calls from:
  - `lib/actions/executor.ts` (smtp, write);
  - `lib/actions/invoice-executor.ts` and `subscription-executor.ts` (stripe, write);
  - `lib/connectors/email.ts` (imap, read);
  - `lib/connectors/webSearch.ts` (search, read);
  - `lib/ai-ventures/website-analyzer.ts` (fetch, read);
  - `lib/alerting/alert-manager.ts` (alerts, write);
  - `lib/ai/provider.ts` (llm, read).
- `lib/integrations/connector-catalog.ts`: placeholders → `planned`; add the five missing connectors.
- `app/api/integrations/[id]/mode/route.ts`: in Phase 0, refuse `autonomous_limited` for every connector that has an executor.

**Tests required first.**
- SMTP `disabled` → no send. `draft_only` → no send. `approval_required` + approved + hash match → send.
- No config row → treated as `disabled`.
- Stripe `read_only` → no writes.
- IMAP `disabled` → reply detection reports unavailable, which halts follow-ups (item 11).
- The catalog test: every entry marked implemented has a code path the test can reach.

**Implementation change.** One policy check inside the governance gate. The catalog becomes truthful.

**Acceptance criteria.** The tests pass. The Integrations UI shows the enforced mode and no placeholder as implemented.

**Dependencies.** Items 1, 2 and 6 (the gate order in §7: connector before approval execution).

**Risk if done incorrectly.**
- The defaults for new rows could silently enable a connector.
- If LLM connectors default to `disabled`, the whole internal pipeline stops. That is correct while there are no credentials, but the migration must seed explicit modes, and the seed values must be founder-reviewed.

**Recommended order:** 7th.

---

## Item 8 — Duplicate scheduling paths removed

**Constitution:** §13. One canonical production runtime. No second scheduler executes the same work.

**Current code reality.**
- [Certain] `instrumentation.ts` starts the legacy `startScheduleRunner(60_000)` (`lib/scheduleRunner.ts`) inside the **web** container in production (P-14).
- [Certain] `app/api/runtime/trigger/route.ts` runs `processQueueItems()`, `runDueSchedules` and `runAutonomousWorkforce` concurrently with the worker.
- [Certain] `app/api/agents/schedule/tick/route.ts` runs `runDueSchedules`.
- [Certain] `app/api/executive-loop/run/route.ts` runs `runExecutiveLoop`.
- [Certain] `app/api/assignments/[id]/execute/route.ts` calls `executeAssignment` directly (D-2).
- [Certain] Legacy double trigger: `agentEngine.ts` and `scheduleRunner.ts` both fire `triggerWorkflows` (D-9).
- [Certain] `enqueueTeamWork` (`lib/workforce/team-work-scheduler.ts`) has no callers. It is dead code.

**Files / modules affected.**
- `instrumentation.ts`: remove the runner start.
- `lib/scheduleRunner.ts`, `lib/agentEngine.ts` (legacy): retire, or make them unreachable from production.
- `app/api/runtime/trigger/route.ts`: becomes a "run soon" request flag that the worker consumes under its lease.
- `app/api/agents/schedule/tick/route.ts`, `app/api/executive-loop/run/route.ts`: removed or disabled in production.
- `app/api/assignments/[id]/execute/route.ts`: enqueue only, never execute.
- `lib/workforce/autonomous-engine.ts`, `lib/workforce/team-work-scheduler.ts`: no production entry point.

**Tests required first.**
- With `NODE_ENV=production`, starting the web server starts no scheduler.
- Calling every manual route while the worker runs → the work happens exactly once, through the worker.
- `executeAssignment` invoked twice for one assignment → one output, one approval set, one pipeline advance (D-2; idempotency guard added here).
- A legacy scheduled run triggers downstream workflows once.

**Implementation change.** Remove or neutralize the entry points. Add an idempotency guard on `executeAssignment` (refuse unless the assignment is in a claimable state, claimed with compare-and-swap).

**Acceptance criteria.** The tests pass. A grep of production entry points shows exactly one path into loop work: `runtime/runtime-worker.ts`.

**Dependencies.** Items 1 and 3 (the lease).

**Risk if done incorrectly.** Removing a route the UI depends on breaks a screen. Check every caller in `components/`, and replace "run now" buttons with the request flag rather than deleting them.

**Recommended order:** 8th.

---

## Item 9 — Idempotent external execution

**Constitution:** §5 and §13. Actions are idempotent and auditable. Critical external actions carry deterministic idempotency keys. §14: ambiguous payment state is never retried blindly.

**Current code reality.**
- [Certain] **Email.**
  - `lib/actions/executor.ts` claims each draft with compare-and-swap (`draft|ready → sending`), and a failure marks it `failed` without retry. Both are correct.
  - A crash after the SMTP send and before the database update leaves the draft in `sending` forever, with no reconciliation and no alert.
  - The SMTP Message-ID is provider-generated, so there is no deterministic key.
- [Certain] **Stripe.**
  - `lib/providers/payment.ts` makes four sequential calls (customer, invoice item, invoice, finalize) with no `Idempotency-Key`.
  - On failure the executor releases its claim, so the next tick restarts from the top with a new customer, every 60 s, without bound (D-6). Subscriptions behave the same.
  - A crash after Stripe succeeds leaves `externalRef = "pending:<id>"` with no alert.
- [Certain] **Webhook.** `app/api/webhooks/stripe/route.ts` verifies the signature but has no event de-duplication and no ordering protection (D-7). It is unreachable anyway, because `middleware.ts` `PUBLIC_EXACT` does not include it.

**Files / modules affected.**
- `prisma/schema.prisma`: `ActionResult.idempotencyKey @unique`, and `ActionResult.status` adds `ambiguous`. Webhook event de-duplication needs a processed-event record: a small `ProcessedWebhookEvent` table (infrastructure, not an economic object). [Likely] This is acceptable under §5's "no new parallel models", because it models no canonical concept; the founder confirms.
- New `lib/governance/idempotency.ts`: `key = sha256(approvalId + payloadHash + step)`.
- `lib/providers/payment.ts`: send `Idempotency-Key` on every write, one per step. On uncertainty, look up by key or metadata before any retry.
- `lib/actions/invoice-executor.ts`, `lib/actions/subscription-executor.ts`:
  - classify each error as definite or ambiguous;
  - definite transient errors → bounded retries with backoff and a maximum attempt count, then escalate;
  - ambiguous → `ambiguous`, no retry, founder alert.
- `lib/actions/executor.ts`, `lib/providers/email.ts`:
  - deterministic Message-ID derived from the key;
  - an `ExecutionHistory` row written **before** the send;
  - a reconciler that flags `sending` older than N minutes as ambiguous, with an alert and no resend.
- `app/api/webhooks/stripe/route.ts`: de-duplicate on event id; ignore out-of-order subscription status regressions. `middleware.ts`: the public route for the webhook, **signature-verified only**. Opening it is part of this item, because idempotency cannot be proven on an unreachable path.

**Tests required first.**
- The fake Stripe models idempotency-key replay. Each of the four calls fails once → exactly one customer, one invoice item, one invoice.
- Crash after finalize, before the database update → the next run reconciles by key and creates no new objects.
- An ambiguous error (timeout after the request was sent) → status `ambiguous`, zero retries, alert raised.
- A definite error repeated → stops after the maximum attempts and escalates. There is no unbounded loop under the fake clock over 24 h.
- Email: crash after send → the draft is flagged ambiguous, never resent.
- Webhook: the same event twice → one effect. `subscription.updated` after `deleted` → no resurrection. Invalid signature → 400. Reachable without a session.

**Implementation change.** As above.

**Acceptance criteria.** The tests pass. No external write path exists without a deterministic key and a recorded attempt.

**Dependencies.** Items 1, 2 and 6 (`payloadHash` is part of the key); 5A (schema).

**Risk if done incorrectly.**
- Keys that include non-deterministic data (timestamps, random ids) defeat idempotency.
- Reusing a key across different payloads makes Stripe return the first result for a different request.
- Opening the webhook route without signature verification creates a forged-payment entry point.

**Recommended order:** 9th.

---

## Item 10 — Budgets, hard spend caps and cost accounting per Business Unit

**Constitution:** §10. Hard caps per unit for LLM, search/API, advertising, tools, financial exposure, daily activity and monthly activity.
- Dormant units have 0 in every category.
- Spend is recorded as it occurs.
- A provider-side limit is set on every paid account.
- No unbounded retry.
- Outreach has a daily send cap.

**Current code reality.**
- [Certain] `BusinessUnit.budgetCents` exists and is unused ("enforced later").
- [Certain] No token, cost or spend is recorded for LLM, search or fetch (G-7, RA-9).
- [Certain] `lib/ai/provider.ts` uses `max_tokens: 4096`. Its timeout is a `Promise.race` without abort, so a timed-out request keeps running and is billed (P-5).
- [Certain] Retry-every-tick paths:
  - a prospect whose analysis throws before `recommendedOffer` is written is re-analysed every 60 s (`lib/ai-ventures/discovery.ts`);
  - Stripe executors (item 9);
  - legacy schedules (item 8).
- [Certain] There is no outreach send cap. `OUTBOUND_EMAIL_BATCH` is a per-tick batch size, not a cap.
- [Certain] Interval and count throttles exist in `lib/autonomy-throttle.ts`.

**Files / modules affected.**
- `prisma/schema.prisma`: budget policy per BU and category (cap, period, used), plus a new `CostEntry` model (FD-D, Constitution §5). `CostEntry` has `businessUnitId`, category, period, provider reference and an integer-cents amount, the same conventions as `RevenueEntry`.
- New `lib/governance/budget.ts`:
  - `reserve(buId, category, estimateCents)` before the call, then `settle(actualCents)` after;
  - deny when the state is unreadable or over the cap.
- Callers:
  - `lib/ai/provider.ts` (token usage → cost; AbortController on timeout);
  - `lib/connectors/webSearch.ts`;
  - `lib/ai-ventures/website-analyzer.ts`;
  - `lib/ai-ventures/discovery.ts` (attempt counter per prospect, bounded);
  - `lib/actions/executor.ts` (daily send cap as an "activity" category);
  - Stripe executors (financial exposure).
- `lib/autonomy-throttle.ts`: keep it, but it is no longer the spend control.
- Founder manual step: set provider-side spend limits on every paid account.

**Tests required first.**
- Each paid call writes exactly one `CostEntry` with BU, category, period (Europe/Amsterdam) and integer cents.
- Advertising cap is 0 → any ad spend is denied. Financial exposure is 0 → any financial action is denied until the invoice/payment phase is explicitly enabled (FD-F).
- LLM cap reached → the next LLM call is denied before any request is made, and the step records "budget exhausted".
- Budget state unreadable → denied.
- Dormant unit → every category denies at 0.
- A timed-out LLM call is aborted. The fake asserts the request was cancelled.
- A prospect whose analysis always throws → analysed at most N times over a simulated 24 h.
- The daily send cap → the (cap + 1)th approved send is deferred to the next day, and the approval is not consumed.
- Day boundaries use a configured timezone (Europe/Amsterdam), not server time (P-12).
- 24 h simulated soak: total recorded spend ≤ caps.

**Implementation change.** As above.

**Acceptance criteria.** The tests pass. The remaining budget per unit and category is visible to the founder. The provider-side limits are documented as set.

**Dependencies.** Items 1 and 2; FD-D (decided); FD-F, decided in part. The LLM, search and tool cap values remain open and come from the item 1 measurement; 5A (schema).
- Budgets attach to existing `BusinessUnit` ids. These ids survive item 12's slug rename, so item 10 does not have to wait for item 12.

**Risk if done incorrectly.**
- Recording cost after the call, without reserving first, lets concurrent calls overshoot.
- Estimates that are too low make the cap fictional. Settle against the provider's reported usage.
- Caps with no founder-visible exhaustion state look like a broken runtime.

**Recommended order:** 10th.

---

## Item 11 — Outreach suppression list, opt-out handling and send caps

**Constitution:** §12.1.
- A suppression list is checked before every send.
- Every message carries an opt-out, and opt-outs go to the list.
- Follow-ups stop on reply, opt-out, bounce and lost.
- There are no follow-ups while reply detection is unavailable.
- The daily send cap applies.
- The founder confirms legal compliance before the first production send.

**Current code reality.**
- [Certain] There is no suppression list, opt-out or bounce handling anywhere in `lib/` or `app/` (G-8).
- [Certain] Contact addresses are regex-harvested from homepages (`lib/ai-ventures/website-analyzer.ts`).
- [Certain] **Reply detection.**
  - `lib/connectors/email.ts` searches the last 24 h only, at most 30 messages (`lib/actions/reply-matcher.ts`).
  - It returns silently when IMAP is unconfigured or erroring.
  - `scheduleFollowups` runs regardless (G-9).
- [Certain] No check excludes prospects marked lost or rejected from follow-ups.
- [Certain] There is no record of the founder's legal-compliance confirmation.

**Files / modules affected.**
- `prisma/schema.prisma`: a suppression list (address and domain, reason, source, created). The founder's legal confirmation is stored in `SystemConfig`.
- New `lib/governance/outreach-policy.ts`:
  - `isSuppressed()`;
  - `assertOutreachAllowed()`: suppression, legal confirmation, send cap (from item 10), prospect state.
- `lib/ai-ventures/prospect-engine.ts` and `lib/actions/followup-scheduler.ts`:
  - check at draft time;
  - add an opt-out footer to the payload (it is hashed, item 6);
  - add a `List-Unsubscribe` header via `lib/providers/email.ts`.
- `lib/actions/executor.ts`: check immediately before the send. Refuse when the opt-out is missing from the payload.
- `lib/connectors/email.ts`, `lib/actions/reply-matcher.ts`:
  - gap-free scanning from the last successfully processed UID;
  - bounce (DSN) detection;
  - deterministic opt-out rules (for example "unsubscribe", "afmelden", "stop", "remove me") that write to suppression;
  - a health record (last successful scan and its coverage) in `RuntimeState`.
- `lib/actions/followup-scheduler.ts`: run only while detection is healthy. Stop on reply, opt-out, bounce or lost.

**Tests required first.**
- Suppressed address → no draft, and no send even when an approved draft exists.
- Suppressed domain → the same result for every address at that domain.
- A sent payload without the opt-out footer → refused.
- An inbound "please unsubscribe" → suppression is written within one scan, and pending follow-ups for that prospect are cancelled.
- A DSN bounce → the address is suppressed and the sequence stops.
- IMAP failing, or a gap in the scan → zero follow-ups are scheduled or sent.
- 45 messages arriving in one window → all are scanned (no 30-message cap).
- Prospect lost or rejected → no follow-up.
- Legal confirmation missing → the first send is refused.
- The 11th approved outreach send on one Europe/Amsterdam day is deferred to the next day (cap 10, FD-F).
- No third follow-up is ever drafted for a prospect (maximum 2, FD-F).

**Implementation change.** As above.

**Acceptance criteria.** The tests pass. The founder can view and add to the suppression list. The legal confirmation is recorded with a date.

**Dependencies.** Items 1, 2, 6, 7 and 10; 5A (schema). FD-F values: 10 outreach sends per day, at most 2 follow-ups.

**Risk if done incorrectly.**
- An opt-out keyword list that is too narrow misses opt-outs. That is a legal and reputational exposure. Ambiguous replies must be treated as opt-out (`FIRST_REVENUE_LOOP.md` stage 8).
- A footer added by the executor *after* hashing breaks payload binding.
- A suppression check only at draft time misses an opt-out received between draft and send.

**Recommended order:** 11th.

---

## Item 12 — Canonical Business Unit ownership; unit status enforced

**Constitution:** §2.0, §4 and §5.
- Every material record belongs to a BU, written at creation.
- Dormant units receive zero runtime, zero budget and no assignments, LLM calls, searches or opportunities.

**Current code reality.**
- [Certain] `BusinessUnit.slug` values in the database are still `ai-ventures`, `content`, `ecommerce` and `capital`. Seven files in `lib/`, `app/`, `runtime/` and `scripts/` reference `"ai-ventures"` literally.
- [Certain] `BusinessUnit.status` uses `active | paused | inactive`. There is no `operational` or `dormant`.
- [Certain] `businessUnitId` is nullable on `Approval`, `RevenueEntry` and `WorkforceOutput` (and others), and is filled by backfill (`scripts/backfill-business-units.ts`, run from `docker-entrypoint.sh` on every start).
- [Certain] `WorkforceTeam` has no `businessUnitId`.
- [Certain] Dormant containment exists only as data. `scripts/migrate-workforce-reality.ts` pauses teams and cancels work, and **it has not been run in production**. No runtime check of unit status exists.

**Files / modules affected.**
- `prisma/schema.prisma`:
  - `BusinessUnit.status` values `operational | dormant`;
  - `WorkforceTeam.businessUnitId`;
  - after the backfill is verified, non-null `businessUnitId` on new rows of the canonical objects.
- Slug migration `ai-ventures → mio-solutions`, `content → mio-media`, `ecommerce → mio-commerce`, `capital → mio-capital`. Ids are kept, so references stay valid.
- `lib/businessUnits/config.ts`, `scripts/backfill-business-units.ts`, `scripts/migrate-workforce-reality.ts` (reconcile with the new status values before its production run).
- The seven `"ai-ventures"` literals.
- New `lib/governance/unit-policy.ts`: `assertUnitOperational(buId)`, fail closed.
- Called from:
  - `runtime/runtime-loop.ts` (per step);
  - `lib/workforce/objective-evaluator.ts`, `lib/workforce/handoff-engine.ts`;
  - `lib/opportunity-engine.ts`;
  - `lib/company/research-engine.ts`, `lib/company/capital-allocator.ts`;
  - `lib/ai/provider.ts` (an LLM call must name its BU);
  - every executor.
- Creators: write `businessUnitId` at creation. Remove the entrypoint backfill once creation-time attribution is proven.
- `lib/businessUnits/rollup.ts`, `app/api/business-units/`.

**Tests required first.**
- A simulated tick → no assignment, LLM call, search, opportunity or approval for a dormant unit.
- A handoff into a dormant unit's team → refused.
- Every row created by the pipeline in a simulated tick has a non-null, valid `businessUnitId` (audit test 11).
- Team resolution is deterministic when several teams share a `departmentType` (audit BU-3).
- An LLM call without a BU → refused.
- Unit status unreadable → denied.

**Implementation change.** As above.

**Acceptance criteria.**
- The tests pass.
- Querying the production database after migration shows the four `mio-*` slugs, the correct statuses, and zero new null-`businessUnitId` rows over a 24 h soak.

**Dependencies.**
- Items 1 and 10 (dormant caps of 0 are enforced through budgets as well);
- 5A (schema, migration);
- the production run of `scripts/migrate-workforce-reality.ts`, which needs a verified backup and must be reconciled with the new statuses first.

**Risk if done incorrectly.**
- Renaming slugs without updating every literal breaks the existing outreach loop.
- Making `businessUnitId` non-null before the backfill is complete makes writes fail.
- Making the unit check fail open turns a database error into dormant units running.

**Recommended order:** 12th.

---

## Item 13 — Forecast separated from real revenue

**Constitution:** §5.
- `RevenueEntry` holds real money only: invoiced, collected, recurring per period, refunds. Each row has an explicit kind, a BU and a provider reference.
- Forecast and pipeline stay on `Opportunity`.

**Current code reality.**
- [Certain] `lib/opportunity-engine.ts:350-365` writes `[Potential]` `RevenueEntry` rows from `Opportunity.estimatedRevenue`, with `probability = confidence * 10`.
- [Certain] `lib/company/department-pipeline.ts` can repeat that every tick when a pipeline fails to start (D-10).
- [Certain] `revenueType` uses `pipeline | potential | live | closed`. `app/api/company/dashboard/route.ts` sums `mrr / arr / one_time`, which nothing writes (RA-3).
- [Certain] The probability scale is mixed (0–1 vs 10–100) across `app/api/revenue/route.ts`, `lib/businessUnits/rollup.ts` and `lib/executive/executive-analysis.ts` (RA-2).
- [Certain] `invoice-executor.ts` moves an issued invoice to `potential`.
- [Certain] Recurring payments overwrite one row instead of one row per period (RA-6).
- [Certain] Money is stored as `Float` euros and as `Int` cents (RA-8).
- [Certain] `detectRevenueGap` in `lib/executive-orchestrator.ts` counts AI "potential" as pipeline (RA-10).
- [Certain] `app/api/revenue-entries/route.ts` passes the raw body to Prisma.

**Files / modules affected.**
- `prisma/schema.prisma`:
  - `RevenueEntry.kind` (`invoiced | collected | recurring | refund`); costs never go in `RevenueEntry` (FD-D, `CostEntry`);
  - an integer-cents amount;
  - a provider-reference uniqueness rule.
- The writers: `lib/opportunity-engine.ts`, `lib/company/department-pipeline.ts`, `lib/actions/invoice-executor.ts`, `lib/actions/subscription-executor.ts`, `lib/providers/payment.ts` (`markInvoicePaid`), `app/api/webhooks/stripe/route.ts`. Each `invoice.paid` writes its own period row.
- One canonical rollup module, used by `app/api/revenue/route.ts`, `app/api/company/dashboard/route.ts`, `lib/businessUnits/rollup.ts`, `lib/executive/executive-analysis.ts` and `lib/executive-orchestrator.ts`.
- `app/api/revenue-entries/route.ts`: whitelisted fields only. Manual founder entries carry a kind and are marked manual.
- Data migration for existing rows:
  - `potential` / `pipeline` rows → the value is copied to the linked `Opportunity` when it is missing there;
  - the rows are archived (not deleted), with a report to the founder.

**Tests required first.**
- Routing an opportunity with an estimate → zero `RevenueEntry` rows.
- A failed pipeline start repeated over 24 h of ticks → zero `RevenueEntry` rows.
- Two monthly `invoice.paid` events → two `recurring` rows with distinct provider references.
- Every screen's revenue total equals the canonical rollup. Collected excludes invoiced. Forecast is reported separately.
- `POST /api/revenue-entries` with unknown fields → ignored.

**Implementation change.** As above.

**Acceptance criteria.** The tests pass. After migration, no `RevenueEntry` row is a forecast. Today and Workforce show real revenue and forecast as visibly separate figures.

**Dependencies.** Items 1 and 9 (webhook de-duplication) and 10 (`CostEntry`, needed for margin); 5A (schema).

**Risk if done incorrectly.**
- Deleting legacy rows instead of archiving them loses the founder's manual entries.
- Converting Float to cents with rounding errors.
- Leaving one screen on the old formula keeps two "truths".

**Recommended order:** 13th.

---

## Item 14 — Assignment ↔ approval lifecycle link and closure

**Constitution:** §5. An assignment waiting on an approval is closed when the approval is decided: completed on approval, closed as rejected on rejection.

**Current code reality.**
- [Certain] `app/api/workforce-approvals/[id]/route.ts` changes only the approval. Nothing moves an assignment out of `review` (P-8). Locally, 37 of 86 assignments sit in `review`, and teams look permanently busy.
- [Certain] **There is no structural link from an approval to its assignment.** `Approval.relatedOutputId` points to a `WorkforceOutput`, and `WorkforceOutput` has no assignment reference.

**Files / modules affected.**
- `prisma/schema.prisma`: `Approval.assignmentId`, set at creation by `createApproval()` (item 5) wherever an assignment produced the approval.
- `lib/governance/approval-state.ts` (`decideApproval`): closes the assignment in the same transaction as the transition.
- `lib/workforce/executor.ts`, `lib/workforce/handoff-engine.ts`, `lib/ai-ventures/prospect-engine.ts`: pass the assignment id.
- A one-off data step for existing assignments in `review` whose approvals are already decided. It is recorded, not silent. Assignments with no derivable link are listed for the founder rather than guessed (CLAUDE.md "never guess").

**Tests required first.**
- Approve → the linked assignment becomes `completed` in the same transaction.
- Reject → it is closed as rejected.
- A crash between the two writes is impossible: one transaction, asserted by injecting a failure.
- An approval with no assignment → the decision succeeds, and nothing else changes.
- After a simulated week, no assignment is in a waiting state whose approval is final.

**Implementation change.** As above.

**Acceptance criteria.** The tests pass. The production count of assignments waiting on decided approvals is 0 after the data step.

**Dependencies.** Item 5 (the same function); 5A (schema).
- [Likely] It is efficient to build 14 together with 5. That is a sequencing convenience, not a reordering: 14 is proven and marked done only in its place.

**Risk if done incorrectly.**
- Closing assignments by guessing the link (for example by title or team) closes the wrong work.
- Closing outside the transaction recreates the stuck state on a crash.

**Recommended order:** 14th. The code can be written with item 5.

---

## Item 15 — Complete production migration and backup hardening

**Constitution:** §19 item 15 and §13.1. Its credentials fall under the safety-infrastructure exception (§19). Automated off-server backups, retention, restore testing and an operational runbook.

**Current code reality.**
- After 5A: a migration baseline, the entrypoint on `migrate deploy`, one verified backup and a first restore proof exist.
- [Certain] Today there is no scheduled backup, no off-server copy, no encryption, no retention beyond the script's local 14-day prune, no recurring restore test and no runbook.

**Files / modules affected.**
- The backup job from 5A, extended:
  - encrypted (age or gpg); the key is held by the founder and never stored on the production server (FD-E);
  - uploaded to S3-compatible object storage with versioning enabled, preferably Hetzner Object Storage (FD-E). A same-server copy never counts;
  - scheduled on the host (cron or a systemd timer) or as a sidecar container.
- Retention policy: daily copies for 14 days plus monthly copies for 12 months, enforced on the remote side.
- Monitoring: a failed or missing backup raises a founder alert through the external monitor from item 3.
- `docs/RESTORE_RUNBOOK.md`, completed:
  - the restore procedure;
  - a rollback procedure per migration (a reversing migration, or restore-from-backup with a stated data-loss window);
  - a quarterly restore drill and the drill log.
- `docs/deployment-production.md`: updated.

**Tests required first.**
- Upload test against a fake object store: an encrypted file arrives, and it is not readable without the key.
- Retention test with the fake clock: the right copies are kept and pruned.
- Alert test: a skipped or failed backup produces a founder alert.
- Restore drill performed from an **off-server** copy: download → decrypt → restore → app starts → row counts match.

**Implementation change.** As above.

**Acceptance criteria.**
- The tests pass.
- Off-server backups appear on schedule for 7 consecutive days.
- A restore from an off-server copy has been performed and logged with its date.
- The runbook is complete and has been followed once end to end.
- No production container runs `db push`.

**Dependencies.** 5A; item 3 (external alerting); FD-E (decided); OQ-2. Litestream may be evaluated here (FD-H); it is optional.

**Risk if done incorrectly.**
- Unencrypted off-server backups leak prospect personal data (GDPR).
- An encryption key stored on the same server defeats the off-server copy.
- Backups that are never restored are assumed, not proven.

**Recommended order:** 15th, last.

---

## Recommended implementation order

| Step | Item | Note |
|---|---|---|
| 1 | 1 — Test harness | Required first |
| 2 | 2 — Emergency Stop | Fixes the fail-open read |
| 3 | 3 — Single-flight, fail-fast, liveness | |
| 4 | 4 — Session secret | Small, independent |
| 5 | 5 — Approval state machine | Item 14 code can be written alongside |
| 5A | 5A — Database safety baseline | Migration baseline, verified production backup, restore proof. Production steps need an explicit founder go |
| 6 | 6 — Payload binding | First schema change, via migration |
| 7 | 7 — Connector modes | |
| 8 | 8 — Duplicate scheduling paths | Depends on the lease from item 3 |
| 9 | 9 — Idempotent external execution | Opens the Stripe webhook, signature-verified |
| 10 | 10 — Budgets and cost accounting | `CostEntry`. Cap values for LLM, search and tools still need a founder decision |
| 11 | 11 — Suppression, opt-out, send caps | |
| 12 | 12 — BU ownership and dormant enforcement | Then the production run of the reality migration |
| 13 | 13 — Forecast vs revenue | |
| 14 | 14 — Assignment ↔ approval link and closure | Proven here; code shared with item 5 |
| 15 | 15 — Production migration/backup hardening | Off-server automation, retention, restore testing, runbook |

This is the Constitution §19 order (v1.2 onwards).

---

## Phase 0 exit

Phase 0 is done when:
- all sixteen acceptance criteria (items 1–15 and 5A) are met;
- CI is green, with no known-failing tests left;
- a 24 h staging soak with fake providers shows zero duplicate side effects, spend within caps, zero dormant-unit activity, and a working Emergency Stop and liveness alert.

Only then may the founder enable a production credential. Each credential is enabled one at a time, in the order the `FIRST_REVENUE_LOOP.md` phases need it.
