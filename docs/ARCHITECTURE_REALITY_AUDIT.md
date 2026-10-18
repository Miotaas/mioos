# MioOS — Architecture Reality Audit

Audit date: 2026-10-11 · Commit audited: `a87a92a` (working tree clean) · Mode: read-only, no code, schema or data changed.

**Confidence tags.** `[Certain]` = read in the code or queried from a database, with file:line. `[Likely]` = strong inference from code I read. `[Guessing]` = gap-filling; treat as a hypothesis.

**Coverage, stated plainly.** Read line by line: `runtime/*`, `lib/actions/*`, `lib/providers/*`, `lib/workforce/*` (except `team-memory.ts`), `lib/company/*`, `lib/ai-ventures/*`, `lib/businessUnits/*`, `lib/governance/*`, `lib/opportunity-engine.ts`, `lib/executive-orchestrator.ts`, `lib/autonomous-conditions.ts`, `lib/autonomy*.ts`, `lib/approvalExecutor.ts`, `lib/scheduleRunner.ts`, `lib/toolExecutor.ts`, `lib/workflowRunner.ts`, `lib/connectors/*`, `lib/integrations/connector-catalog.ts`, `lib/auth.ts`, `middleware.ts`, `instrumentation.ts`, the deployment files, the three data scripts, and 16 of the 156 API routes (approvals, webhooks, runtime trigger, integrations, drafts, auth, health). Skimmed by grep only: `prisma/seed.ts`, `lib/workflow-router.ts`, `lib/agentEngine.ts`, `lib/executiveLoop.ts`, `lib/executive/*`, `lib/intelligence/*`, `lib/ai/provider.ts` (first 140 lines), the remaining 140 API routes, and all 25,000 lines of `components/`. Not inspected: the production database on Hetzner. The four SQLite files in the repo were queried from copies; all four are stale and on older schemas (see Production Risks, P-13), so data-based statements describe June 2026 local state, not production.

---

# Executive Summary

MioOS today is a text-generation pipeline with one real outbound channel bolted on. It is not yet an operating system for four businesses, and it is not safe to leave running unattended with credentials configured.

The ten findings that matter most:

1. **Exactly one business loop can touch the outside world, and it belongs to one business unit.** Prospect discovery → website fetch → audit → outreach draft → founder approval → SMTP send → IMAP reply detection → follow-up is code-complete for AI Ventures (`lib/ai-ventures/*`, `lib/actions/executor.ts`). Media, E-commerce and Capital have no executing code at all: no publishing, no store, no supplier, no paper-trading engine. `[Certain]`
2. **The emergency stop does not stop the worker.** `isAutonomyPaused()` is checked by four modules, none of which the 24/7 worker runs. With autonomy "paused", the worker still discovers prospects, calls the LLM, and sends approved email and Stripe invoices. `[Certain]` (`runtime/runtime-loop.ts:428-497` has no pause check.)
3. **The Stripe revenue loop is broken at both ends.** Nothing ever calls `raiseInvoiceApproval` / `raiseSubscriptionApproval`, so no invoice approval can be created; and `/api/webhooks/stripe` is not in the middleware's public list, so Stripe would receive 401 and revenue would never be marked paid. `[Certain]` (`middleware.ts:5`)
4. **Three incompatible business-unit taxonomies run side by side.** UI and V2 engine use `ecommerce / automation-sales / youtube / crypto-stock`; the BusinessUnit table uses `ai-ventures / content / ecommerce / capital`; the action layer looks for teams called `automation-revenue / website-revenue`; the worker routes everything by nine generic `departmentType` values. Nothing joins them except a manual backfill script. `[Certain]`
5. **Revenue numbers are not trustworthy.** `probability` is written on a 0–100 scale by one writer and read as 0–1 by two readers and as 0–100 by a third; AI-estimated "potential" entries (€245,200 from three rows in the local DB) sit in the same table as real money; `businessUnitId` is never written by the main pipeline. `[Certain]`
6. **The "V2 lifecycle-aware autonomous engine" described in CLAUDE.md is not in the worker and crashes when invoked.** It runs only from a Settings button, and all four `workItems` catalogs are empty arrays, so `nextItem.title` throws. `[Certain]` (`lib/workforce/team-behaviors.ts:72,112,152,193`; `autonomous-engine.ts:196-201`)
7. **Ticks can overlap, and almost nothing is idempotent.** The worker uses `setInterval` with no in-flight guard while a single tick can take several minutes. Most "run once" guards are read-then-write. `[Certain]`
8. **A failed Stripe invoice retries every 60 seconds forever, creating a new Stripe customer and invoice item each time**, because the failure path releases the claim and no idempotency key is sent. `[Certain]` (`invoice-executor.ts:107`, `providers/payment.ts:53-64`)
9. **There are zero tests.** No test files, no test runner in `package.json`, CI only lints and builds. `[Certain]`
10. **The legacy agent system is not dead.** `instrumentation.ts` starts the legacy schedule runner inside the Next.js process in production, even though the worker's own comment says legacy schedules are disabled. `[Certain]`

Bottom line: the governance story ("no external impact without approval") holds for email content today mostly because of two string coincidences and because no credentials are configured locally. It is not enforced by structure.

---

# Current System Map

## Processes

| Process | Entry | What it actually runs |
|---|---|---|
| Web (Next.js 16) | `npm start` | UI, 156 API routes, session auth, **plus the legacy agent schedule runner** every 60 s in production (`instrumentation.ts:10-13`) |
| Runtime worker | `tsx runtime/runtime-worker.ts` | 16-step loop every 60 s via `setInterval` (`runtime-worker.ts:341`) |
| Database | SQLite file, WAL, `prisma db push` on every container start | No migrations folder, no indexes, no foreign keys on `businessUnitId` |

## The worker loop (`runtime/runtime-loop.ts:428-497`)

| # | Step | Nature |
|---|---|---|
| 1 | `processQueue` — up to 2 assignments → LLM text → `WorkforceOutput` + `Artifact` + approvals/handoffs | AI text + DB |
| 2 | `runAgentSchedules` | No-op (returns immediately) |
| 3 | Handoff auto-accept → new assignment | DB only |
| 4 | Objective evaluator → one assignment per team per day | AI title + DB |
| 5 | Executive monitor (4 h) | DB only |
| 6 | Signal collection (internal, web search, iCal, IMAP) | Real reads if keys set |
| 6b | Reply detection (IMAP) | Real read |
| 6c | Follow-up scheduler | DB only (creates approval + draft) |
| 6d | Prospect discovery + analysis | **Real: web search API, HTTP fetch of prospect sites, LLM** |
| 7 | Approval triage | DB only (auto-approve / escalate) |
| 8 | Alerts | Real HTTP if Discord/ntfy set, else DB rows |
| 9 | Research engine (6 h) | DB only |
| 10–11 | Opportunity extractor + router | AI + DB (creates Projects and RevenueEntries) |
| 12 | Autonomous conditions (12 h) | DB only |
| 13 | Capital allocator (12 h) | DB only |
| 14 | Executive orchestrator (24 h) | DB only (auto-rejects/promotes opportunities) |
| 15 | `processOutboundEmail` | **Real: SMTP send** |
| 16 | Invoices / subscriptions / cancellations | **Real: Stripe writes** (currently unreachable, see C-3) |

