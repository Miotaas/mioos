# MioOS Constitution v1

Status: **binding** · Ratified by the founder: 2026-10-11 · Version: 1.1 (amended 2026-10-17)

This document is the highest-level product and architecture source for MioOS. Where any other document, prompt, code comment or UI label conflicts with it, this Constitution wins (see §21).

It was written against the findings of `docs/ARCHITECTURE_REALITY_AUDIT.md` (2026-10-11). It describes the target and the rules. It does not claim the code already complies; §19 lists what must be true before production credentials are enabled.

---

## 1. Core Identity

MioOS is an autonomous digital holding operating system.

Its purpose is to build, operate, supervise and improve multiple revenue-generating digital business units from one central system.

MioOS is not primarily:

- A task manager
- A generic agent playground
- A CRM
- A developer dashboard
- A collection of disconnected automations
- A simulation pretending to operate businesses

MioOS exists to:

- Discover economic opportunities
- Validate opportunities using real evidence
- Prepare execution
- Execute permitted actions
- Escalate decisions when required
- Generate revenue
- Track real economic outcomes
- Learn from successes and failures
- Reallocate attention and resources toward better opportunities

The founder supervises the company through outcomes and decisions rather than individual agent tasks.

---

## 2. Canonical Business Units

MioOS has exactly four primary economic Business Units. These are the only canonical business identities.

### 2.0 Unit status

Every Business Unit has exactly one status.

| Status | Meaning |
|---|---|
| `operational` | The unit may consume autonomous runtime and budget within its limits. |
| `dormant` | The unit exists as an identity only. It receives **zero autonomous runtime and zero budget**. |

Status under Constitution v1:

| Unit | Slug | Status |
|---|---|---|
| Mio Solutions | `mio-solutions` | **operational** |
| Mio Media | `mio-media` | **dormant** |
| Mio Commerce | `mio-commerce` | **dormant** |
| Mio Capital Lab | `mio-capital` | **dormant** |

Rules for a dormant unit:

- No assignments are created for it, by any scheduler, rule, handoff or condition.
- No LLM call, search, fetch, connector call or paid tool is made on its behalf.
- No opportunities are generated, validated or routed for it.
- Its budget for every category in §10 is 0.
- Work the founder requests by hand for a dormant unit is allowed; it is founder work, not autonomous runtime.

`operational` is a permission, not a quality mark. Mio Solutions is the only unit permitted to run. It does not yet meet the Definition of Done in §18.

Activating a dormant unit requires all of the following:

1. An explicit founder amendment to this Constitution changing the unit's status.
2. Every item in §19 is complete and proven.
3. Mio Solutions has at least one collected customer payment recorded as real revenue (§5).

### 2.0.1 Deliberate re-inclusion of Media and Capital

Mio Media and Mio Capital Lab are **deliberately re-included** as canonical Business Units in this Constitution.

This overrules every earlier decision that cut, paused, pivoted away from or excluded a media/social unit or a trading/capital unit, including the MioOS V5 decisions of 2026-09-02 and the September 2026 pivot verdict on the social engine. Where those documents conflict with this section, they are superseded.

Re-inclusion settles identity, not activity. Both units are dormant (§2.0).

### 2.1 Mio Solutions

Canonical slug: `mio-solutions` · Status: operational

**Mission.** Generate recurring and project-based revenue by identifying business problems and selling AI, software and automation solutions.

**Revenue models.** Setup fees, implementation fees, monthly retainers, SaaS subscriptions, usage-based services, maintenance agreements.

**Typical offers.** AI workflow automation, mail and inbox automation, internal business tools, operational dashboards, AI assistants, website automation, quoting automation, document automation, custom integrations.

**Core capabilities.** Market Research, Prospect Discovery, Business Analysis, Sales, Solution Architecture, Development, Delivery, Customer Success, Billing.

**Initial priority.** Mio Solutions is the first production revenue unit. The existing AI Ventures / automation outreach system migrates into Mio Solutions. AION, Mail Co-Pilot and the AI Website Agency are ventures or offers inside Mio Solutions; they are not Business Units.

#### 2.1.1 Opportunity scope

**Priority portfolio, not a boundary.** AION, Mail Co-Pilot and the AI Website Agency form the current priority portfolio of Mio Solutions. They receive attention, research and resources first. They do not limit what Mio Solutions may pursue: it continuously discovers, validates and develops new AI, software and automation opportunities that fit its mission.

