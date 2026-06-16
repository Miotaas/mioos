# MioOS V4 — Architecture Document

> This document defines what MioOS is, what it does, and how it works.
> It is the source of truth for all design, database, and implementation decisions.
> No UI, no code, no database schema is defined here.
> All of those derive from this document.

---

## What Is MioOS?

MioOS is a Personal AI Command Center.

It is not software you use to manage work.
It is a system that operates a business on your behalf.

The relationship:

```
Owner (Michiel)
     ↓
  MioOS   ←— the operating intelligence
     ↓
  Teams   ←— autonomous business units
     ↓
 Revenue  ←— the result
```

The owner sets direction and approves consequential actions.
MioOS coordinates, monitors, prioritizes, and governs.
Teams operate autonomously within approved boundaries.
Revenue is the outcome that validates the system.

MioOS is not one of the teams.
MioOS is not a team member.
MioOS stands above the teams.
MioOS is the CEO-agent.

---

## What Does MioOS Do?

MioOS has six responsibilities:

**1. Monitor**
Continuously observes all team activity, revenue events, opportunity signals, and risk indicators across the entire operation.

**2. Prioritize**
Determines what matters and what doesn't. Surfaces only information that requires owner attention. Filters noise aggressively.

**3. Coordinate**
Ensures teams are aware of each other's outputs when relevant. Prevents duplication. Identifies cross-team opportunities.

**4. Govern**
Enforces approval policies. No consequential external action occurs without owner authorization. Maintains audit history of all decisions.

**5. Brief**
When the owner opens MioOS, they immediately understand the current state of the operation: revenue position, active opportunities, team activity, and pending decisions.

**6. Learn**
Tracks outcomes of approved actions. Improves future recommendations based on what worked and what didn't.

---

## Core Objects

These are the entities MioOS understands. Nothing more.

### Signal
A raw piece of information detected by a team or external source.
- Source (which team, which channel)
- Content (what was found)
- Detected at (timestamp)
- Status: unprocessed → evaluated → promoted to Opportunity or dismissed

Signals are internal. The owner never sees raw signals.

---

### Opportunity
A validated, scored signal that represents potential business value.

Every opportunity has:
- **Title** — what the opportunity is
- **Team** — which team identified it
- **Evidence** — why this opportunity exists (data, signals, research)
- **Impact estimate** — potential revenue or value, quantified
- **Confidence** — how certain the team is (low / medium / high)
- **Effort** — what is required to pursue it
- **Risk** — what could go wrong
- **Score** — composite rating (impact × confidence / effort × risk)
- **Status** — in the opportunity lifecycle (see below)
- **Recommended action** — what the team proposes to do next
- **Requires approval** — yes/no, and for what specifically

Opportunities have a lifecycle:

```
Identified → Validated → Scored → Proposed → Approved → Active → Closed (Won / Lost / Abandoned)
```

Every stage transition is logged with reason and timestamp.
Closed opportunities feed the learning loop.

---

### Revenue

Revenue is tracked across three horizons:

**Actual** — money confirmed received, by team, by date, by source
**Pipeline** — qualified opportunities with estimated close probability and value
**Projected** — model-based forecast derived from current pipeline and historical conversion rates

Revenue is not a single number. It is broken down by team:
- E-commerce: product sales
- Automation Sales: client contracts (one-time and recurring)
- YouTube: ad revenue and sponsorships
- Crypto/Stock: realized returns

Revenue health is assessed by comparing actual to target, pipeline coverage ratio, and directional trend (improving / stable / declining).

---

### Team Output

What a team produces. Not the steps — the result.

Every output has:
- **Team** — who produced it
- **Type** — analysis / proposal / draft / recommendation / finding / report
- **Title** — what it is
- **Content** — the actual output
- **Status** — ready for review / approved / rejected / in progress
- **Linked opportunity** — if applicable
- **Requires approval** — yes/no

Outputs are the primary interface between teams and the owner.
The owner never manages individual agent steps.
The owner reviews team outputs.

---

### Approval

A request from a team to take a consequential action.

Every approval has:
- **Team** — who is requesting
- **Action** — exactly what they want to do
- **Justification** — why they want to do it
- **Impact** — what outcome they expect
- **Risk** — what could go wrong
- **Urgency** — time-sensitive or not
- **Status** — pending / approved / rejected / deferred