## Two parallel worlds in one database

- **Workforce world** (current): `WorkforceTeam`, `Assignment`, `RuntimeQueue`, `WorkforceOutput`, `Artifact`, `Approval`, `ActionResult`, `Opportunity`, `RevenueEntry`, six `*Draft` tables, `Prospect`, `BusinessUnit`.
- **Agent world** (legacy V1–V3): `Agent`, `AgentRun`, `AgentSchedule`, `ApprovalQueue`, `AgentWorkflow`, `AgentMemory`, `AgentGoal`, `AgentDelegation`, `AgentWorkspace`, `Tool`, `ExecutiveLoopRun`, `Insight`, `PatternRecord`, plus `CommerceOpportunity`, `Lead`, `ConnectorRegistry`.

They share `ExecutionHistory`, `AgentMessage` (team IDs stored in agent ID columns, `team-communicator.ts:3`) and `SystemConfig`.

## North Star drift (context for every section below)

Four documents define four different targets. `[Certain]`

| Source | Business units |
|---|---|
| `CLAUDE.md` | E-Commerce, Automation Sales, YouTube Automation, Crypto/Stock Trader (paper trading allowed) |
| This audit's brief | Automation/B2B, Media, Supplier-Fulfilled E-Commerce, Capital Lab (research + paper trading) |
| Project instructions | Three engines: Social Media, AI & IT Solutions, Trading |
| `SystemConfig.founder_context` written by `scripts/migrate-workforce-reality.ts:19,29` | AI Ventures, Content/YouTube, E-commerce, Capital — **"Research only … No trading"**, paper trading not mentioned |

The LLM prompts are grounded in the fourth one. The UI is built on the first one.

---

# Real End-to-End Capabilities

"Real" means: an input can travel through the system to an observable effect outside the SQLite file, with the code path reachable from the 24/7 worker or the UI.

## R-1. AI Ventures cold-outreach loop — real, single business unit `[Certain: code]` `[Likely: never exercised]`

