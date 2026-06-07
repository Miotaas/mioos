# MioOS — Core Vision

MioOS is not a dashboard.

MioOS is an Autonomous Company Operating System.

The purpose of MioOS is not merely managing work.

The purpose of MioOS is to discover opportunities, coordinate autonomous agents, supervise execution, learn from outcomes, and continuously improve business performance.

MioOS acts as:

1. The Brain
2. The Command Center
3. The Governance Layer
4. The Opportunity Engine
5. The Multi-Agent Coordination Layer

MioOS is the head of the company.

Agents are specialized team members.

The dashboard is the control room.

AION is the execution and inference infrastructure.

Relationship:

MioOS
↓
Strategy
↓
Coordination
↓
Governance
↓
Execution Requests
↓
AION

AION never controls MioOS.

MioOS controls AION.

---

# System Architecture

## Layer 1 — Business OS

Responsible for:

* Tasks
* Goals
* Projects
* Leads
* CRM
* Sales Pipeline
* Deployments
* Support
* Documentation

## Layer 2 — Agent OS

Responsible for:

* Agent Registry
* Agent Memory
* Agent Tools
* Agent Workflows
* Agent Scheduling
* Agent Approvals
* Agent Execution
* Agent Intelligence

## Layer 3 — Founder Cockpit

Responsible for:

* Executive Briefings
* Risks
* Opportunities
* Agent Activity
* Business Health
* Strategic Oversight
* Decision Support

Every dashboard component must answer:

1. What needs attention?
2. What blocks progress?
3. What creates value?
4. What are agents doing?
5. What should happen next?

Avoid dashboards that only display data.

Prefer dashboards that support decisions.

## Layer 4 — Opportunity Engine

Responsible for:

* Opportunity Discovery
* Opportunity Validation
* Opportunity Scoring
* Opportunity Tracking
* Opportunity Learning

The system optimizes for:

"Where is value?"

not:

"What should we build?"

Valid opportunities include:

* Products
* Services
* SaaS
* Affiliate opportunities
* Reseller opportunities
* White-label opportunities
* Partnerships
* Acquisitions
* Investments
* Automation opportunities
* Market signals

Every opportunity must include:

* Evidence
* Confidence
* Risks
* Assumptions
* Validation Plan
* Execution Strategy
* Next Action

No score may exist without explanation.

## Layer 5 — Autonomy Governance

Responsible for:

* Policies
* Risk Controls
* Approval Rules
* Budget Controls
* Safety Boundaries
* Audit Trails
* Compliance Rules

Every autonomous action must pass through governance.

## Layer 6 — Multi-Agent Coordination

Responsible for:

* Delegation
* Agent Communication
* Shared Context
* Review Chains
* Validation Chains
* Collaborative Work

Preferred workflow:

Hunter
↓
Researcher
↓
Validator
↓
Planner
↓
Reviewer
↓
Execution Agent
↓
Governance
↓
Execution

No single agent should make high-impact decisions alone.

---

# Long-Term Objective

The long-term objective is to build a supervised autonomous company.

The system should:

* Discover opportunities
* Evaluate opportunities
* Coordinate specialists
* Generate recommendations
* Execute approved actions
* Learn from outcomes
* Improve future decisions

The system should continuously create value while remaining governed by policies, reviews and controls.

---

# Autonomy Roadmap

Current State

Level 0:
Recommendations

Level 1:
Draft Creation

Level 2:
Internal Execution

Current MioOS Target:
Level 2

Future State

Level 3:
External Actions Prepared Automatically

Level 4:
External Actions Executed Automatically Within Policies

Level 5:
Fully Autonomous Operation Within Governance Boundaries

Examples

Level 2:

* Create tasks
* Create notes
* Create memories
* Create reminders
* Create recommendations

Level 3:

* Prepare outreach
* Prepare campaigns
* Prepare content
* Prepare product launches

Level 4:

* Send approved outreach
* Launch approved campaigns
* Publish approved content
* Execute approved workflows

Level 5:

* Operate continuously under governance policies

The goal is not maximum autonomy.

The goal is safe autonomy.

---

# Governance Rule (Critical)

Autonomy without governance is forbidden.

Before any external execution capability is added, MioOS must support:

* Policy Engine
* Budget Controls
* Risk Scoring
* Multi-Agent Review
* Audit Logging
* Emergency Stop

Every external action must be:

1. Explainable
2. Traceable
3. Reviewable
4. Governed by policy

The system should never behave as an unchecked autonomous agent.

The system should behave as a supervised autonomous company.

---

# The Five AI Agent Products