Approval is a binary decision surface.
The owner sees: what is being asked, why, impact, risk.
The owner responds: Approve / Reject / Defer / Request more information.

---

### Team

An autonomous business unit.

Every team has:
- **Name** — the team's identity
- **Mission** — a permanent statement of purpose (not a task list)
- **Current status** — active / paused / blocked
- **Active work** — what the team is currently pursuing (self-initiated)
- **Recent outputs** — what the team has produced lately
- **Pending approvals** — what the team is waiting on
- **Revenue contribution** — this team's share of total revenue

Teams do not have tasks, tickets, or boards.
Teams have a mission and they produce outputs.

---

### Goal

An objective with a measurable target and a deadline.

Two types:
- **Business goal** — tied to revenue, team performance, or company trajectory
- **Personal goal** — the owner's personal commitments and progress

Every goal has:
- Title
- Target (measurable)
- Current progress
- Deadline
- Status: on track / at risk / off track / achieved / abandoned

---

### Policy

A governance rule that defines when approval is required.

Examples:
- "Any payment above €500 requires approval"
- "All external communications require approval"
- "Trade execution above €1,000 requires approval"
- "Ad spend above €200/day requires approval"

Policies are not enforced by humans. They are enforced by the system.
Teams cannot bypass policies. They escalate automatically.

---

### Event

A calendar entry representing a meaningful date.

Events surface from:
- Owner's connected calendar
- Team activity (proposal due, campaign launch, contract renewal)
- Personal commitments

Events are not tasks. They are moments in time that matter.

---

## What Information Is Important

The system surfaces only information that meets one of these criteria:

1. **Requires a decision** — approval is needed before action can proceed
2. **Represents a revenue signal** — actual, pipeline, or projected revenue has changed meaningfully
3. **Is a high-scoring opportunity** — potential value has been validated and scored
4. **Is a risk** — something that could harm the operation is detected
5. **Is a goal milestone** — progress on a goal has reached a threshold (on track / at risk / achieved)
6. **Is a meaningful team finding** — a team has discovered something the owner should know

Everything else is filtered out. Teams handle their own internal detail.

---

## What Information Is Unimportant

The owner never sees:

- Individual agent steps
- Prompt completions
- Token usage
- Model versions or technical infrastructure
- Internal team workflows
- Sub-task decompositions
- Technical errors (unless they affect business outcomes)
- Configuration details
- Agent performance metrics

If information does not help the owner make a decision or understand business health, it does not surface.

---

## How Autonomy Works

Teams operate continuously. They do not wait for instructions.

**The correct model:**
```
Team scouts for opportunities
  ↓
Team analyzes what it finds
  ↓
Team prepares its work (drafts, analyses, proposals)
  ↓
Team scores and validates
  ↓
Team surfaces recommendation to MioOS
  ↓
MioOS determines if owner attention is needed
  ↓
If consequential: approval request sent to owner
If informational: surfaced in next briefing
If routine: team proceeds autonomously
```

**The wrong model:**
```
Owner gives a task
Team executes task
Owner reviews result
```

The wrong model makes the owner a task-giver. The correct model makes MioOS the operating layer and the owner the governor.

---

## How Teams Work

Each team functions as an independent business unit with a permanent mission.

**E-commerce Team**
Mission: Find and sell profitable products. Build a growing portfolio of product lines.
Outputs: product opportunity analyses, supplier evaluations, margin calculations, campaign proposals, revenue reports.
Self-initiates: product research, market scanning, supplier comparison, campaign planning.
Requires approval for: launching campaigns, committing to suppliers, any spend.

**Automation Sales Team**
Mission: Identify businesses with inefficiencies, design automation solutions, and close them as clients.
This team does not just find leads. It designs complete automation systems for specific target businesses, prepares proposals and pilots, and sequences the entire sales motion.
Outputs: prospect analyses, automation design documents, sales proposals, pilot plans, client onboarding documents.
Self-initiates: market research, prospect identification, solution design, proposal drafting.
Requires approval for: any external outreach, contract signing, pilot commitment.

