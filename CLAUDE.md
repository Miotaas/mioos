# MioOS — Working Rules for Claude

**`docs/MIOOS_CONSTITUTION.md` is binding and outranks this file.** Read it before any architecture, schema, runtime or product work. If anything here conflicts with it, the Constitution wins. Do not reinterpret or modify the Constitution without explicit founder instruction.

`docs/ARCHITECTURE_REALITY_AUDIT.md` (2026-10-11) describes what the code actually does today. The code does **not** yet comply with the Constitution. Do not assume a rule below is enforced because it is written here.

---

## Core Identity

MioOS is an **autonomous digital holding operating system**: it builds, operates, supervises and improves revenue-generating digital business units from one central system.

MioOS is NOT primarily:
- A task manager
- A generic agent playground
- A CRM / ERP
- A developer dashboard
- A collection of disconnected automations
- A simulation pretending to operate businesses

The founder supervises through outcomes and decisions, not individual agent tasks.

---

## Canonical Business Units

Exactly four. These are the only business identities.

| Unit | Slug | Status |
|---|---|---|
| Mio Solutions | `mio-solutions` | **operational** — the only unit allowed autonomous runtime and budget |
| Mio Media | `mio-media` | **dormant** — 0 autonomous runtime, 0 budget |
| Mio Commerce | `mio-commerce` | **dormant** — 0 autonomous runtime, 0 budget |
| Mio Capital Lab | `mio-capital` | **dormant** — 0 autonomous runtime, 0 budget |

- Do not build features, schedulers, prompts, connectors or seed data that generate autonomous work for a dormant unit. Activation needs a founder amendment to the Constitution (§2.0).
- Media and Capital are deliberately re-included as identities; this overrules older decisions that cut them (Constitution §2.0.1). They remain dormant.
- AION, Mail Co-Pilot and the AI Website Agency are ventures/offers **inside Mio Solutions**. They are not Business Units.
- Mio Capital Lab, when activated: research + backtesting + paper trading only. Real-money trading is prohibited.

### Mio Solutions opportunity scope

AION, Mail Co-Pilot and the AI Website Agency are the **current priority portfolio, not the scope boundary**. Mio Solutions continuously discovers, validates and develops new AI, software and automation opportunities that fit its mission. Priority ventures route first.

A new Mio Solutions opportunity must be classified as exactly one of: `software_venture`, `saas_product`, `ai_product`, `automation_service`, `productized_service`, `internal_tool` (only with a commercialization path). It needs a credible monetization path and real external evidence: source URLs that MioOS actually retrieved through its web-search connector (`lib/solutions-scope.ts`). Opportunities in the priority portfolio without verified evidence are admitted with confidence capped at 3.

MioOS may autonomously discover, research, validate and recommend new ventures. It may **not** autonomously promote a venture into the priority portfolio, demote a priority venture, or materially reallocate resources between portfolio ventures or toward a new one. Those are founder decisions; MioOS raises them as a Decide item with evidence and expected impact (Constitution §2.1.1). Do not build code that changes portfolio membership or priority without a founder approval.

**Execution-loop priority is not portfolio priority** (founder decision FD-001, `docs/FOUNDER_DECISIONS.md`). The AI Website Agency is the first commercial execution loop being made production-ready (`docs/FIRST_REVENUE_LOOP.md`). Strategic portfolio priority stays AION → Mail Co-Pilot → AI Website Agency. Never express execution-loop priority through `PRIORITY_VENTURES`, `[PRIORITY]` focus, allocator ranking or `allocationPct`, opportunity scores, or the founder context's `priorityOrder`. The capital allocator's portfolio ranking must not change because of FD-001.

Never admitted into Mio Solutions: generic ideation, affiliate ideas, media/content businesses, e-commerce products, capital/trading opportunities. Automation or software *for* such companies is allowed; running such a business is not. Legacy types `ecommerce_product` and `content_business` are never created or routed.

### Business Unit vs capability

A Business Unit is an economic business. A capability/team is work a business performs. Never interchange them.

`research`, `sales`, `content`, `development`, `marketing`, `operations`, `support`, `executive` are **capabilities**, not units.

Every operational object must carry both: the owning Business Unit and the performing capability. Never route on a generic capability alone (e.g. `departmentType = research`).

### Deprecated identities

Do not introduce or extend these as business identities:

```text
ai-ventures  automation-sales  automation-revenue  website-revenue
youtube  crypto-stock  ecommerce  content  commerce  capital
sales  research  development  marketing  operations  support  executive
```

