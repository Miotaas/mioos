# MioOS — Founder Decisions

This is the log of founder decisions that are not amendments to the Constitution.

`docs/MIOOS_CONSTITUTION.md` outranks this file. A decision recorded here:
- operates inside the Constitution and never changes it on its own; where a decision needs a constitutional change, the change is enacted as a Constitution amendment and the entry names it;
- can be revoked or superseded only by a later founder decision in this log, or by a Constitution amendment.

MioOS and Claude sessions may cite these decisions. They may not create, edit or reinterpret them.

---

## FD-001 — First commercial execution loop: AI Website Agency

| | |
|---|---|
| Date | 2026-10-18 |
| Decided by | Founder |
| Status | **In force** |
| Unit | `mio-solutions` |
| Constitution basis | §2.1.1 (portfolio authority), §17 (Mio Solutions first because of the existing prospect-to-outreach path) |
| Design | `docs/FIRST_REVENUE_LOOP.md` — accepted as the target design |

### Decision

The AI Website Agency is the **first commercial execution loop** that MioOS will make production-ready. It is the fastest path to proving the autonomous revenue machinery and to generating cash.

This does **not** change strategic portfolio priority, which remains:

1. AION
2. Mail Co-Pilot
3. AI Website Agency

### The distinction

| Term | Meaning | What it governs |
|---|---|---|
| **Strategic portfolio priority** | Where long-term value is concentrated. | Portfolio ranking, research attention, venture focus and long-term resource allocation, including the capital allocator. |
| **Execution-loop priority** | Which commercial loop is made production-ready first. | The order of engineering work on revenue loops: the First Revenue Loop, then Phase 0 and its implementation phases. |

These are two separate orderings. Neither is derived from the other.

### Consequences

- The capital allocator's portfolio ranking does not change. `PRIORITY_VENTURES` in `lib/solutions-scope.ts` stays `aion`, `mail-copilot`, `ai-website-agency`, in that order. Nothing may reorder it, weight it or override it because of this decision.
- Execution-loop priority must never be expressed through portfolio data:
  - `PRIORITY_VENTURES`;
  - the `[PRIORITY]` team focus;
  - allocator `allocationPct`;
  - opportunity scores;
  - the `priorityOrder` / `conflictRule` fields of the founder context.
- If implementation needs to know which loop comes first, that belongs in the engineering plan (`docs/FIRST_REVENUE_LOOP.md`, `docs/PHASE_0_SAFETY_PLAN.md`), not in runtime ranking logic.
- The runtime and budget the loop may consume are set by the founder in the Mio Solutions budgets (Constitution §10). This decision grants no budget.
- This decision is not a portfolio promotion, demotion or material reallocation under §2.1.1. If MioOS concludes that a material reallocation toward the agency is warranted, it raises a founder decision in Decide. It does not act on that conclusion.
- This decision authorizes no external or financial action and no production credential. Constitution §6, §10 and §19 still apply in full.

---

## FD-002 — Phase 0 order: database safety baseline moved forward

| | |
|---|---|
| Date | 2026-10-18 |
| Decided by | Founder |
| Status | **In force — enacted as Constitution v1.2 (§19)** |
| Plan | `docs/PHASE_0_SAFETY_PLAN.md` |

### Decision

The Phase 0 order is:

1. Test harness first.
2. Emergency Stop enforcement.
3. Single-flight runtime + fail-fast + external liveness.
4. Production session-secret enforcement.
5. Strict approval state machine.
5A. **Database safety baseline**, moved forward from item 15:
   - establish a versioned migration baseline;
   - create and verify a production backup;
   - prove the restore procedure on a copy or test environment where possible.
6. Payload-bound approvals.
7. Connector-mode enforcement.
8. Remove duplicate scheduling paths.
9. Idempotent external execution.
10. Budgets, spend caps and cost accounting.
11. Outreach suppression / opt-out / send caps.
12. Canonical Business Unit ownership + dormant enforcement.
13. Forecast vs real revenue separation.
14. Assignment ↔ approval lifecycle link and closure.
15. Complete production migration/backup hardening:
   - automated off-server backups;
   - retention;
   - restore testing;
   - an operational runbook.

### Consequences