**Opportunity classes.** Every Mio Solutions opportunity belongs to exactly one class:

1. Software venture
2. SaaS product
3. AI product
4. Automation service
5. Productized service
6. Internal tool with commercialization potential — only when there is a credible path to selling it to others

An opportunity that fits none of these classes is not a Mio Solutions opportunity.

**External evidence gate.** A new opportunity outside the priority portfolio may be pursued autonomously only when all of the following hold:

- It is supported by real external evidence: sources that exist independently of MioOS and were actually consulted. A statement produced by a model is not evidence (§11).
- The evidence comes from more than one independent source.
- There is a named target customer with a specific problem.
- There is a credible monetization path: who pays, for what, and why.

Without these, the opportunity is not admitted. An opportunity within the priority portfolio that lacks external evidence may still be explored, but it carries low confidence and its claims are recorded as assumptions.

**Exclusions.** The following never enter Mio Solutions, whatever their evidence:

- Generic ideation or idea lists
- Affiliate opportunities
- Media or content businesses
- E-commerce products
- Capital, investing or trading opportunities

Building software or automation *for* companies in these sectors is allowed. Operating such a business is not; that belongs to another Business Unit, and the dormant units remain dormant (§2.0).

**Authority.** MioOS may autonomously discover, research, validate and recommend new Mio Solutions ventures. This is internal work (§6.1). External and financial actions for any opportunity remain governed by §6 and §10.

MioOS may not autonomously:

- promote a new venture into the priority portfolio;
- demote or remove an existing priority venture;
- materially reallocate effort, budget or other resources between portfolio ventures, or away from the portfolio toward a new venture.

These are founder decisions. MioOS may raise one by creating a founder decision that recommends the change, supported by its evidence and the expected impact of approving and of rejecting it.

### 2.2 Mio Media

Canonical slug: `mio-media` · Status: dormant

**Mission.** Build and operate owned digital audiences and content brands that generate revenue.

**Revenue models.** Advertising revenue, affiliate income, sponsorships, digital products, lead generation, commerce traffic, content services where strategically useful.

**Channels.** YouTube, YouTube Shorts, Instagram Reels, TikTok, other approved platforms.

**Core capabilities.** Trend Research, Niche Research, Content Strategy, Scriptwriting, Storyboarding, Voice Generation, Visual Generation, Video Production, Editing, Quality Control, Publishing, Analytics, Monetization.

**Execution principle.** Mio Media is not complete when it produces a content brief. Its execution chain is complete only when it results in a publishable media artifact such as a rendered video.

Target production architecture:

```text
Research → Idea → Script → Storyboard → Asset Generation → Voice
→ Video Production → Edit → Quality Control → Approval → Publish
→ Performance Analysis → Learning
```

Tools such as Higgsfield, voice generation providers and FFmpeg may become execution providers. Publishing is founder-gated until explicitly upgraded.

### 2.3 Mio Commerce

Canonical slug: `mio-commerce` · Status: dormant

**Mission.** Build profitable e-commerce businesses using supplier or fulfilment partners without holding inventory by default.

**Default fulfilment model.** Supplier / Fulfilment Partner → Customer. MioOS coordinates the commercial and operational process. Inventory ownership is not the default business model.

**Revenue model.**

```text
Customer Revenue
− Product Cost − Fulfilment − Payment Costs − Advertising − Refunds − Other Operating Costs
= Contribution Margin
```

**Core capabilities.** Market Research, Product Discovery, Supplier Discovery, Supplier Validation, Margin Analysis, Product Validation, Merchandising, Store Operations, Creative Production, Marketing, Order Operations, Tracking, Customer Support, Refund Management, Profitability Analysis.

**Execution principle.** A product opportunity is not valid simply because an LLM believes it has demand. Commerce opportunities require external evidence. Supplier, margin, demand and fulfilment assumptions must be explicitly tracked. No inventory purchase, advertising spend or supplier commitment occurs without approval unless a later autonomy policy explicitly permits it.

### 2.4 Mio Capital Lab

Canonical slug: `mio-capital` · Status: dormant

**Mission.** Research systematic investment and trading strategies and determine whether they exhibit real, repeatable risk-adjusted performance.

**Operating mode when activated.** Research + Backtesting + Paper Trading only. Real-money autonomous trading is prohibited in Constitution v1.