Mapping for historical unit-level names: `ai-ventures / automation-sales / automation-revenue / website-revenue → mio-solutions`; `content / youtube → mio-media`; `ecommerce / commerce → mio-commerce`; `capital / crypto-stock → mio-capital`. A record with only a capability and no derivable unit stays unattributed and is flagged. Never guess.

They still exist in code, the database and the UI. Treat them as migration identifiers only.

---

## Canonical Objects — use the existing models

No new parallel models. Extend these:

| Concept | Model |
|---|---|
| Business Unit | `BusinessUnit` |
| Opportunity (forecast and pipeline value live here) | `Opportunity` |
| Assignment | `Assignment` |
| Artifact | `Artifact` (+ `WorkforceOutput`) |
| Approval | `Approval` |
| Action | `ExecutionHistory` (one row per attempt) + `ActionResult` (one per approval, idempotency anchor) |
| Revenue (real money only) | `RevenueEntry` |
| Cost (same economic ledger) | `CostEntry` — same Business Unit, period, provider-reference and integer-cents conventions as `RevenueEntry`; not a parallel revenue model (planned, Phase 0 item 10) |

Deprecated, never the basis for new work: `ApprovalQueue`, `CommerceOpportunity`, `Lead`, `ConnectorRegistry`, and the legacy `Agent*` world.

Rules:
- Write `businessUnitId` at creation. Do not rely on backfill.
- AI revenue estimates stay on `Opportunity`. They are never written to `RevenueEntry`.
- An approval authorizes one action against one payload, bound by a payload hash. A changed payload invalidates the approval.
- Approval states: only `pending → approved | rejected`. Never create an approval already decided. Never auto-approve an action type that has an executor.
- When an approval is decided, close the assignment that was waiting on it.

---

## Autonomy and Governance

Three separate autonomies. Never merge them into one switch.

| Type | Examples | Default |
|---|---|---|
| Internal | research, analysis, drafts, scoring, backtesting, paper trading | Allowed for an operational unit within budget |
| External | email, publishing, proposals, invoices, supplier/customer contact | **Approval required** |
| Financial | payments, refunds, ad budgets, inventory, subscriptions, trades | **Locked** — explicit approval; real-money trading prohibited |

Every action passes, in order: Global Safety → Business Unit Policy (incl. unit status) → Connector Policy → Budget Policy → Action Policy → Approval → Execution. Failure at any layer blocks. An approval never overrides emergency stop, a dormant/disabled unit, a disabled connector, a hard budget limit or a prohibited action.

**Emergency Stop** is absolute. Check it at the runtime-loop boundary and immediately before every external side effect. UI state is not enforcement. It blocks all external writes and all paid third-party reads (LLM, web search, prospect website fetches). It does not block read-only IMAP reply checks, internal read-only diagnostics, or safety infrastructure (external liveness heartbeats, off-server backups, founder-owned safety alerts), and the latter only when their credentials are scoped exclusively to safety infrastructure and cannot authorize business actions. If its state cannot be verified, fail closed for every external and financial action (Constitution §8).

**Connector modes** — `disabled`, `read_only`, `draft_only`, `approval_required`, `autonomous_limited` — are enforced in execution code. List a connector as implemented only if code uses it.

**Budgets** — hard caps per unit (LLM, search/API, ads, tools, financial exposure, daily and monthly activity) and cost accounting are mandatory **before any production credential**. Dormant units have 0. No unbounded retry-on-a-timer.

**Fail closed.** If approval, emergency stop, unit status, connector config or budget cannot be verified: do not execute. Ambiguous payment state: do not retry blindly. Malformed AI output: reject it.

**Evidence.** Distinguish fact, external evidence, AI inference, estimate, assumption and simulation result. An LLM statement is not evidence. Template fallback output must never advance a pipeline.

**Outreach.** Suppression list checked before every send, opt-out in every message, follow-ups stop on reply/opt-out/bounce/lost and when reply detection is unavailable, daily send cap.

---

## Before Production Credentials (Constitution §19, in this order)

Plan: `docs/PHASE_0_SAFETY_PLAN.md`. `docs/FOUNDER_LOOP_MAP.md`'s old auto-approval plan is void; never build toward auto-approving executable external or financial actions.

1. Test harness (fake providers, controllable clock) and tests for every external action — **first**
2. Emergency Stop enforced at loop and executor boundaries
3. Single-flight runtime, fail-fast on uncaught exceptions, external liveness check with alerting
4. Production session-secret enforcement
5. Strict approval state machine
5A. Database safety baseline: migration baseline, verified production backup, restore proven on a copy (before any schema change for 6–14)
6. Approvals bound to immutable payloads
7. Connector modes enforced
8. Duplicate scheduling paths removed
9. Idempotent external execution
10. Budgets, hard spend caps, cost accounting per unit
11. Outreach suppression, opt-out, send caps
12. Canonical Business Unit ownership; unit status enforced
13. Forecast separated from real revenue
14. Assignment ↔ approval link; assignments closed when their approval is decided
15. Production migration/backup hardening: automated off-server backups, retention, restore testing, runbook

