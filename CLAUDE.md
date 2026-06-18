# MioOS — Final Architecture (North Star)

## Core Identity

MioOS is a **Personal AI Command Center**.

MioOS is NOT:
- Founder OS
- ERP / CRM
- Developer platform
- Agent playground
- Monitoring dashboard
- Infrastructure management tool

MioOS IS:
- Personal AI Command Center
- Autonomous Opportunity Engine
- Revenue Generation System
- Workforce Management System
- Decision & Approval Center
- Personal + Business Operating Layer

**The purpose of MioOS:**

Generate opportunities.
Generate revenue.
Prepare execution.
Escalate decisions when required.

When the founder opens MioOS they should see:
- What opportunities were found
- What revenue opportunities exist
- What work was completed
- What decisions require approval
- What the AI workforce recommends next

---

## AION Separation

AION and MioOS are completely separate systems.

AION is: AI Gateway, Control Plane, Runtime Platform, Worker Infrastructure, Routing Engine, Multi-tenant SaaS.

**Inside MioOS, AION appears only as a Venture/Project.**

Never expose in MioOS:
- Worker metrics
- Token metrics
- Runtime health
- Queue depth
- Infrastructure internals

Those belong to AION, not MioOS.

---

## Navigation Architecture (Critical)

**Only 6 destinations. No exceptions.**

1. Today
2. Decide
3. Workforce
4. Projects
5. Life
6. Settings

Revenue is NOT a destination.
Opportunities are NOT a destination.
Those are outcomes surfaced through Today and Workforce.

Every new view requires updating ALL FOUR files atomically:
1. `store/appStore.ts`
2. `app/page.tsx`
3. `components/layout/Sidebar.tsx`
4. `components/layout/MobileNav.tsx`

Missing one breaks navigation.

---

## Today

Today is the most important page.

It must answer:
1. What opportunities were discovered?
2. What revenue changed?
3. What progress happened?
4. What requires approval?
5. What is blocked?
6. What should I focus on?

Today should feel like a **briefing from the workforce** — not a dashboard, not a monitoring screen.

Language must be outcome-based.

**Good:** "E-commerce Team validated 2 products."
**Bad:** "Agent completed assignment."

---

## Decide

Decide is the approval boundary. Everything requiring judgment appears here.

Categories:
- Financial
- External Contact
- High Risk
- Strategic
- Content

Every decision must explain:
- What is being requested
- Why it matters
- Impact if approved
- Impact if rejected

No analytics. No monitoring. No dashboards. Only decisions.

---

## Workforce

MioOS manages autonomous business units. Each unit behaves like a real company department.

Each team has:
- Mission
- Objectives
- Autonomous routines
- Revenue responsibility
- Opportunity generation
- Outputs
- Approval triggers

Teams operate independently. The founder supervises outcomes. The founder does not micromanage tasks.

### Team 1 — E-Commerce Team

**Mission:** Find and launch profitable direct-to-customer opportunities.

Operating model: Supplier / POD / Fulfillment Partner → Customer
- No warehousing by default
- No inventory ownership by default
- No logistics operations by default

Autonomous work: product research, competitor research, supplier discovery, supplier reliability scoring, margin calculations, demand validation, product page creation, landing page creation, creative generation, ad concept generation, campaign planning, customer service drafts, order risk monitoring.

Outputs: product opportunities, supplier reports, store concepts, product pages, ad creatives, launch plans.

**Approval required:** spending ad budget, supplier commitments, store launches, inventory purchases, paid testing. Inventory is treated as high-risk.

### Team 2 — Automation Sales Team

**Mission:** Generate customers for automation services and AI products.

This team does not only find leads. This team **designs sellable automation systems**.

Autonomous work: company discovery, lead generation, process analysis, pain-point identification, opportunity scoring, automation design, solution architecture, proposal creation, demo preparation, outreach drafting, follow-up drafting, pilot planning.

Every qualified lead should result in: opportunity analysis, proposed automation solution, estimated value, demo concept, proposal draft.

Outputs: leads, opportunities, automation blueprints, outreach sequences, proposal packages.

**Approval required:** customer outreach, proposals, contracts, pricing commitments.

### Team 3 — YouTube Automation Team

**Mission:** Grow YouTube channels autonomously.

Autonomous work: niche research, trend research, competitor analysis, content planning, script writing, hook generation, title generation, thumbnail concepts, SEO research, upload planning.

Content formats: Shorts, Reels, faceless videos, long-form story videos, educational content.