1. Follow-Up & Action Watchdog
2. Deadline & Document Guardian
3. Lost Revenue Detector
4. Meeting-to-Execution Agent
5. Evidence & Case Builder

Lead Flow:

Lead
→ Product Match
→ Outreach
→ Demo
→ Proposal
→ Pilot
→ Onboarding
→ Deployment
→ Support
→ Upsell

---

# Development Principles

* Do not restart or rebuild from scratch
* Do not break working functionality
* Prioritize stability over new features
* Prefer additive changes over rewrites
* Preserve backwards compatibility
* Maintain database-backed persistence
* Use idempotent seeds
* Never wipe user data without explicit reset
* Follow existing project patterns
* Keep the UI premium, dark, clean and command-center focused

---

# Navigation Architecture (Critical)

Every new view requires updating ALL FOUR files:

1. store/appStore.ts
2. app/page.tsx
3. components/layout/Sidebar.tsx
4. components/layout/MobileNav.tsx

Treat these four files as a single atomic operation.

Missing one breaks navigation.

---

# Sidebar Accent Color System

Personal OS:
accent-purple

Business OS:
accent-violet

Opportunity Engine:
accent-green

Agent OS:
accent-cyan

Warnings / Approvals:
accent-amber

Errors / Destructive:
accent-red

Maintain consistency across all future views.

---

# SQLite / Prisma Rules

Never use:

skipDuplicates with createMany on SQLite.

Use:

count === 0 guard before createMany.

PowerShell syntax:

$env:DATABASE_URL = "..."
npx prisma db push

Do not use bash-style environment variable syntax.


### Development Rules

- Do not restart or rebuild from scratch
- Do not break existing working features
- Prioritize stability, clean UX, database-backed persistence
- Use upsert/idempotent seed behavior (never wipe user data without --reset flag)
- Follow existing code patterns: client components, local state + fetch, Prisma API routes
- Keep UI dark, clean, premium, command-center style

## Navigation Architecture (Critical)

Every new view requires updating ALL FOUR files:

1. store/appStore.ts
2. app/page.tsx
3. components/layout/Sidebar.tsx
4. components/layout/MobileNav.tsx

Treat these four files as a single atomic operation.

Missing one breaks navigation.

---

## Founder Cockpit Philosophy

MioOS is not an admin dashboard.

MioOS is a Founder Operating System.

Every dashboard component should answer:

1. What needs attention?
2. What blocks progress?
3. What creates value?
4. What are agents doing?
5. What should happen next?

Avoid dashboard widgets that only display data.

Prefer widgets that support decisions.

---

## Approval First Architecture

Agents may:

* discover
* analyze
* validate
* score
* recommend
* draft
* prepare

Agents may NOT:

* launch products
* send outreach
* run ads
* spend money
* publish content
* create live listings
* process payments
* contact prospects

without Approval Queue approval.

All external actions must remain approval-driven.

---

## Agent Design Pattern

Avoid single-agent decision making.

Preferred architecture:

Hunter
↓
Validator
↓
Planner
↓
Approval Queue

Agents generate recommendations.

Humans make decisions.

---

## Opportunity Engine Vision

Commerce Autopilot is evolving into Opportunity Engine.

The system should optimize for:

"Where is value?"

not:

"What should we build?"

Valid opportunities include:

* products
* services
* SaaS
* affiliate opportunities
* reseller opportunities
* white-label opportunities
* partnerships
* acquisitions
* investments
* automation opportunities
* market signals

Every opportunity must include:

* Evidence
* Confidence
* Risks
* Assumptions
* Validation Plan
* Execution Strategy
* Next Action

No score may exist without explanation.

---

## Opportunity Engine Roadmap

Current State:

Business OS
✓

Agent OS
✓

Founder Cockpit
✓

Next:

1. Strategic Briefing Viewer
2. Workflow Visualization
3. Mobile Pass
4. Deployment Hardening
5. VPS Deployment
6. Opportunity Engine

Future:

Opportunity Memory
Opportunity Outcomes
Opportunity Portfolio
Opportunity Validator
Learning Loop
Execution Planning

---

## Sidebar Accent Color System

Personal OS:
accent-purple

Business OS:
accent-violet

Commerce / Opportunity Engine:
accent-green

Agent OS:
accent-cyan

Warnings / Approvals:
accent-amber

Errors / Destructive:
accent-red

Maintain consistency across all future views.

---

## SQLite / Prisma Rules

Never use:

skipDuplicates with createMany on SQLite.

Use:

count === 0 guard before createMany.

PowerShell syntax:

$env:DATABASE_URL = "..."
npx prisma db push

Do not use bash-style environment variable syntax.