- No schema change for items 6–14 may be applied before 5A is complete. `prisma db push` is not the delivery path for any of them.
- Every item, 5A included, must still be proven before any production credential is enabled.
- Creating the production backup in 5A is an operation on the Hetzner server. It runs only on an explicit founder go, like any production command.

---

## FD-003 — Phase 0 founder decisions FD-B to FD-H

| | |
|---|---|
| Date | 2026-10-18 |
| Decided by | Founder |
| Status | **In force.** FD-C, FD-D and FD-E are enacted in Constitution v1.3. FD-F is partially decided. |
| Plan | `docs/PHASE_0_SAFETY_PLAN.md` |

### FD-B — Test framework: approved

- Vitest is the Phase 0 test runner.
- Each test file gets a throw-away SQLite database file.
- External providers are faked and injected through the existing provider layer.
- `npm test` is added to CI.

### FD-C — Emergency Stop scope: approved, Constitution §8 clarified (v1.3)

| Emergency Stop blocks | Emergency Stop does not block |
|---|---|
| All external writes | IMAP / read-only reply checks |
| All paid third-party reads: LLM, search, prospect website fetches | Alerts to founder-owned channels |
| | Internal read-only diagnostics |

If the Emergency Stop state cannot be verified, fail closed for all external and financial actions.

### FD-D — Cost records: approved, Constitution §5 clarified (v1.3)

- Costs go in a separate `CostEntry` model.
- `CostEntry` uses the same Business Unit, period, provider-reference and integer-cents conventions as `RevenueEntry`.
- `CostEntry` belongs to the same economic ledger. It is not a parallel revenue model.

### FD-E — Backups and liveness: approved with modification, Constitution §19 amended (v1.3)

- **Off-server backups.** Primary destination is S3-compatible object storage with versioning enabled. Hetzner Object Storage is preferred, unless implementation constraints make another S3-compatible provider materially safer or simpler.
- A backup on the same server never satisfies the off-server requirement.
- **Encryption key.** Held by the founder. Never stored on the MioOS production server.
- **External liveness.** healthchecks.io or an equivalent dead-man's-switch service. The runtime pings only after a successfully completed tick. Missing pings trigger founder alerting.
- **§19 amendment.** Credentials used exclusively for safety infrastructure (off-server backups, external liveness monitoring) are permitted before general production credentials. They must not authorize business execution, outreach, payments or customer-facing actions.

### FD-F — Budget values: partially approved

Decided:

| Setting | Value |
|---|---|
| Timezone for periods and daily limits | Europe/Amsterdam |
| Advertising budget | 0 |
| Financial exposure | 0 until the invoice/payment phase is explicitly enabled |
| Outreach send cap | 10 per day |
| Maximum follow-ups | 2 |

**Not decided:** LLM, search and tool spend caps, and the provider-side limits. The plan is to measure the simulated 24-hour cost in Phase 0 item 1 first. MioOS then returns with recommended daily and monthly caps and provider-side limits for a founder decision.

### FD-G — Approval triage: approved

- All auto-approval is disabled.
- Risk scoring, escalation and reminders remain.
- Existing `auto_approved` rows are inert. They are never executed and never silently converted to `approved`.
- There is no internal allowlist in Phase 0.

### FD-H — Database engine: approved

- SQLite stays for Phase 0 and the first real revenue loop. No migration to PostgreSQL now.
- PostgreSQL is revisited when concurrent writers, data scale or reporting requirements justify it.
- Litestream may be evaluated as part of item 15 hardening. It is not required for 5A.

---

## FD-004 — OQ-1: safety infrastructure during Emergency Stop

| | |
|---|---|
| Date | 2026-10-18 |
| Decided by | Founder |
| Status | **In force — enacted in Constitution v1.4 (§8)** |

### Decision

Emergency Stop does **not** stop:
- external liveness heartbeats;
- off-server backup operations;
- founder-owned safety alerts.

These are safety infrastructure, not business execution.

They may continue only if their credentials are scoped exclusively to safety infrastructure and cannot authorize business actions.

### Consequences

- A safety path whose credential could also authorize a business action is treated as an external write, and the stop blocks it.
- The liveness rule from FD-E still applies. A ping is sent only after a successfully completed tick. A tick during an Emergency Stop completes normally, with its blocked steps skipped, so pings continue. A stop does not by itself raise a "runtime down" alert.