**YouTube Automation Team**
Mission: Build and scale faceless YouTube channels. Grow subscribers and monetize through ads.
Outputs: channel concepts, video ideas, scripts, thumbnails, upload schedules, performance reports.
Self-initiates: content ideation, scripting, scheduling, performance analysis.
Requires approval for: publishing content (initially), budget for tools or promotion.

**Crypto / Stock Trader Team**
Mission: Grow capital through intelligent market participation.
Outputs: market analyses, watchlists, opportunity scorecards, trade proposals.
Self-initiates: market research, opportunity scanning, portfolio analysis.
Requires approval for: all trade execution initially. Over time, autonomous execution within approved position size and risk limits.

---

## How Revenue Works

Revenue is the primary health signal of the operation.

**Revenue is not a single dashboard number.** It is a layered picture:

**Layer 1 — Actual**
What has been received. Confirmed. In the account.
Updated in real time where possible (Stripe, bank feeds).
Broken down by team and by source.

**Layer 2 — Pipeline**
Qualified opportunities that are in motion.
Each pipeline item has: team, source, estimated value, probability, expected close date.
Pipeline total × weighted probability = expected revenue.

**Layer 3 — Projected**
Model-based forecast. Based on current pipeline, historical conversion rates, seasonal patterns.
Expressed as a range (conservative / base / optimistic).

**Revenue health is determined by:**
- Actual vs target (is the business performing?)
- Pipeline coverage (is there enough in motion to hit future targets?)
- Trend (is revenue growing, stable, or declining?)
- Team contribution balance (is revenue diversified across teams?)

MioOS tracks all three layers across all four teams at all times.

---

## How Opportunity Management Works

Opportunities are the engine of growth. The system is designed to continuously discover, validate, score, and pursue value.

**Discovery**
Teams are always scanning. E-commerce scans products and margins. Automation Sales scans business inefficiencies. YouTube scans content angles. Crypto/Stock scans market conditions. Each scan that produces a credible signal becomes a Signal object.

**Validation**
Teams evaluate their signals. Is the evidence strong? Is the market real? Is the timing right? Is there a clear path to revenue? Only validated signals become Opportunities.

**Scoring**
Each opportunity receives a composite score based on:
- Impact (how much revenue or value could this generate?)
- Confidence (how certain is the team?)
- Effort (what is required to pursue it?)
- Risk (what could go wrong?)

Higher impact + higher confidence + lower effort + lower risk = higher score.

**Surfacing**
High-scoring opportunities are surfaced in the owner's briefing and in the Opportunities view, ranked by score.

**Approval**
If pursuing the opportunity requires any external action, spend, or commitment — approval is required before proceeding.

**Execution**
Once approved, the responsible team executes. Progress is tracked through team outputs.

**Outcome**
When closed, the actual result is recorded against the estimate. This feeds the learning loop: over time, the system becomes better at scoring opportunities accurately.

---

## How Approval Works

Approval is the governance layer. It is non-negotiable.

**What triggers an approval request:**
- Any payment or financial commitment
- Any external communication (prospect, customer, partner, publisher)
- Any advertising or paid distribution
- Any trade execution
- Any contract or agreement
- Any public content publication
- Any action with irreversible external impact

**What does not trigger approval:**
- Research and analysis
- Internal drafts and planning
- Scoring and validation
- Watchlist and monitoring
- Preparation of proposals

**The approval interface:**
The owner sees exactly one screen for decisions. It presents:
1. What the team wants to do (plain language, not technical)
2. Why they want to do it (evidence and justification)
3. What they expect to happen (impact estimate)
4. What could go wrong (risk)
5. How urgent it is

The owner makes one choice: **Approve / Reject / Defer / Request more information**

After each decision, the system records the decision, reason (if provided), and timestamp. This history is auditable.

Teams continue other work while waiting for approval. They do not block on a single pending item.

---

## Which Pages Exist

Six destinations. Each has exactly one job.

**1. Command (Home)**
The daily brief. The first thing the owner sees.
Answers: What is the current state of the operation? What changed since last visit? What requires my attention today?
Contains: Revenue snapshot, active opportunity highlights, team activity summary, pending decisions count, goal progress pulse.
Not a dashboard. Not a metrics wall. A briefing.

**2. Revenue**
Deep view of the revenue picture.
All three horizons (actual, pipeline, projected) broken down by team.
Trend lines. Health indicators. Revenue-at-risk signals.
No tables of line items. A clear picture of financial health.