**Core capabilities.** Market Data, Market Research, Strategy Research, Signal Research, Backtesting, Walk-Forward Validation, Paper Execution, Portfolio Simulation, Risk Analysis, Performance Attribution.

**Required lifecycle.**

```text
Hypothesis → Strategy Definition → Historical Test → Out-of-Sample Test
→ Walk-Forward Validation → Paper Trading → Performance Review
```

Only after this lifecycle has demonstrated robust performance may the founder separately consider real-money execution.

**Prohibited in Constitution v1.**

- Autonomous real-money trading
- Autonomous leverage
- Martingale systems
- Unbounded position sizing
- LLM-only trade execution
- Access to operating cash
- Automatic promotion from paper trading to live trading

The LLM may perform research and interpretation. It must not be the primary risk engine.

---

## 3. Business Units vs Capabilities

A Business Unit represents an economic business. A capability or team represents work that the business can perform. These concepts must never be interchangeable.

| Unit | Example capabilities |
|---|---|
| Mio Solutions | Research, Sales, Development, Operations |
| Mio Media | Research, Scriptwriting, Production, Publishing |
| Mio Commerce | Research, Supplier Operations, Marketing, Customer Support |
| Mio Capital Lab | Research, Backtesting, Paper Execution, Risk |

Therefore `research`, `sales`, `content`, `development`, `marketing`, `operations`, `support` and `executive` are not Business Units. They are capabilities belonging to a Business Unit.

Routing must never rely only on a generic capability such as `departmentType = research`.

Every operational object must know both:

1. Which Business Unit owns the work.
2. Which capability is performing the work.

---

## 4. Canonical Identity Model

The canonical Business Unit slugs are:

```text
mio-solutions
mio-media
mio-commerce
mio-capital
```

The `mio-` prefix is deliberate: no canonical unit slug may collide with any capability name, team slug or historical identifier.

No new Business Unit slugs may be introduced without explicitly changing this Constitution.

The following historical identities are deprecated as Business Unit identities:

```text
ai-ventures   automation-sales   automation-revenue   website-revenue
youtube       crypto-stock       ecommerce            content
sales         research           development          commerce
capital       marketing          operations           support        executive
```

Migration mapping for historical **unit-level** identities:

| Historical identity | Canonical unit |
|---|---|
| `ai-ventures`, `automation-sales`, `automation-revenue`, `website-revenue` | `mio-solutions` |
| `content`, `youtube` | `mio-media` |
| `ecommerce`, `commerce` | `mio-commerce` |
| `capital`, `crypto-stock` | `mio-capital` |

`sales`, `research`, `development`, `marketing`, `operations`, `support` and `executive` are capabilities and map to no unit by name. A historical record that carries only a capability and no derivable unit stays unattributed and is flagged for founder review. It is never assigned to a unit by guess.

Some historical names may continue to exist temporarily as technical team or migration identifiers. They must not be treated as separate economic businesses. Historical data must be mapped to one of the four canonical units or explicitly marked unattributed.

---

## 5. Canonical Economic Objects

Constitution v1 introduces **no new parallel models**. Each canonical object below is realised by an existing model, which is extended where needed. The legacy `ApprovalQueue`, `CommerceOpportunity`, `Lead` and `ConnectorRegistry` models are deprecated and are not the basis for anything new.

| Canonical object | Existing model that is its basis |
|---|---|
| BusinessUnit | `BusinessUnit` |
| Opportunity | `Opportunity` |
| Assignment | `Assignment` |
| Artifact | `Artifact` (with `WorkforceOutput` as its source text) |
| Approval | `Approval` |
| Action | `ExecutionHistory` (one row per execution attempt) + `ActionResult` (one row per approval; the idempotency anchor) |
| Revenue | `RevenueEntry` |

### BusinessUnit

The economic owner of work, risk, cost and revenue. Every material operating record must belong to a Business Unit, written at creation, not backfilled afterwards.

### Opportunity

A potential economic opportunity. It may contain evidence, market, customer, estimated value, confidence, costs, risks, assumptions, validation state and recommended action.

Opportunity estimates are forecasts. They are not revenue. Forecast and pipeline values live on the Opportunity.

### Assignment

Internal work that must be performed, such as researching a market, analysing a prospect, validating a supplier, creating a script or backtesting a strategy.

Assignments are operational objects, not economic results.

An assignment waiting on an approval must be closed when that approval is decided: completed on approval, closed as rejected on rejection. No assignment may remain in a waiting state after its approval has a final status.