Team prepares: voiceover scripts, captions, scene timelines, edit plans, thumbnail concepts, upload schedules.

**Approval required:** publishing, paid assets, brand deals, copyright-sensitive material.

### Team 4 — Crypto / Stock Trader Team

**Mission:** Grow capital responsibly.

Modes: 1. Research → 2. Paper Trading → 3. Approval Trading → 4. Autonomous Trading (future, locked).

Default mode: **Research.**

Autonomous work: market research, news monitoring, watchlist management, opportunity detection, risk scoring, portfolio analysis, trade thesis creation.

Outputs: trade theses, market reports, risk assessments, watchlists.

**Approval required:** any real trade, capital allocation, position sizing changes. Autonomous trading remains locked until explicitly enabled.

---

## Approval Philosophy

**Autonomous (no approval needed):**
Research, analysis, validation, planning, content preparation, opportunity discovery, lead generation, risk scoring.

**Approval required:**
Spending money, customer communication, publishing, supplier commitments, trading, contracts, legal obligations.

**No external impact without approval.**

---

## Projects

Projects are containers. Types: **Venture** or **Initiative**.

Projects exist to organise work — not as task managers, not as kanban boards.

Projects contain: revenue, outputs, opportunities, goals, decisions.

---

## Life

Life is personal. Contains: Calendar, Goals, Habits, Notes.

Life remains separate from business.

---

## Workforce Evolution — North Star (v2)

**Stop thinking:** Agent / Task / Output
**Start thinking:** Business Unit / Opportunity / Revenue / Growth / Execution

The workforce is NOT a workforce of AI agents. It is a portfolio of autonomous businesses.

### Workforce Model

Every business unit operates with:
- **Mission** — Why does this unit exist?
- **Business Model** — How does it generate revenue?
- **Revenue Engine** — How does value become revenue? (shown as a flow in the UI)
- **Objectives** — What is the unit currently trying to achieve?
- **KPIs** — How is success measured?
- **Opportunity Pipeline** — What opportunities are active by lifecycle stage?
- **Memory** — What has already been attempted? (prevents repetition)
- **Approval Boundaries** — What requires founder approval?
- **Growth Loop** — How does the unit improve over time?

### Autonomous Loop (V2)

```
Idle → Generate Opportunities
Opportunities exist → Validate them
Validated → Prepare execution
Execution ready → Create Decide items
Approved → Create Projects
Projects succeed → Attribute Revenue
Projects fail → Update Memory
```

This loop runs continuously. The autonomous engine (V2) is lifecycle-aware:
it checks the team's opportunity pipeline state and routes work to the
appropriate lifecycle stage (`discovery` / `validation` / `execution`).

### Workforce UI North Star

The Workforce view should feel like a CEO reviewing 4 division leaders.
For each business unit display:
- Mission + Business Model + Revenue Engine (as a flow)
- Current Objective
- Opportunity Pipeline (funnel: Discovered → Validating → Approved)
- Active Work
- Revenue Impact + Pipeline Value
- Recent Wins (approved opportunities)
- Recent Failures (rejected — stored in memory, never re-proposed)
- Growth Recommendations (derived from portfolio state)
- Pending Decisions

**Never show:** agent names, queue depth, tokens, prompts, execution logs.
**Only show:** business outcomes.

### Today North Star

Today should answer:
1. What value did the workforce create?
2. What opportunities were discovered?
3. What revenue opportunities emerged?
4. What decisions require me?
5. What is blocked?
6. What should I focus on?

---

## Success Criteria

If MioOS runs for 30 days unattended (with approvals still required for external actions), the workforce should continuously:
- Discover opportunities
- Prepare execution
- Improve memory
- Build pipelines
- Generate approvals
- Track revenue impact
- Recommend next actions

The system should evolve from an AI assistant into an autonomous portfolio of business units.

When the founder returns, MioOS should brief on:
- Opportunities found and their pipeline status
- Revenue opportunities identified and pipeline value
- Work completed and quality track record
- Decisions required
- Growth recommendations per business unit

**That is the standard every future feature must support.**

---

## Development Rules

- Do not restart or rebuild from scratch
- Do not break existing working features
- Prioritize stability, clean UX, database-backed persistence
- Use upsert/idempotent seed behavior (never wipe user data without --reset flag)
- Follow existing code patterns: client components, local state + fetch, Prisma API routes
- Keep UI dark, clean, premium, command-center style

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