**3. Opportunities**
All opportunities across all teams, ranked by score.
Full lifecycle view: identified, validated, active, closed.
Each opportunity opens to full detail: evidence, score, recommended action, approval status.
The owner can explore the opportunity portfolio and understand where growth potential lives.

**4. Workforce**
What the teams are doing.
Not task lists. Not agent logs.
Team-level view: current focus, recent outputs, notable findings, pending approvals.
The owner understands what each business unit is producing and pursuing.

**5. Decisions**
The approval queue. One job: decide.
Shows only items requiring owner action.
Sorted by urgency.
Each item: what is requested, why, impact, risk, decision buttons.
When empty: "All clear — no decisions pending."

**6. Life**
Personal layer. Goals and calendar.
Business goals progress. Personal goals progress.
Upcoming events from calendar and from team milestones.
Separate from the business operation — a personal context layer.

---

## What the Owner Sees First

When MioOS opens, the owner lands on **Command**.

Command is a situation report, not a dashboard.

It reads like a briefing from a chief of staff:

> "Revenue is at €X this month, up Y% from last week. The E-commerce team identified a high-scoring opportunity in [category]. The Automation Sales team has a proposal ready for [target business]. Two decisions are waiting. Your next goal milestone is in 4 days."

Below the brief:
- Revenue health (3 numbers: actual, pipeline, projected)
- Top opportunity (single highest-scored item)
- Team activity (what each team is working on — one line each)
- Pending decisions (count + urgency)
- Goals (one or two at-risk items if any)

Command refreshes on each visit. It shows what changed since last time.
If nothing meaningful changed: "Operations normal. No decisions pending."

---

## An Ideal Day With MioOS

**Morning (5 minutes)**
Open MioOS. Read the Command brief.
Two decisions waiting. Approve one (trade proposal within risk tolerance). Reject one (outreach draft — needs revision note). Total time: 3 minutes.
Check: the E-commerce team found a high-scoring product opportunity. Note it for later.

**Midday (2 minutes)**
Notification: Automation Sales team completed a proposal document. Review the output. Approve it for sending.
Revenue updated: €800 in new sales from E-commerce campaign. On track.

**Afternoon (optional)**
Check Opportunities tab. Review the E-commerce opportunity in detail. Strong evidence. Score 8.4. Approve pursuit.
This takes 5 minutes.

**End of day (passive)**
MioOS continues operating. Teams continue working.
Tomorrow morning the brief will reflect what happened overnight.

Total active time: under 15 minutes.
The business operated for 24 hours.

---

## MioOS in Three Years

**Year 1** (current direction)
The owner reviews and approves all consequential actions. Teams operate autonomously for research, analysis, and preparation. MioOS surfaces what matters. Revenue is tracked manually with some integrations.

**Year 2**
Revenue integrations are live (Stripe, bank feeds, YouTube Analytics, portfolio trackers). The approval model is refined: routine low-risk actions are auto-approved within policies. The owner approves only high-value decisions. The system has enough outcome history to score opportunities accurately. The learning loop is active.

**Year 3**
The operation runs largely without daily owner involvement. Teams self-organize. Revenue streams are diversified and growing. The owner reviews a weekly strategic briefing and approves monthly strategy decisions. The Crypto team executes trades within pre-approved risk limits. The E-commerce team launches campaigns within pre-approved budgets. The YouTube team publishes content within pre-approved content policies. The owner's role: set annual vision, review quarterly performance, approve strategic pivots.

The goal is not full automation. The goal is **governed autonomy** — a business that operates, grows, and learns under the owner's strategic direction without requiring the owner's operational involvement.

---

## What This Document Authorizes

All future design, database, and implementation decisions must be consistent with this document.

When evaluating any feature, UI pattern, data model, or agent workflow, ask:

1. Does this serve the owner-as-governor model?
2. Does this surface business intelligence (not operational detail)?
3. Does this respect the approval boundary?
4. Does this belong to one of the six pages?
5. Does this make autonomous team operation clearer — or does it just make the UI busier?

If a feature cannot be justified against these five questions, it should not be built.

---

*Document version: V4.0*
*Date: 2026-06-16*
*Status: Foundation — not yet approved for implementation*