### Artifact

A usable business output, such as a prospect analysis, proposal, script, rendered video, supplier scorecard, landing page or backtest report. An Artifact represents something that can be used in the next stage of execution.

### Approval

A governance authorization, realised by the `Approval` model.

Approval means: the founder or an authorized policy permits **one defined action against one defined payload**.

- An approval is bound to the exact payload being authorized by a stored hash of that payload.
- Changing the payload invalidates the approval.
- Approval status follows a strict state machine. Only `pending` may become `approved` or `rejected`. A decided approval never returns to `pending` and never flips between `approved` and `rejected`.
- An approval is never created in a decided state.
- An approval for an action type that has an executor is never auto-approved.

### Action

An external or materially consequential execution, such as sending an email, publishing a video, creating an advertisement, sending a proposal, creating an invoice, placing a supplier order or executing a trade.

Actions are realised by `ExecutionHistory` and `ActionResult`:

- `ExecutionHistory` is the append-only audit log: one row per attempt, with the payload hash, the outcome and the error.
- `ActionResult` is the single result per approval and carries the deterministic idempotency key.

Actions must be idempotent and auditable.

### Revenue

Revenue means economically real revenue, realised by `RevenueEntry`.

The system must distinguish forecast value, pipeline value, invoiced amount, collected cash, recurring revenue, refunds and costs.

- `RevenueEntry` holds real money only: invoiced amounts, collected cash, recurring payments per period and refunds. Each row carries an explicit kind, a Business Unit and a provider reference.
- Forecast and pipeline values are not `RevenueEntry` rows. They stay on the Opportunity.
- AI-generated revenue estimates remain attached to Opportunities and never count as actual revenue.
- Costs are recorded per Business Unit (§10). Cost records extend the existing ledger; they are not a second revenue model.

---

## 6. Autonomy Model

MioOS uses three separate forms of autonomy. They must not be combined into one generic switch.

### 6.1 Internal Autonomy

May be performed automatically within limits: research, analysis, opportunity discovery, draft creation, planning, validation, scoring, backtesting, paper trading, internal recommendations, data organization.

Internal autonomy may operate without founder approval when the unit is operational and budget and safety rules permit it. A dormant unit has no internal autonomy.

### 6.2 External Autonomy

Actions affecting third parties: emailing a prospect, publishing content, changing a live website, starting advertising, sending proposals, supplier communication, customer communication, creating invoices.

Constitution v1 default: **approval required**. Individual external action types may later receive limited autonomous permission, but this must be explicitly configured.

### 6.3 Financial Autonomy

Actions that move, commit or expose real money: paying suppliers, issuing refunds, increasing advertising budgets, purchasing inventory, starting subscriptions, executing trades, moving capital.

Constitution v1 default: **locked**. Financial actions require explicit approval. Real-money trading remains prohibited.

---

## 7. Governance Hierarchy

Every action passes through this hierarchy:

```text
Global Safety
↓
Business Unit Policy (including unit status)
↓
Connector Policy
↓
Budget Policy
↓
Action Policy
↓
Approval
↓
Execution
```

Failure at any layer blocks execution.

An approval may never override:

- Emergency stop
- A dormant or disabled Business Unit
- A disabled connector
- A global safety rule
- A hard budget limit
- A prohibited action

---

## 8. Emergency Stop

Emergency Stop is absolute. When active, MioOS must not perform any new external or financial action.

It must stop email sends, publishing, Stripe operations, supplier operations, advertising changes, financial execution and external POST/PUT/PATCH/DELETE actions.

Internal reads and diagnostics may continue when safe.

Emergency Stop must be checked:

1. At the runtime-loop boundary.
2. Immediately before every external side effect.

UI state alone is not sufficient. The runtime itself must enforce it.

---

## 9. Connector Governance

A connector has an enforced execution mode.

| Mode | Meaning |
|---|---|
| `disabled` | No use. |
| `read_only` | May retrieve information but may not write externally. |
| `draft_only` | May retrieve information and prepare an internal action. No external write. |
| `approval_required` | May execute the exact approved action after approval. |
| `autonomous_limited` | May perform explicitly permitted actions within defined scope and budgets. |

Connector mode must be enforced by execution code. It is not merely a UI preference.

A connector is listed as implemented only if code exists that uses it. A connector without an implementation is listed as planned.

---

## 10. Budget Governance