Do not enable, request or configure SMTP, Stripe, publishing, advertising or trading credentials in production until all of them (1–15 including 5A) are proven. The only exception is safety-infrastructure credentials (off-server backups, external liveness monitoring), which must never be used for business execution, outreach, payments or customer-facing actions (Constitution §19).

Approval triage never auto-approves anything (FD-G). Existing `auto_approved` rows are inert: never executed, never converted to `approved`. Do not change any of items 2–15 without a test that pins the behaviour.

---

## Runtime

- One canonical production runtime (`runtime/`). No second scheduler may execute the same work.
- Single-flight, idempotent, observable, recoverable, budget-aware, governance-aware.
- Deterministic idempotency keys for critical external actions.
- Exit on uncaught exceptions; liveness is watched from outside the runtime.
- Record every failed step where the founder can see it.

---

## AION Separation

AION and MioOS are separate systems. AION is an AI gateway / control plane / runtime platform.

Inside MioOS, AION appears only as a venture/project under Mio Solutions.

Never expose in MioOS: worker metrics, token metrics, runtime health, queue depth, infrastructure internals of AION.

---

## Navigation Architecture

**Only 6 destinations. No exceptions.**

1. Today
2. Decide
3. Workforce
4. Projects
5. Life
6. Settings

Revenue and Opportunities are not destinations; they are outcomes surfaced through Today and Workforce. Raw runtime internals belong in diagnostics.

Every new view requires updating ALL FOUR files atomically:
1. `store/appStore.ts`
2. `app/page.tsx`
3. `components/layout/Sidebar.tsx`
4. `components/layout/MobileNav.tsx`

Missing one breaks navigation.

---

## Founder Interface

The command center answers:

1. What value was created?
2. What opportunities were found?
3. What changed economically?
4. What is currently running?
5. What requires a decision?
6. What is blocked?
7. Which Business Unit is performing best?
8. Where should resources be allocated next?

**Today** is a briefing from the business units, not a monitoring screen. Outcome language only.

Good: "Mio Solutions sent 3 approved outreach emails; 1 reply."
Bad: "Agent completed assignment."

**Decide** is the approval boundary. Every decision explains: what is requested, why it matters, impact if approved, impact if rejected, and the exact payload being authorized. Only surface a decision when there is something concrete to authorize. No analytics or monitoring in Decide.

**Workforce** shows the four Business Units with their status. Dormant units are shown as dormant, with no activity. For an operational unit: mission, revenue model, current objective, opportunity pipeline, active work, real revenue vs forecast (kept visibly separate), costs, pending decisions.

Never show: agent names, queue depth, tokens, prompts, execution logs. Those belong in diagnostics.

**Projects** are containers (Venture or Initiative) that belong to a Business Unit. Not task managers, not kanban boards.

**Life** is personal (Calendar, Goals, Habits, Notes) and stays separate from business.

---

## Definition of Done for a Business Unit

Real input sources, real evidence collection, opportunity generation, validation logic, execution capability, governance, idempotency, audit trail, metrics, cost accounting, revenue/outcome accounting, failure recovery, tests for critical paths.

Generating AI content alone does not satisfy this. `operational` status is a permission to run, not proof of done.

---

## Development Rules

- Keep what works. Isolate what is legacy. Make identity canonical. Make execution safe. Test it. Then expand.
- Do not restart or rebuild from scratch.
- Do not break existing working features.
- Do not introduce another parallel Business Unit taxonomy, approval system, opportunity model, revenue model or execution runtime.
- Prioritize stability, clean UX, database-backed persistence.
- Use upsert/idempotent seed behavior (never wipe user data without `--reset` flag).
- Follow existing code patterns: client components, local state + fetch, Prisma API routes.
- Whitelist fields in API routes; never pass a request body straight to Prisma.
- Keep UI dark, clean, premium, command-center style.

## SQLite / Prisma Rules

Never use `skipDuplicates` with `createMany` on SQLite. Use `count === 0` guard before `createMany`.

PowerShell syntax for env vars:
```powershell
$env:DATABASE_URL = "..."
npx prisma db push
```

## Sidebar Accent Color System

| Section | Color |
|---|---|
| Personal OS | accent-purple |
| Business OS | accent-violet |
| Opportunity / Commerce | accent-green |
| Agent OS | accent-cyan |
| Warnings / Approvals | accent-amber |
| Errors / Destructive | accent-red |