`discoverProspects` (web search, `ai-ventures/discovery.ts:45`) → `analyzeProspect` (HTTP GET of the prospect's homepage, regex signals, scraped contact email, LLM outreach copy, `prospect-engine.ts:116`) → `Approval(approve_outreach)` + `EmailDraft` with recipient → founder PATCH `/api/workforce-approvals/:id` → `processOutboundEmail` claims the draft atomically and sends through Nodemailer (`actions/executor.ts:74-105`) → `detectReplies` via IMAP (`reply-matcher.ts`) → `scheduleFollowups` after 3 days, capped at 2.

Qualities that are genuinely good: approval is re-checked at send time, the draft claim is a compare-and-swap, misconfigured SMTP fails loudly, every attempt writes `ExecutionHistory`.

Evidence it has not run for real: `.env.local` contains no SMTP, IMAP, search or Stripe keys, and every local database has zero rows in `email_drafts`. `[Certain]` for local; production unknown.

## R-2. Founder request → assignment → LLM output → Decide item — real, internal only `[Certain]`

`/api/assignments/:id/execute` or the queue → `executeAssignment` → Anthropic API (`claude-haiku-4-5`, `ai/provider.ts:91`) → `WorkforceOutput` + `Artifact` → `AutomationRule` creates `Approval` and/or `TeamHandoff`. Local DB: 86 assignments, 77 completed queue items.

## R-3. Read-only connectors — real `[Certain]`

Web search (Serper/Tavily), iCal feed read, IMAP envelope read, Discord/ntfy alert POST. All genuinely implemented and all genuinely read-only.

## R-4. Session auth, rate-limited login, health endpoint — real `[Certain]`

With the caveat in G-6.

That is the complete list.

---

# Simulated or Incomplete Capabilities

## Creates database records only

| Capability | What happens | Evidence |
|---|---|---|
| Approving campaign / content / product / proposal / deployment | A row in `CampaignDraft` / `ContentDraft` / `ProductDraft` / `ProposalDraft` / `DevelopmentDraft` and an auto-created `Project`. Nothing consumes those drafts. | `approval-dispatcher.ts:135-281` `[Certain]` |
| Handoffs between teams | New assignment for the next team. | `handoff-executor.ts` |
| Capital allocator | Writes `currentFocus` strings on teams and a JSON blob in `RuntimeState`. No capital is allocated; it ranks opportunities. | `capital-allocator.ts:134-147` |
| Executive orchestrator / monitor | Status flips on opportunities and one more assignment for the Executive team. | `executive-orchestrator.ts` |
| Intelligence signal "processing" | Marks signals processed and writes a log row. No signal ever becomes an assignment, alert or Decide item — including "prospect replied". | `signal-processor.ts:12-30` `[Certain]` |
| Connector "Connect" and "Test" | For 11 of 14 connectors, "connected" means "the env var names exist". | `integrations/[id]/test/route.ts:39-48,76-78` |
| Connector mode (disabled / draft_only / approval_required) | Stored, displayed, **never read by any executor**. SMTP defaults to `disabled` and still sends. | grep: `connectorConfig` appears only in `app/api/integrations/*` `[Certain]` |
| `AutonomyConfig.approvalTriggers`, `operateSilently` | Written at init, never read. | grep `[Certain]` |
| `BusinessUnit.autonomyLevel`, `budgetCents` | Columns exist; no reader anywhere. Schema comment says "enforced later". | grep `[Certain]` |
| Throttle "focus mode" | Real, but only gates opportunity creation and pipeline routing. | `autonomy-throttle.ts` |

## Creates AI or template text only

| Capability | Reality |
|---|---|
| All nine department "teams" | One function, one LLM call, a different system prompt per `departmentType`. There are no agents, tools, browsing, or data access beyond the prompt. `[Certain]` (`output-generator.ts:65-105`) |
| "Research" | The LLM is asked to "validate demand with Google Trends, Amazon BSR"; it has no tool to do so. Output is plausible prose. `[Certain]` |
| Supplier discovery, margin tables, competitor analysis, trade theses, scripts, thumbnails, SEO | Same: text. |
| Opportunity extraction | LLM reads its own research prose and emits JSON with invented `estimatedRevenue`, which is then written to `RevenueEntry` as "potential". `[Certain]` (`opportunity-engine.ts:222-236`) |
| Template fallback | When the LLM call fails or no key is set, a canned "Confidence: 3/10 — Template output" document is stored as a normal output and still triggers approvals, handoffs and pipeline advancement. `[Certain]` (`output-generator.ts:99-104`, `executor.ts:86-89`) |
| Prospect "audit" when the site cannot be fetched | LLM guesses scores for a website it has not seen. Labelled as estimates in the audit text, but stored in the same score columns. `[Certain]` (`prospect-engine.ts:41-65`) |

## Implemented but unreachable

| Capability | Why unreachable |
|---|---|
| Stripe one-off invoice | No caller of `raiseInvoiceApproval`. `[Certain]` |
| Stripe subscription + setup fee, cancellation | No caller of `raiseSubscriptionApproval` / `raiseCancelApproval`. `[Certain]` |
| Stripe webhook → revenue recognised | Route sits behind session auth. `[Certain]` |
| `getMRR()` | No caller. |
| V2 autonomous engine | Only via Settings → `/api/runtime/trigger`; throws on first team. |
| `enqueueTeamWork` (team-work-scheduler) | No caller; also creates assignments with no queue item. |

## Absent entirely

Paper trading (no portfolio, order, fill, P&L or backtest code; the string appears only in labels), any publishing path (YouTube, social), any commerce path (Shopify write, supplier, order, fulfilment), any ads path, CRM sync, proposal sending, calendar booking, per-unit budgets, per-unit queues, per-unit permissions, cross-unit event bus / Control Plane.

---

# Legacy Architecture

| System | Still reachable? | How |
|---|---|---|
| `agentEngine.executeAgent` | **Yes** | `/api/agents/run` from four UI views; `scheduleRunner` |
| `scheduleRunner` | **Yes, in production** | `instrumentation.ts` starts a 60 s interval inside Next.js when `NODE_ENV=production`; also `/api/agents/schedule/tick` and `/api/runtime/trigger`. The worker's comment "Legacy agent schedules are DISABLED" (`runtime-loop.ts:93`) is true only for the worker. `[Certain]` Dormant by default because the seeded schedule has `enabled: false` (`seed.ts:719`); anything that enables a schedule reactivates it. |
| `ApprovalQueue` + `approvalExecutor` | **Yes** | `/api/approvals/:id`; Today and legacy views fetch both approval systems. Internal writes only (whitelist at `approvalExecutor.ts:7-26`). |
| `workflowRunner` (agent chains) | Yes | Fired by `executeAgent` and again by `scheduleRunner` (double fire, D-9). |
| `executiveLoop` | Yes, manual | `/api/executive-loop/run` from `ExecutiveLoopView`. |
| `toolExecutor` | Likely dead | No caller found outside its own route. `[Likely]` |
| `memoryExtractor`, `patternAnalyzer`, `insightEngine`, `briefingGenerator` | Yes | Fire-and-forget hooks after each agent run. |
| `CommerceOpportunity`, `Lead`, `ConnectorRegistry`, `Product`, `Deployment`, `UpsellOpportunity`, `OnboardingItem` | Yes | Own API routes and views; duplicated by `Opportunity`, `Prospect`, `ConnectorConfig`. |
| 19 legacy views in `app/page.tsx:73-94` | Rendered if `activeView` is set | Sidebar exposes only the six sanctioned destinations; the other views remain mounted in the switch. Whether a user can navigate to them was not verified. `[Guessing]` |
| `scripts/normalize-teams.mjs`, `normalize-via-api.mjs`, `/api/admin/normalize-teams` | Route returns 410; scripts remain | Source of the `automation-sales / youtube / crypto-stock` teams in older databases. |

Two approval systems, two opportunity models, two connector registries and two prospect/lead models is the core of the legacy problem.

---

# Business Unit Inconsistencies

## The identifiers in use `[Certain]`

| Concept | Values | Defined in |
|---|---|---|
| `BusinessUnit.slug` (canonical per code) | `ai-ventures`, `content`, `ecommerce`, `capital` | `lib/businessUnits/config.ts:20-49` |
| `BusinessUnit.slug` (schema comment, old dev DB) | `ecommerce`, `automation-sales`, `content`, `capital` | `schema.prisma:1543`; `prisma/prisma/dev.db` |
| V2 engine / UI team slugs | `ecommerce`, `automation-sales`, `youtube`, `crypto-stock` | `team-behaviors.ts`, `autonomous-engine.ts:36-41`, `settings/workforce-autonomy/route.ts:15`, `TodayView`, `WorkforceView`, `TeamsView`, `RevenueView` |
| Seeded team slugs | `executive`, `research`, `commerce`, `sales`, `marketing`, `content`, `operations`, `support`, `development` | `prisma/seed.ts:766-858` |
| Reality-migration team slugs | `website-revenue`, `automation-revenue` (both `departmentType: "sales"`) | `scripts/migrate-workforce-reality.ts:110-111` |
| Connector categories | `ecommerce`, `automation_sales`, `youtube`, `crypto_stock` | `connector-catalog.ts:10` |
| Opportunity types | `automation_service`, `ecommerce_product`, `saas_product`, `content_business`, `internal_tool` | `opportunity-engine.ts:92` |

## Specific inconsistencies

**BU-1. `WorkforceTeam` has no `businessUnitId`.** The link from team to unit exists only as a hard-coded map, duplicated verbatim in `lib/businessUnits/config.ts:63-80` and `scripts/backfill-business-units.ts:27-33`. `[Certain]`

**BU-2. `businessUnitId` is not written by the main pipeline.** The only runtime writers are `lib/actions/*` and `lib/ai-ventures/*`. `executor.ts`, `opportunity-engine.ts`, `department-pipeline.ts`, `objective-evaluator.ts`, `handoff-engine.ts` and every API route leave it null. Attribution for everything else depends on re-running `npm run db:backfill-bu` by hand (the Docker entrypoint runs it once per container start). `[Certain]`

**BU-3. `departmentType` is used as a routing key but is not unique.** Local June DB had 13 active teams with four duplicated department types:

| departmentType | Teams |
|---|---|
| `sales` | `sales`, `automation-sales` (+ `website-revenue`, `automation-revenue` after the reality migration = 4) |
| `research` | `research`, `crypto-stock` |
| `content` | `content`, `youtube` |
| `commerce` | `commerce`, `ecommerce` |

Every `findFirst({ where: { departmentType } })` without `orderBy` is therefore nondeterministic: `handoff-engine.ts:79`, `department-pipeline.ts:83,396`, `research-engine.ts:117`, `autonomous-conditions.ts:12,239`, `runtime-loop.ts:14`, `executive-orchestrator.ts:128`. Concretely, generic "Market Discovery" research can be assigned to the Crypto/Stock Trader team, and the Research → Sales handoff can land on any of four sales teams. `[Certain: code]` `[Likely: happens in practice]`

**BU-4. Twin teams do duplicate work.** `initializeAutonomyConfigs` (`runtime-worker.ts:264-307`) gives every active team the default objective for its `departmentType`. Four `sales` teams each receive "Pipeline & Prospect Development" daily; `capitalAllocator` writes the same `[PRIORITY]` focus to all of them (`capital-allocator.ts:135`). `[Certain]`

**BU-5. The Capital unit inherits research-department behaviour.** `crypto-stock` has `departmentType: "research"`, so it matches the "Research → Sales Handoff" rule: trade-research output is handed to a sales team to "qualify leads" and "build outreach list". `[Certain: code]` (`runtime-worker.ts:155-165`)

**BU-6. Action-layer team lookups disagree with each other and with seeded data.**

| Module | Team slugs searched |
|---|---|
| `prospect-engine.ts:158` | `sales`, `ai-ventures`, `development` |
| `followup-scheduler.ts:31`, `invoice-executor.ts:44`, `subscription-executor.ts:64` | `automation-revenue`, `website-revenue`, `sales` |
| `subscription-executor.ts:135` | `automation-revenue`, `sales` |

No team with slug `ai-ventures` is created anywhere. If none match, the `WorkforceOutput` is skipped and the approval is created with `relatedOutputId: null`; for invoices that means `processApprovedInvoices` can never find its payload (`invoice-executor.ts:66` filters on `relatedOutputId: { not: null }`) — an approved invoice that silently never issues. `[Certain]`

**BU-7. Hard-coded `"ai-ventures"` in the action layer.** Follow-ups, invoices, subscriptions and prospects all attribute to AI Ventures unconditionally and swallow lookup failure (`.catch(() => null)`). The "provider-agnostic, reusable by Content, E-commerce and Capital" claim in `providers/types.ts:4-6` is not true of the executors. `[Certain]`

**BU-8. `BusinessUnit` rows are not created by `seed.ts`.** Only the backfill script creates them. The entrypoint treats backfill failure as non-fatal (`docker-entrypoint.sh:20`), so a failed backfill yields a running system with every `businessUnitId` null. `[Certain]`

**BU-9. No opportunity type maps to Capital, and none distinguishes Automation from SaaS products.** `OPPORTUNITY_TYPE_TO_BU` has no `capital` entry; unknown types are coerced to `automation_service` (`opportunity-engine.ts:93`). Any Capital or unclassifiable idea becomes an AI Ventures automation opportunity. `[Certain]`

**BU-10. The rename map is one-way and partial.** `automation-sales → ai-ventures` exists for BusinessUnit rows; nothing renames or retires the `automation-sales`, `youtube`, `crypto-stock` *teams*, and the UI still hard-codes them. After the reality migration, the Workforce view's four cards and the BusinessUnit table describe different sets. `[Certain]`

**BU-11. Media is split three ways:** BU `content`, generic team `content`, V2 team `youtube`, connector category `youtube`, founder-context product "Luxora". No code distinguishes owned channels from content produced for other units. `[Certain]`

**BU-12. No referential integrity.** `businessUnitId` is a bare `String?` on six models with no `@relation`, no index, no enum. A typo or deleted unit is undetectable. `[Certain]`

---

# Governance Risks

Severity reflects impact if SMTP/Stripe/search credentials are configured.

**G-1 (Critical). Emergency Stop and autonomy level do not govern the worker.** `isAutonomyPaused` callers: `autonomous-engine.ts`, `executiveLoop.ts`, `scheduleRunner.ts`, `team-work-scheduler.ts`. None is in `runRuntimeLoop`. `workforce_autonomy_level` ("off / conservative / normal / aggressive") is read only by the V2 engine. Setting autonomy to "off" and pressing Emergency Stop leaves all 16 worker steps running, including outbound email and Stripe. `[Certain]`

**G-2 (Critical). Connector mode is cosmetic.** `mode/route.ts:33-39` carefully blocks `autonomous_limited` for SMTP; `processOutboundEmail` never reads `ConnectorConfig`. Disconnecting or disabling SMTP in the Integrations UI does not stop sending. `[Certain]`

**G-3 (High). Auto-approval is safe by coincidence, not by design.** Triage sets `status: "auto_approved"`; the executors look for `status: "approved"`. That string mismatch is the only structural barrier. The second barrier is a substring keyword list (`approval-triage.ts:30-34`). Follow-up approvals are created with `riskLevel: "low"` hard-coded (`followup-scheduler.ts:53`) for an external email, and triage only re-scores approvals currently at `medium` (`:101`), so they stay "low" and are auto-approval candidates after 48 h; they are saved only because their description contains the word "Send". Side effect: an auto-approved item triggers no dispatcher, so it does nothing and its assignment stays in `review` forever. `[Certain]`

**G-4 (High). Approval is not bound to the payload it authorises.** The approval row holds a title and description; the email body, recipient, invoice amount and customer are read at execution time from mutable rows (`EmailDraft` via `PATCH /api/drafts/:id`; `WorkforceOutput.content` for invoice payloads). No hash, snapshot or version. What was approved and what is sent can differ. `[Certain: mechanism]` `[Likely: exploitable only by the session holder or a bug]`

**G-5 (High). Approval state machine has no transitions.** `PATCH /api/workforce-approvals/:id` accepts `approved`/`rejected` from any current state: rejected → approved works; approving twice re-dispatches. `POST /api/workforce-approvals` passes the request body straight to `prisma.approval.create`, so an approval can be created already `approved` with any `decisionType`. Fifteen routes use the same `data: body` pattern, including `revenue-entries`, `workforce/outputs`, `workforce/teams`, `projects`. `[Certain]`

**G-6 (High). Session forgery if `SESSION_SECRET` is unset in production.** Login throws without the secret (`auth.ts:72`), but the middleware verifies against `getSessionSecretSafe()`, which falls back to a constant committed in the repository (`auth.ts:67,82-84`). A token signed with that constant passes the middleware. The public `/api/health` reports `auth.configured`, telling an attacker whether this applies. The entrypoint does not check the variable. `[Certain: code]`

**G-7 (High). "Spending money requires approval" is not enforced for operating spend.** LLM calls, search API calls and website fetches run autonomously with no token, cost or daily budget. Interval and count limits exist, but several retry-every-tick paths defeat them (see D-6, S-10). `[Certain]`

**G-8 (Medium). Cold outreach to scraped addresses has no suppression mechanism.** Contact emails are regex-harvested from homepages (`website-analyzer.ts:65-66`); there is no unsubscribe link, opt-out list, bounce handling, per-domain or per-day send cap, or check that a prospect marked lost/rejected is excluded from follow-ups. Whether this complies with Dutch/EU rules on unsolicited B2B email and with GDPR is a question for a lawyer; I am not one. The system gives you no tooling to comply either way. `[Certain: absence]`

**G-9 (Medium). Follow-ups continue when reply detection is blind.** `detectReplies` returns silently if IMAP is unconfigured or errors (`reply-matcher.ts:25`, `connectors/email.ts:108-111`), and only inspects the last 30 messages of the last 24 hours. `scheduleFollowups` runs regardless. A prospect who replied can receive the follow-up sequence. Each follow-up still needs approval, so this is a founder-attention trap rather than an ungated send. `[Certain]`

**G-10 (Medium). Strategic decisions made without the founder.** The executive orchestrator auto-rejects opportunities (`score ≤ 2 && confidence ≤ 3`) and auto-promotes others; `advanceToNextStage` sets `status: "approved"` when a pipeline finishes with no approval involved (`department-pipeline.ts:69-74`); `routeOpportunityToWorkflow` auto-creates Projects and RevenueEntries. All internal, but "approved" on an opportunity does not mean a human approved it. `[Certain]`

**G-11 (Medium). Decide is not the single approval boundary.** `ApprovalQueue` (legacy) is a second boundary with its own executor and UI. `[Certain]`

**G-12 (Low). Every outreach approval creates a Project.** `handleOutreach`, `handleCampaign`, `handleContent`, `handleProduct`, `handleResearch` and the default handler all call `maybeCreateProject`. Approving 20 outreach emails creates 20 "Initiative" projects, including for invoice approvals, which fall through to the default handler. `[Certain]` (`approval-dispatcher.ts:7-27,90`)

**What does hold:** email is not sent without `Approval.status === "approved"` checked at send time; Stripe executors check the same; the legacy executor has a hard whitelist of internal action types; no trading code exists to bypass.

---

# Idempotency / Concurrency Risks

**D-1 (Critical). Overlapping ticks.** `setInterval(() => void safeTick(...), 60000)` (`runtime-worker.ts:341-343`) starts a new tick whether or not the previous one finished. One tick can include two assignments (each up to 90 s LLM timeout plus artifact and pipeline work), up to three prospect analyses (8 s fetch + two LLM calls each), opportunity extraction for up to ten outputs, and SMTP sends with 25 s socket timeouts. Multi-minute ticks are plausible; then two or three loops run concurrently in one process. `[Certain: mechanism]` `[Likely: occurs]`

What overlap breaks, given that guards are read-then-write:

| Path | Duplicate produced |
|---|---|
| `evaluateObjectives` (`nextRunAt` updated after create, `objective-evaluator.ts:170-200`) | Duplicate daily assignments |
| `processPendingHandoffs` (status set after create) | Duplicate handoff assignments |
| `runOpportunityExtractor` (count, then LLM, then create) | Duplicate opportunities from one output |
| `routeOpportunityToWorkflow` (`workflowRoutedAt` set last) | Two pipelines, two Projects, two RevenueEntries |
| `processNewProspects` (filter on `recommendedOffer: null`, set mid-function) | Two approvals and **two sendable drafts for the same prospect** |
| `scheduleFollowups` (original marked `followed_up` last) | Two follow-up approvals and drafts |
| All `maybeRun*` gates (find, compare, upsert) | Double executive review, double research batch |
| `incrementLoopCount` | Lost updates (cosmetic) |

Email sending and Stripe claims use compare-and-swap and survive overlap.

**D-2 (High). `executeAssignment` is not idempotent.** It refuses only `completed`/`archived`. An assignment in `active` or `review` can be executed again, producing a second output, artifact, approvals and handoffs, and advancing the opportunity pipeline a second stage. Triggers: startup recovery resets every `active` assignment to `pending` and every `running` queue item to `queued` (`runtime-worker.ts:127-138`); queue retry after a failure that occurred after the output was saved; the UI "execute" button while the worker holds the same assignment; `/api/runtime/trigger` running its own copy of the queue processor concurrently with the worker. `[Certain]`

**D-3 (High). No uniqueness on the queue.** `RuntimeQueue.assignmentId` is not unique; nothing prevents two queue rows for one assignment. `[Certain]`

**D-4 (Medium). Queue retry accounting is off by one and priority order is wrong.** `shouldRetry` compares the pre-increment `attempts` (`runtime-queue.ts:85`), giving four attempts instead of three. `orderBy: { priority: "desc" }` sorts strings: `urgent > medium > low > high`, so high-priority work runs last. Same bug in handoff ordering. `[Certain]`

**D-5 (Medium). Stale lock recovery only at startup.** A queue item stuck in `running` during a live process is never reclaimed until restart. `[Certain]`

**D-6 (Critical once reachable). Stripe invoice creation is not idempotent and retries forever.** `createOneOffInvoice` makes four sequential Stripe calls (customer, invoice item, invoice, finalize) with no `Idempotency-Key`. On any failure the executor releases the claim (`invoice-executor.ts:107`); the approval is still `approved`, so the next tick repeats from the top with a new customer and a new invoice item. Unbounded, every 60 s. Subscriptions behave the same (`subscription-executor.ts:104-121`), creating a new customer per retry. Conversely, a crash after Stripe succeeds but before the DB update leaves `externalRef = "pending:<id>"` permanently: no duplicate, no record of the real invoice, no alert. `[Certain]`

**D-7 (Medium). Stripe webhook has no event de-duplication and no ordering protection.** Handlers are mostly idempotent, but `customer.subscription.updated` arriving after `deleted` would resurrect status. Recurring `invoice.paid` events update the same row instead of recording each period (see RA-6). `[Certain]`

**D-8 (High). Double-approve creates duplicate drafts, then returns 500.** `ActionResult.approvalId` is unique and the dispatcher uses `create`. A second approval PATCH creates a second campaign/content/product draft (and possibly a Project), then `actionResult.create` throws, the catch block attempts another `create` with the same `approvalId`, which throws again out of a function documented as "never throws". `[Certain]` (`approval-dispatcher.ts:44-80`)

**D-9 (Medium). Legacy double execution.** `executeAgent` fires `triggerWorkflows("completed_run")` in its post-run hook (`agentEngine.ts` tail) and `scheduleRunner.ts:78-80` fires it again: every scheduled run triggers downstream agents twice. `runDueSchedules` advances `nextRunAt` only after a successful run and has no in-flight guard, so a slow agent is started again by the next 60 s tick, and a failing agent is retried every minute indefinitely. `[Certain]`

**D-10 (Medium). RevenueEntry duplication when a pipeline cannot start.** `routeOpportunityToWorkflow` creates a "[Potential]" RevenueEntry before `startOpportunityPipeline`. If the pipeline fails to start (no active team for the first department, or empty chain), `workflowRoutedAt` stays null and `opportunity.revenueEntryId` is never set, so the next tick creates another RevenueEntry — every minute until fixed. `[Certain: code]` (`opportunity-engine.ts:222-240`, `department-pipeline.ts:396-400`)

**D-11 (Medium). SQLite with two writer processes.** WAL plus a 5 s busy timeout, PRAGMAs applied fire-and-forget on one pooled connection (`runtime/db.ts:13-17`, `lib/db.ts:11-15`), so other pool connections may lack the timeout. No transactions anywhere in the paths read: every multi-row operation (assignment + queue row, approval + draft, project + revenue + opportunity update) can be left half-done by a crash or `SQLITE_BUSY`. `[Certain: no `$transaction` in files read]` `[Likely: busy errors under overlap]`

---

# Revenue Attribution Risks

Short answer: revenue attribution is neither canonical nor reliable.

**RA-1. One table mixes money and fiction.** `RevenueEntry` holds Stripe-backed rows, founder-typed rows (`POST /api/revenue-entries` with raw body) and LLM-invented "[Potential]" rows. Local DB: 1 live (€1,000), 5 pipeline (€12,552), 3 potential (€245,200). `[Certain]`

**RA-2. `probability` has no defined scale.** Writers: `opportunity-engine.ts:234` writes `confidence * 10` (10–100). Readers: `/api/revenue/route.ts:18` and `businessUnits/rollup.ts:52` compute `amount * (probability ?? 0.5)`; `executive-analysis.ts:158-159` computes `amount * probability / 100`. Local data contains both `0.3` and `75`. Weighted pipeline is wrong by up to 100× depending on which screen you look at. `[Certain]`

**RA-3. `revenueType` vocabularies disagree.** Schema: `pipeline | potential | live | closed`. `company/dashboard/route.ts:126-128` sums `mrr`, `arr`, `one_time`, which nothing writes, so that dashboard's MRR/ARR are always 0. `invoice-executor.ts:96` moves an *issued invoice* from `pipeline` to `potential`, the same bucket as AI guesses. `[Certain]`

**RA-4. "Closed" has two definitions.** `revenueType === "live" || status === "closed_won"` in the rollup; `revenueType === "live"` among `status: "active"` rows in executive analysis. A paid invoice (`closed_won` + `live`) is counted by the first and excluded by the second. `[Certain]`

**RA-5. Unit attribution is absent for the main pipeline.** See BU-2. Per-unit P&L (`rollupBusinessUnit`) therefore shows only ai-ventures action-layer rows plus whatever the last backfill caught. Backfill attributes by team slug or opportunity type; rows with neither stay null permanently. `[Certain]`

**RA-6. Recurring revenue is not recorded per period.** Each subscription is one row; every monthly `invoice.paid` overwrites `paidAt` on that row. There is no ledger of payments, so collected cash, churn and MRR history cannot be derived. Refunds, credit notes, disputes and partial payments are not handled. `[Certain]`

**RA-7. Setup-fee and subscription rows share one invoice id.** Both get `externalRef = sub.invoiceId` (`subscription-executor.ts:108-109`); `markInvoicePaid` uses `findFirst({ externalRef })` and would update only one of them, arbitrarily, if the event arrives without a subscription id. `[Certain]`

**RA-8. Money is stored as `Float` euros in `amount` and `Int` cents in `mrrCents`.** `[Certain]`

**RA-9. No link from revenue to cost.** LLM, search and (future) ad spend are not recorded anywhere, so no unit can show margin. `[Certain]`

**RA-10. Revenue-gap logic is driven by the fiction.** `detectRevenueGap` sums all `status: "active"` amounts including AI "potential" (`executive-orchestrator.ts:78-85`); with €245k of invented potential, the gap reads as closed and "pipeline on track". `[Certain]`

**RA-11. Stripe → revenue cannot currently complete** (webhook 401). `[Certain]`

---

# Connector Reality Matrix

"UI says" = what the Integrations catalog implies (`isPlaceholder`, description). "Reality" = code that exists.

| Connector | UI says | Read code | Write code | Approval-gated | Mode enforced | Verdict |
|---|---|---|---|---|---|---|
| SMTP | Implemented, default **disabled** | — | **Yes** (Nodemailer) | Yes, at send time | **No** | Real. Mode switch is decorative. |
| Stripe | Implemented, "read revenue… no charges without approval", default **draft_only** | Balance ping in Test only | **Yes** (customer, invoice, subscription, cancel via REST) | Yes | **No** | Real code, unreachable trigger, blocked webhook, non-idempotent. Description understates it: there is no revenue *read*. |
| IMAP email (reply detection) | Not in catalog | **Yes** (envelopes, 24 h) | No | n/a | n/a | Real, read-only. Invisible in Integrations UI. |
| Web search (Serper/Tavily) | Not in catalog | **Yes** | No | No (autonomous) | n/a | Real. Invisible in Integrations UI. |
| iCal calendar | Not in catalog | **Yes** | No | n/a | n/a | Real, read-only. |
| Alerts (Discord/ntfy) | Not in catalog | — | **Yes** (POST) | No | n/a | Real. Defaults to no channel. |
| Website fetch (prospect audit) | Not in catalog | **Yes** (arbitrary URL GET) | No | No | n/a | Real. No allow/deny list; fetches whatever URL is in `Prospect.website`. |
| Anthropic / OpenAI / OpenRouter / Ollama | Settings | **Yes** | — | No | n/a | Real. No spend cap. |
| Shopify | **Implemented** | Test ping only | None | — | — | **Placeholder presented as implemented.** |
| Printful / Printify | **Implemented** | None | None | — | — | **Placeholder presented as implemented.** "Connected" = env var present. |
| Meta Ads | **Implemented** | None | None | — | — | **Placeholder presented as implemented.** |
| Google Ads | **Implemented** | None | None | — | — | **Placeholder presented as implemented.** |
| Gmail / Workspace | **Implemented** | None | None | — | — | **Placeholder presented as implemented.** |
| YouTube Data API | **Implemented** | None | None | — | — | **Placeholder presented as implemented.** |
| Google Drive | **Implemented** | None | None | — | — | **Placeholder presented as implemented.** |
| Paper Trading (Internal) | **Implemented**, "always available", default `autonomous_limited` | None | None | — | — | **Does not exist.** Test returns ok unconditionally. |
| CRM | Planned | None | None | — | — | Honest placeholder. |
| Video tools | Planned | None | None | — | — | Honest placeholder. |
| Broker API | Planned | None | None | — | — | Honest placeholder. |
| Exchange API | Planned | None | None | — | — | Honest placeholder. |
| `AdsProvider`, `SocialProvider`, `CommerceProvider`, `CalendarProvider` | — | Interface stubs with `id` and `isConfigured` only | — | — | — | Declarations, no implementations (`providers/types.ts:77-80`). |
| `ConnectorRegistry` (legacy) | Commerce view | — | — | — | — | Second, unrelated registry of provider names. |

Eight catalog entries are marked `isPlaceholder: false` with no implementation. Five real integrations are missing from the catalog. `[Certain]` (grep for every connector env var returns only the Shopify test ping.)

---

# Test Coverage Gaps

Current coverage: **none**. No `*.test.*`, `*.spec.*`, `__tests__`, Vitest, Jest or Playwright test config. `playwright` is a dev dependency used only by screenshot scripts. CI (`.github/workflows/ci.yml`) runs `prisma db push`, lint and `next build`. `[Certain]`

Tests that should exist before any credential is configured, in priority order:

| # | Behaviour that must be pinned | Why |
|---|---|---|
| 1 | No email is sent unless its approval is `approved`; none for `pending`, `rejected`, `auto_approved` | The core promise; currently protected by a string mismatch |
| 2 | A draft is sent at most once under concurrent executors and across a crash at each step | Send-once guarantee |
| 3 | Emergency stop halts every side-effecting step | Currently false |
| 4 | Invoice / subscription executor: one Stripe object per approval under retry, failure at each of the four calls, and crash-after-success | D-6 |
| 5 | Stripe webhook: signature verification, replay, out-of-order events, reachable without session | Currently unreachable |
| 6 | `executeAssignment` executed twice yields one output, one approval set, one pipeline advance | D-2 |
| 7 | Two overlapping ticks produce no duplicate assignments, opportunities, approvals or drafts | D-1 |
| 8 | Approval state machine: illegal transitions rejected; double approve is a no-op | D-8, G-5 |
| 9 | Triage never auto-approves any `decisionType` that has an executor | G-3 |
| 10 | Team resolution is deterministic when several teams share a `departmentType` | BU-3 |
| 11 | Every row created by the pipeline carries a non-null, valid `businessUnitId` | BU-2 |
| 12 | Revenue rollups: probability scale, closed/pipeline/potential definitions, one answer across all endpoints | RA-2–4 |
| 13 | Queue: priority order, retry count, stale-lock reclaim | D-4, D-5 |
| 14 | Follow-ups stop on reply, on cap, on prospect lost; none when reply detection is unavailable | G-9 |
| 15 | Middleware rejects tokens signed with the fallback secret when `NODE_ENV=production` | G-6 |
| 16 | Autonomous engine does not throw on empty `workItems` | Crash today |
| 17 | LLM failure does not produce an output that flows into approvals as if real | S-3 |
| 18 | Throttle limits hold across a simulated 24 h of ticks (cost ceiling) | G-7 |

There is also no seam for testing: executors call `prisma`, `fetch` and Nodemailer directly, time comes from `Date.now()`, and there is no fake provider or dry-run mode.

---

# Production Risks

**P-1 (Critical). `uncaughtException` is swallowed and the process continues** (`error-guards.ts:42-47`). Node's documented position is that the process is in an undefined state after this event. With pooled SMTP and in-flight DB writes, continuing is how a "sending" claim or a Stripe claim gets stranded. The comment relies on Docker `restart: always`, which never triggers because the process never exits. `[Certain]`

**P-2 (Critical). Tick overlap** — see D-1.

**P-3 (High). Step failures are invisible.** Every step in `runRuntimeLoop` catches its own error and prints to the console; `safeTick` only records errors that escape, and none can. So `AlertLog` never hears about a failing step, and a step that fails every minute for a week looks identical to a healthy one from the UI. `[Certain]`

**P-4 (High). The dead-man's switch is inside the thing it watches.** `runAlertChecks` (including `runtime_offline` / `runtime_stale`) is called only from the worker loop. If the worker dies or hangs, nothing alerts. Default alert channel is `none`. `[Certain]`

**P-5 (High). No cost ceiling.** No token accounting, no daily LLM budget, no circuit breaker. Paths that retry every tick: a prospect whose analysis throws before `recommendedOffer` is written is re-analysed every 60 s (LLM calls each time, `discovery.ts:82-90`); failed Stripe approvals (D-6); legacy failing schedules (D-9). The LLM timeout uses `Promise.race` without aborting the request (`ai/provider.ts:49-53`), so timed-out calls keep running and are billed. `[Certain]`

**P-6 (High). Schema deployment by `prisma db push` on every container start, in both containers.** No migration history, no rollback. A schema change Prisma considers destructive makes `db push` exit non-zero; with `set -e` both containers crash-loop. There is no `--accept-data-loss` (good) and no alternative path (bad). The PostgreSQL branch calls `migrate deploy` but no migrations folder exists. `[Certain]`

**P-7 (High). Backups are not wired.** `scripts/backup-db.sh` expects host cron and a host path `/data/mioos.db`; the database lives in a named Docker volume and `sqlite3` is not installed in the image, so the script falls back to `cp` of a live WAL database (potentially inconsistent) if it runs at all. No restore procedure, no off-box copy. `[Certain: script and compose]` `[Likely: not running]`

**P-8 (Medium). Work piles up in `review` and starves teams.** Nothing moves an assignment from `review` to `completed` when its approval is decided. Local DB: 37 of 86 assignments in `review`. The V2 engine and the settings screen treat `review` as active work and cap at 2 per team, so those teams are permanently "busy". Opportunity throttle also latched at "Active opportunity limit reached (10/10)" in the local run with no automatic release. `[Certain]`

**P-9 (Medium). Unbounded table growth.** `SystemExecutionLog`, `RuntimeQueue`, `IntelligenceSignal`, `SearchResearch`, `AgentRun.inputContext` (full JSON context per run), `AlertLog`, `ExecutionHistory` have no retention. No indexes on any table beyond primary keys and `@unique`; every "today's count" query is a scan that runs every minute. `[Certain]`

**P-10 (Medium). Handoff amplification.** Rules form chains with no depth limit or loop guard: research → sales → approval; support → development → operations → executive. 38 of 77 completed queue items locally were handoffs. Each consumes an LLM call and adds a Decide item. `[Certain]`

**P-11 (Medium). Decide flooding.** Sales, marketing, content and commerce rules create an approval for every completed assignment regardless of content, and the governance fallback adds one for any `requiresApproval` team. The founder is asked to "approve outreach" for documents that contain no recipient and can send nothing. Approval fatigue is the practical failure mode of this design. `[Certain]`

**P-12 (Medium). Time-zone and "day" boundaries use server local time** (`setHours(0,0,0,0)` throughout). In a UTC container the daily limits reset at 02:00 Amsterdam time in summer; `computeNextRunAt` interprets `timeOfDay` in server time. `[Certain]`

**P-13 (Medium). Database path ambiguity.** `DATABASE_URL="file:./prisma/mioos.db"` is resolved relative to the schema directory, which is how the repo acquired `prisma/mioos.db`, `prisma/prisma/mioos.db`, `prisma/prisma/dev.db` and `prisma/prisma/prisma/mioos.db` — four databases on four schema generations, none matching the current schema (none has `system_config`; only one has `business_units`, with the old slugs). Production uses an absolute path, so this is a local hazard, but it means there is no local dataset that represents the current system. `[Certain]`

**P-14 (Medium). The web container also runs the legacy scheduler.** Two schedulers in two processes against one SQLite file. `[Certain]`

**P-15 (Low). In-memory login rate limiter** keyed on `x-forwarded-for` (spoofable unless Caddy overwrites it), reset on restart. Password compared with `!==`. `[Certain]`

**P-16 (Low). `tsx` runs TypeScript source in production**; no build step, no type-check gate for the worker in CI beyond `next build` (which does not compile `runtime/`). `[Likely]`

**P-17 (Low). `.items-center.swp`, `ruvector.db`, `.remember/`, `.superpowers/`, `Claude outputs/` in the repo root.** Clutter; `ruvector.db` is 1.6 MB of unrelated tooling state. `[Certain]`

---

# Delete / Keep / Refactor Matrix

This is a recommendation for the later fix phase. Nothing here has been done.

| Component | Verdict | Reason |
|---|---|---|
| `lib/actions/executor.ts` + `email-send.ts` | **Keep** | Best code in the repo: gate re-checked, atomic claim, audit row |
| `lib/providers/*` (Email, Payment interfaces) | **Keep, harden** | Right seam; add idempotency keys, dry-run provider |
| `lib/ai-ventures/discovery.ts`, `website-analyzer.ts`, `offers.ts` | **Keep** | Only real top-of-funnel; add URL safety and caps |
| `lib/ai-ventures/prospect-engine.ts` | **Refactor** | Make atomic and idempotent per prospect; stop hard-coding the unit |
| `lib/actions/reply-matcher.ts`, `followup-scheduler.ts` | **Refactor** | Match per thread, add suppression list, stop when detection is blind |
| `lib/actions/invoice-executor.ts`, `subscription-executor.ts` | **Refactor before first use** | D-6, RA-6, RA-7; add a caller or remove |
| `app/api/webhooks/stripe` | **Refactor** | Make public, add event de-dup |
| `lib/connectors/*` (email read, web search, calendar) | **Keep** | Honest and read-only |
| `lib/alerting/alert-manager.ts` | **Keep, relocate trigger** | Needs an external watchdog |
| `lib/auth.ts`, `middleware.ts` | **Keep, fix G-6** | |
| `runtime/runtime-worker.ts` / `runtime-loop.ts` | **Refactor** | Single-flight loop, pause check, per-step error reporting, exit on fatal |
| `runtime/runtime-queue.ts` | **Refactor** | Numeric priority, unique assignment, lease with expiry |
| `lib/workforce/executor.ts` | **Refactor** | Idempotent per assignment; resolve `review` on decision |
| `lib/workforce/output-generator.ts` | **Keep AI path, delete templates as "outputs"** | Template text must not flow downstream |
| `lib/workforce/handoff-engine.ts` + `AutomationRule` | **Refactor** | Rules keyed on unit and artefact type, not department; depth limit |
| `lib/governance/approval-triage.ts` | **Refactor** | Risk from action type, not keywords; never auto-approve executable types |
| `lib/actions/approval-dispatcher.ts` | **Refactor** | Upsert, state machine, stop auto-creating Projects |
| `lib/opportunity-engine.ts`, `lib/company/department-pipeline.ts`, `lib/workflow-router.ts` | **Refactor** | Carry unit id; stop writing invented revenue into `RevenueEntry` |
| `lib/businessUnits/config.ts` | **Keep as the single source** | Then delete every other slug map |
| `lib/businessUnits/rollup.ts` | **Keep** | Correct shape once inputs are canonical |
| `lib/autonomy-throttle.ts` | **Keep, extend** | Becomes the per-unit budget governor |
| `lib/autonomy.ts` | **Keep, enforce everywhere** | |
| `lib/workforce/autonomous-engine.ts` + `team-behaviors.ts` | **Decide: finish or delete** | Currently crashes; duplicates objective evaluator |
| `lib/workforce/team-work-scheduler.ts` | **Delete** | No caller; third copy of the team definitions |
| `lib/company/capital-allocator.ts` | **Rename or delete** | Allocates no capital; overwrites team focus text |
| `lib/company/research-engine.ts`, `lib/autonomous-conditions.ts`, objective evaluator, executive monitor, executive orchestrator | **Consolidate to one work generator** | Five modules that all create assignments on timers |
| `lib/intelligence/signal-processor.ts` | **Refactor or delete** | A no-op today |
| `lib/integrations/connector-catalog.ts` | **Refactor** | Mark eight entries as planned; add the five real ones; enforce mode in executors |
| `app/api/runtime/trigger` | **Delete** | Second queue processor racing the worker |
| `instrumentation.ts` + `lib/scheduleRunner.ts` | **Delete** | Legacy scheduler in the web process |
| `lib/agentEngine.ts`, `workflowRunner.ts`, `approvalExecutor.ts`, `toolExecutor.ts`, `executiveLoop.ts`, `agentHealth.ts`, `agentScorecard.ts`, `memoryExtractor.ts`, `patternAnalyzer.ts`, `insightEngine.ts`, `briefingGenerator.ts`, `memoryClassifier.ts`, `importanceScorer.ts`, `duplicateDetector.ts` | **Delete after confirming no production data matters** | Legacy agent world |
| ~30 `app/api/agent*`, `agents/*`, `approvals/*`, `executive-loop/*`, `commerce/*`, `leads`, `upsell`, `onboarding`, `deployments`, `tools`, `patterns`, `insights`, `memory-suggestions`, `schedule-executions`, `workflow-executions`, `tool-executions` routes | **Delete with the above** | |
| `components/agents/*` (19 files), `commerce/*`, legacy views in `app/page.tsx:73-94` | **Delete or quarantine** | Not in the six-destination navigation |
| Legacy models (`Agent*`, `ApprovalQueue`, `Tool*`, `CommerceOpportunity`, `Lead`, `ConnectorRegistry`, `ExecutiveLoopRun`, `Insight`, `PatternRecord`, …) | **Drop last, via a real migration** | After export |
| `scripts/normalize-teams.mjs`, `normalize-via-api.mjs`, `app/api/admin/normalize-teams`, `scripts/screenshot-*.mjs` | **Delete** | Dead |
| `scripts/backfill-business-units.ts` | **Keep until attribution is written at source, then delete** | |
| `prisma/prisma/**`, `ruvector.db`, `.items-center.swp` | **Delete from disk** | Stale artefacts |
| 15 routes using `data: body` | **Refactor** | Whitelist fields |

---

# Recommended Migration Order

Ordered so that each step makes the next one safe. Steps 1–3 are small and should precede any credential being set in production.

1. **Make the stop button real.** One governance check at the top of the loop and immediately before every side-effecting call (send, Stripe, search, fetch, LLM), reading pause state, unit status and connector mode. Smallest change, largest risk reduction.
2. **Single-flight the worker and fail fast.** Replace `setInterval` with run-then-sleep; exit on `uncaughtException`; record a failure row per step; add an external heartbeat check (a cron `curl` of `/api/runtime/status` is enough).
3. **Close the auth and approval holes.** Refuse to start without `SESSION_SECRET` in production; whitelist fields on approval create; add the approval state machine; upsert `ActionResult`.
4. **Write the test harness and the first eight tests in the table above.** A fake `EmailProvider` and `PaymentProvider`, an injectable clock, a scratch SQLite per test.
5. **Decide the business-unit model once.** Four units, one slug list, one document. Reconcile CLAUDE.md, the project instructions and `founder_context` (in particular: is Capital research-only, research + paper, or cut?). Everything after this depends on that answer, and it is a founder decision, not an engineering one.
6. **Give teams a unit.** Add `WorkforceTeam.businessUnitId` with a real relation; resolve teams by `(businessUnitId, function)` instead of `departmentType`; retire the twin teams; write `businessUnitId` at creation on every row; then delete the backfill.
7. **Make execution idempotent.** Unique `(assignmentId)` on the queue, lease-based locks, idempotency keys on assignment execution and on every provider call, transactions around multi-row writes.
8. **Separate the revenue ledger from forecasts.** Real money (provider-backed, per payment, integer cents, unit-attributed) in one table; estimates stay on `Opportunity`. One definition of closed, pipeline and probability.
9. **Fix Stripe end to end or remove it.** Public webhook with event de-dup, idempotent creation, a caller for the approval, per-period payment rows.
10. **Make the connector catalog honest and enforced.**
11. **Add spend governance.** Token and API cost accounting per unit, daily ceilings, circuit breakers on repeated failure.
12. **Collapse the five work generators into one scheduler per unit**, with an explicit backlog cap and automatic resolution of `review`.
13. **Remove the legacy agent world** (code, routes, views, then tables via a proper migration).
14. **Introduce migrations and wired backups** before the first schema change in production.
15. **Only then** build the second unit's real execution path.

---

# Blockers Before Autonomous Operation

Each of these is a hard stop for "run 30 days unattended with credentials configured".

| # | Blocker | Reference |
|---|---|---|
| 1 | Emergency stop, autonomy level and connector mode do not control the worker | G-1, G-2 |
| 2 | Ticks overlap; duplicate approvals and duplicate sendable drafts are possible | D-1 |
| 3 | No tests of any kind | Test Coverage Gaps |
| 4 | Worker keeps running after an uncaught exception; step failures are not recorded; no external liveness alert | P-1, P-3, P-4 |
| 5 | No spend ceiling; several retry-every-minute paths | G-7, P-5 |
| 6 | Stripe path duplicates on retry and its webhook is unreachable | D-6, RA-11 |
| 7 | Session forgery when `SESSION_SECRET` is missing; approvals can be created pre-approved | G-5, G-6 |
| 8 | Approval does not bind the payload that is executed | G-4 |
| 9 | Business-unit identity is undefined: three taxonomies, nondeterministic team routing, no attribution at source | BU-1 – BU-12 |
| 10 | Revenue figures are not reliable enough to steer by | RA-1 – RA-10 |
| 11 | `review` backlog and Decide flooding make founder approval the bottleneck within days | P-8, P-11 |
| 12 | No outreach suppression, opt-out or send cap; follow-ups run when reply detection is blind | G-8, G-9 |
| 13 | Schema changes deploy by `db push` with crash-loop on conflict; backups not wired | P-6, P-7 |
| 14 | Three of four business units have no execution path, so "autonomous holding company" currently means one outreach funnel plus document generation | Real End-to-End Capabilities |
| 15 | The target itself is contested across four documents | North Star drift |

A reasonable interim posture: the system is safe to run **without** SMTP and Stripe credentials as a research-and-drafting tool with a human reading the output, provided an LLM spend limit is set on the provider side. It is not safe to run with them.