Budgets and hard spend caps are **mandatory before any production credential is enabled**. No SMTP, payment, search, publishing, advertising or trading credential may be configured in production until the caps below exist and are enforced by the runtime.

Every Business Unit has separate limits for:

- LLM spend
- Search/API spend
- Advertising spend
- Tool spend
- Financial exposure
- Daily activity
- Monthly activity

Rules:

- Every limit is a hard cap. Reaching it blocks further spend in that category for that unit until the period resets or the founder raises it.
- Dormant units have a cap of 0 in every category.
- Spend is recorded per Business Unit as it occurs (cost accounting), so the remaining budget is always known.
- A provider-side spend limit is set on every paid API account as a second line of defence.
- A path that fails repeatedly stops and escalates. It does not retry on a timer without a bound.
- Outreach has a daily send cap per unit.

The system must prefer bounded experimentation:

```text
Hypothesis → €5 validation → evidence → €25 test → evidence → €100 test → scale decision
```

not:

```text
AI believes opportunity is promising → large spend
```

---

## 11. Evidence Standard

MioOS must clearly distinguish fact, external evidence, AI inference, estimate, assumption and simulation result.

An LLM statement is not evidence merely because it sounds credible.

Bad: "Demand appears strong."

Better: "Three external sources show rising search interest, two competitors have active campaigns, and supplier pricing produces a 41% gross margin."

The system must lower confidence when evidence is unavailable.

Template fallback output must never silently advance a revenue pipeline as if it were researched evidence.

---

## 12. Execution Standard

A unit is not considered operational in the sense of §18 because it can generate text. Real execution means an opportunity can produce an observable real-world outcome.

| Unit | Real execution chain |
|---|---|
| Mio Solutions | Prospect → outreach → conversation → proposal → invoice → payment |
| Mio Media | Idea → script → rendered media → publish → views → monetization |
| Mio Commerce | Product → supplier → listing → sale → fulfilment → delivery → margin |
| Mio Capital Lab | Strategy → backtest → paper order → fill → P&L → risk metrics |

Database rows and AI reports alone do not constitute an operating business.

### 12.1 Outreach standard

Any unit that contacts third parties must have, before the first production send:

- A suppression list that is checked before every send.
- An opt-out mechanism in every message, with opt-outs written to the suppression list.
- Follow-ups that stop on reply, on opt-out, on bounce and when the prospect is marked lost.
- No follow-up when reply detection is unavailable or failing.
- The daily send cap from §10.

Legal compliance of outreach is the founder's responsibility and is confirmed before the first production send.

---

## 13. Runtime Principles

MioOS must have one canonical production runtime.

The runtime must be single-flight, idempotent, observable, recoverable, budget-aware and governance-aware.

- No second scheduler may independently execute the same work.
- Every runtime operation must support safe retry.
- Critical external actions require deterministic idempotency keys.
- **Fail-fast.** On an uncaught exception or an unrecoverable state the runtime exits and is restarted by its supervisor. It does not continue in an undefined state.
- **Liveness.** Runtime health is checked by something outside the runtime, and an alert reaches the founder when the runtime is down or stale. The runtime is never the only thing watching the runtime.
- Every failed runtime step is recorded where the founder can see it. Console output alone is not a record.

### 13.1 Data safety

- Schema changes are applied through versioned migrations with a known rollback path.
- Backups run automatically, are stored off the server, and a restore has been tested.
- Both are in place before production credentials are enabled.

---

## 14. Failure Philosophy

MioOS must fail closed for consequential actions.

- If approval status cannot be verified: do not execute.
- If Emergency Stop cannot be read: do not execute.
- If unit status or connector configuration cannot be verified: do not execute.
- If the budget state cannot be read: do not spend.
- If payment state is ambiguous: do not retry blindly.
- If a supplier state is unknown: escalate.
- If AI output is malformed: reject the output.

MioOS should never interpret uncertainty as permission.

---

## 15. Human Role

The founder is not intended to micromanage assignments.

The founder should primarily define strategy, set budgets, review high-impact opportunities, approve consequential actions, resolve ambiguity, change autonomy policies, allocate capital and kill weak business lines.

MioOS should surface decisions rather than implementation noise. A decision is surfaced only when there is something concrete to authorize.

---

## 16. Founder Interface

The command center should answer:

1. What value was created?
2. What opportunities were found?
3. What changed economically?
4. What is currently running?
5. What requires a decision?
6. What is blocked?
7. Which Business Unit is performing best?
8. Where should resources be allocated next?

The UI should primarily expose business outcomes. Raw runtime internals belong in diagnostics.

---

## 17. Revenue Priority

Activation order of the Business Units:

1. Mio Solutions
2. Mio Media
3. Mio Commerce
4. Mio Capital Lab

Under Constitution v1 only Mio Solutions is operational. All autonomous runtime and budget go to Mio Solutions until the activation conditions in §2.0 are met for the next unit.

Mio Solutions is first because an existing prospect-to-outreach architecture already exists and provides the shortest path to proving a real revenue loop. Mio Media follows because its execution path can become highly automated. Mio Commerce follows after governance, supplier validation and financial controls are mature. Mio Capital Lab remains a controlled research environment until the system demonstrates sufficient reliability for financial experimentation.

---

## 18. Definition of Done for a Business Unit

A Business Unit is not considered done until it has:

- Real input sources
- Real evidence collection
- Opportunity generation
- Validation logic
- Execution capability
- Governance
- Idempotency
- Audit trail
- Metrics
- Cost accounting
- Revenue or outcome accounting
- Failure recovery
- Tests for critical paths

Generating AI content alone does not satisfy this definition.

---

## 19. Immediate Engineering Priorities

All items below must be complete and proven **before any production credential is enabled**. They are done in this order.

1. **Tests first.** A test harness with fake providers and a controllable clock, and automated tests for every external action. No item below is changed without a test that pins its behaviour.
2. Enforce Emergency Stop at the runtime-loop boundary and immediately before every external side effect.
3. Make the runtime single-flight, fail-fast on uncaught exceptions, and monitored by an external liveness check with alerting.
4. Fix production session-secret enforcement.
5. Introduce the strict approval state machine.
6. Bind approvals to immutable execution payloads.
7. Enforce connector modes in execution code.
8. Remove duplicate scheduling paths.
9. Make external execution idempotent.
10. Introduce budgets, hard spend caps and cost accounting per Business Unit (§10).
11. Add the outreach suppression list, opt-out handling and send caps (§12.1).
12. Canonicalize Business Unit ownership and enforce unit status, so dormant units receive no runtime.
13. Separate forecast value from real revenue.
14. Close assignments when their approval is decided.
15. Introduce versioned migrations and tested, off-server backups (§13.1).

Only after these foundations are proven may production autonomy increase.

---

## 20. Migration Rule

Existing functionality should not be rebuilt without reason.

```text
Keep what works.
Isolate what is legacy.
Make identity canonical.
Make execution safe.
Test it.
Then expand.
```

Legacy identifiers may remain temporarily for migration compatibility.

No new feature may introduce another parallel Business Unit taxonomy, approval system, opportunity model, revenue model or execution runtime.

---

## 21. Architecture Decision Authority

This Constitution is the highest-level product and architecture source for MioOS.

```text
docs/MIOOS_CONSTITUTION.md
↓
CLAUDE.md
↓
Technical architecture documentation
↓
Founder Context
↓
Code
↓
UI labels
```

If lower-level documentation conflicts with this Constitution, the Constitution wins. This includes project instructions, earlier decision records and roadmap documents.

Claude must not reinterpret or modify these principles without explicit founder instruction.

**Amendments.** Only the founder amends this Constitution. Every amendment raises the version number and is recorded in the change log below.

---

## 22. North Star

MioOS continuously operates a portfolio of digital businesses, discovers opportunities, validates them using real evidence, executes within delegated authority, requests human judgment where necessary, records the economic result and becomes better at allocating resources over time.

A successful MioOS should be able to run for extended periods with minimal founder intervention while remaining bounded by strict governance.

The objective is not maximum autonomy.

The objective is: **maximum economically useful autonomy within controlled risk.**

---

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-17 | §2.1.1 added: the three ventures are the priority portfolio, not the scope boundary; six opportunity classes; external evidence gate for new opportunities; exclusions; authority — MioOS may discover, validate and recommend new ventures, but only the founder promotes, demotes or materially reallocates portfolio resources. |
| 1.0 | 2026-10-11 | First binding version. Four canonical units with `mio-` slugs; Mio Solutions operational, the other three dormant; Media and Capital deliberately re-included; canonical objects mapped to existing models; budgets mandatory before credentials; §19 reordered with tests first and four added blockers. |
