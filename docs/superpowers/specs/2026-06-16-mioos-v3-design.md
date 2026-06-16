# MioOS V3 — Design Specification

**Date:** 2026-06-16  
**Status:** Approved for implementation planning  
**Session:** Architecture reset from first principles  
**Revised:** Four review points applied — Projects type model, Life surfacing, Teams Active Work, 7-day absence test

---

## 1. Mental Model

MioOS is a **personal AI command center** for a single founder.

The simplest explanation: MioOS is the interface between the founder and everything the company is doing.

It is not:
- A project management tool
- A CRM
- An AI agent platform
- A workflow builder
- An enterprise dashboard

It is:
- A briefing surface that synthesizes what matters each day
- A decision hub where all judgment happens
- A work layer where ventures and initiatives live
- A personal layer for life outside work
- A dispatch layer for AI teams

The founder's job is to **make decisions**, not to **manage systems**. MioOS exists to make that possible.

---

## 2. Core Architectural Principles

### 2.1 One truth, one place

Every piece of information has exactly one canonical home. If information appears in two pages, one of them is wrong.

Today is a **lens**, not a database. Every signal on Today is a pointer to its canonical home.

### 2.2 Today surfaces. It never owns.

Today reads from all other pages and shows the highest-priority signals. It does not store data. Clicking any signal on Today navigates to the canonical page.

### 2.3 Decide owns all judgment

The only place where Approve, Reject, Request Changes, and Defer happen is **Decide**. Not Today. Not Teams. Not Projects. Decide exclusively.

### 2.4 Projects own the full venture lifecycle

An idea becomes a Project the moment the founder decides to track it. Projects handles all stages from Exploring to Live. The transition from untracked signal to tracked idea is a single founder gesture — not an intermediate page.

### 2.5 Decide is not a pipeline

Something enters Decide when — and only when — validation is complete and a formal go/no-go is appropriate. Decide processes decisions. It does not store ideas or host in-progress research.

### 2.6 Life surfaces when it demands attention

Life data is personal and mostly lives in depth. But time-sensitive personal items (a deadline today, a trip in 48h, a personal goal due this week) surface on Today automatically. Life is not a forgotten section — it becomes visible when it matters.

---

## 3. Navigation Architecture

**6 destinations total.**

```
☀  Today          ← surface layer, briefing
⊡  Decide         ← all decisions
◈  Projects       ← all work, typed (Venture or Initiative)
◷  Life           ← personal layer
⚡  Teams         ← AI workforce
⚙  Settings
```

### Why each destination exists

**Today** — The founder opens MioOS here every morning. It synthesizes signals from all other pages into a 60-second brief. No actions happen here except navigating to the right page.

**Decide** — Every approval, draft, proposal, AI output, and recommendation that needs a judgment call lives here. Single canonical home for all decision processing.

**Projects** — A single list of all tracked work. Each project carries a type: **Venture** (ongoing business, no end date) or **Initiative** (bounded experiment with a defined end state). The founder sees all projects together and filters by type when needed. No tab split required for navigation — the type is a property of the project, not a destination.

**Life** — Personal layer. Calendar, personal goals, health, habits, travel, reminders. Fundamentally different from work — no AI teams, no approval flows, no revenue tracking. Time-sensitive items surface on Today.

**Teams** — AI workforce. Dispatch work, view active assignments, browse discoveries. Completed outputs automatically enter Decide.

**Settings** — Configuration only. No operational content.

### Pages eliminated from current MioOS

| Eliminated | Absorbed into |
|---|---|
| Departments / Workforce | Teams |
| Pending Actions | Decide (renamed, clearer ownership) |
| Goals (standalone) | Projects (business goals as part of each project) + Life (personal goals) |
| Requests / Command Console | Teams (dispatch) |
| Opportunities (standalone) | Decide (when needing judgment) + Projects (when approved/tracked) |
| Revenue Health (standalone) | Projects (per-project revenue) + Today (signal only) |

---

## 4. Information Ownership Map

| Information type | Canonical home | Surfaced on Today? |
|---|---|---|
| Decisions (approvals, drafts, proposals) | Decide | Yes — top 3 only |
| Project status/health (all types) | Projects | Yes — venture pulse view |
| Project tasks and blockers | Projects | Yes — blockers only |
| Revenue (MRR, pipeline) | Projects (per project) | Yes — signal only |
| Personal calendar events | Life | Yes — today's events |
| Personal goals with deadlines | Life | Yes — when deadline within 48h |
| Travel | Life | Yes — when departure within 48h |
| Health/habits | Life | No — depth only |
| AI team discoveries (untracked) | Teams → Discoveries | No |
| AI team active assignments | Teams → Active Work | No |
| AI team outputs (awaiting decision) | Decide | Yes — top 2 if ready |
| AI team activity logs | Teams | No |

---

## 5. Idea Lifecycle (Projects-First Model)

### The lifecycle

```
Signal (untracked)
  └→ Lives in: Teams → Discoveries
  └→ Founder says "track this" →

Exploring
  └→ Lives in: Projects (type: Initiative, stage: Exploring)
  └→ Data: name, one-liner, confidence: low, no tasks yet
  └→ Founder validates enough to test →

Validating
  └→ Lives in: Projects (type: Initiative, stage: Validating)
  └→ AI teams assigned research tasks
  └→ Validation plan active
  └→ AI produces full proposal →

Deciding
  └→ Lives in: Decide (temporarily)
  └→ Founder reviews proposal, evidence, risk
  └→ Approve → Building | Reject → Archived

Building
  └→ Lives in: Projects (Initiative or promoted to Venture, stage: Building)
  └→ Active tasks, team assigned, revenue tracking begins

Done / Killed
  └→ Lives in: Projects (archived, stage: Done or Killed)
  └→ History preserved, learnings accessible
```

### The critical rule

**Decide is not a pipeline.** Decide is a decision point.

Something enters Decide when — and only when — it has been validated enough that a yes/no answer is appropriate. Before that: Projects. After that: back to Projects.

### Venture vs Initiative — the distinction

A **Venture** is a long-term business commitment with ongoing revenue potential and no defined end date. Examples: AION, MioOS, Mail Co-Pilot.

An **Initiative** is a bounded experiment with a defined end state: validated, built, or killed. It may graduate to a Venture. Examples: a pilot program, a validation sprint, a new product test.

The type is set when the project is created and can be changed by the founder at any time. Promotion from Initiative to Venture is an explicit founder action, not an automatic transition.

### Edge case rule

Does the item involve tasks, AI team assignments, or go/no-go decisions? If yes → Project (Initiative type). If no → Life.

---

## 6. Projects Structure

### One list, typed

Projects is a single destination with one list. Each project has:
- **Name**
- **Type:** Venture | Initiative
- **Stage:** Exploring / Validating / Building / Live / Paused / Killed
- **Health:** On track / At risk / Blocked
- **Revenue signal** (for Ventures and Building-stage Initiatives)
- **Last activity**
- **Optional:** parent Venture reference (for Initiatives)

### Default view

All active projects, sorted by health (Blocked first) then recency. Ventures appear visually prominent (always listed, never hidden). Initiatives sorted below.

### Filters available

- Type: Venture | Initiative | All
- Stage: Active (Exploring/Validating/Building/Live) | Archived (Done/Killed/Paused)
- Health: Blocked | At risk | On track

### Project detail

Clicking any project opens its detail page:
- For Ventures: tasks, goals, revenue entries, team assignments, blockers, history, decisions made
- For Initiatives: stage, validation plan, confidence score, tasks, AI outputs, go/no-go history

### What does NOT live in Projects

- Personal projects (Japan trip, gym goals, financial targets) → **Life**
- Raw AI discoveries → **Teams → Discoveries**
- Pending decisions → **Decide**
- Personal tasks → **Life**

---

## 7. Today Layout

### Principle

Today is a morning brief. The founder reads it in under 60 seconds. It synthesizes signals from all other pages. No data is created or processed here.

When the founder opens MioOS after an absence of more than 24 hours, the Brief expands into **catch-up mode**: the synthesis window covers what changed, what was decided, and what is new since the last visit — not just today's state.

**Left column — judgment layer:**
1. **Brief + Focus** (top) — synthesized narrative of what matters today (or what happened since last visit in catch-up mode) + the single highest-leverage action. Focus is displayed above Attention because the founder starts from priority, not from problems.
2. **Attention** — max 3 items needing review. Each shows: team/source, title, "Review →" button (navigates to Decide). Badge in header shows true total count. Footer shows "View all N in Decide →" when total > 3.
3. **Agenda** — today's calendar events from Life + any time-sensitive personal items (personal goal deadline today/tomorrow, travel within 48h). "Open Life →" link.

**Right column — context layer:**
1. **Projects** — health pulse for active ventures (type: Venture, green/amber/red dot, status line). "Open Projects →" link.
2. **Revenue** — synthesized narrative + MRR + pipeline numbers. "Open Projects →" link. Only shown when revenue data exists.
3. **Teams** — only shown when AI outputs are waiting in Decide. Shows count and "Review →" link (navigates to Decide). Hidden when nothing is waiting.

### Hard rules for Today

- **Focus comes before Attention.** Start from priority, not problems.
- **Maximum 3 Attention items.** Always. No exceptions.
- **No Approve/Reject/Defer buttons.** Review → navigates to Decide.
- **No cards added without justification.** A new card requires a daily decision it supports. Informational-only cards do not belong on Today.
- **No duplicate signals.** One signal, one place.
- **Catch-up mode activates after 24h absence.** The Brief synthesizes recent history, not just today.

---

## 8. Decide Layout

### Principle

Decide is a processing surface. The founder comes here to work through pending judgments. It is a distinct mental mode from Today.

### Layout

Two-panel:

**Left panel — decision list:**
- Header: "Decide" + total pending count badge
- Tabs: All / Approvals / Drafts / Proposals
- Each list item: colored urgency bar, source team, title, type tag
- No action buttons in the list — selection only
- Sorted by priority (urgency score, then recency)

**Right panel — detail view:**
- Full context: team, submission time, summary, evidence, confidence, risks
- Related project link (if applicable)
- Full output or draft content
- **Action bar at bottom only:** Approve / Reject / Request Changes / Defer

### Rules

- Actions (Approve/Reject/Request Changes/Defer) exist only in the detail panel. Never in the list.
- Decide is not permanent storage. Every item exits: Approve → Projects or executed, Reject → archived, Defer → deprioritized.
- Decide handles: workforce approvals, agent approvals, AI drafts, proposals (go/no-go), opportunity recommendations.

---

## 9. Life Layout

### What lives here

- Calendar / agenda (connected or manual)
- Personal goals (health, financial, development, relationships)
- Habits and routines
- Travel planning
- Reminders
- Personal tasks

### What does NOT live here

- Business goals (→ Projects, inside each project)
- AI team work (→ Teams)
- Revenue (→ Projects)
- Decisions (→ Decide)

### Today integration (time-sensitive surfacing)

Life data surfaces on Today when it becomes time-sensitive. The rule:

| Life item | Surfaces on Today when... |
|---|---|
| Calendar events | Today |
| Personal goal deadline | Within 48 hours |
| Travel / departure | Within 48 hours |
| Reminders | On the reminder date |
| Habits | Not surfaced on Today |
| Health | Not surfaced on Today |

Life does not become a forgotten section — it surfaces automatically when the founder needs to act on it. When nothing is time-sensitive, Life stays in depth.

---

## 10. Teams Layout

### What lives here

- **Active Work** — plain-language overview of what each team is currently working on
- **Dispatch** — send new work to a team ("What do you need done?")
- **Discoveries** — raw AI findings not yet tracked as projects (browsable, promotable)
- **Configuration** — team memory, tools, automation rules (collapsed by default)

### Active Work view

The founder can see what each AI team is working on right now without touching execution details.

Each entry shows:
- Team name
- Current assignment (in plain language, e.g., "Researching enterprise positioning for AION")
- When it started
- Status: Working / Waiting for input / Complete (output in Decide)

No agent IDs, no tool call logs, no execution state, no queue depth. The founder reads this the same way they'd ask a colleague "what are you working on?"

### Founder interaction modes

1. **Dispatch mode** — "I need X done" → write it in plain language → assign to a team → done
2. **Active Work mode** — "What are my teams working on?" → scan the Active Work view → no action required unless something looks wrong
3. **Discovery mode** — "What did my teams find?" → browse Discoveries → promote to Project or dismiss

Everything else (agent execution, tool calls, memory, orchestration) happens invisibly.

### What Teams does NOT do

- Display metrics, queue depth, or execution state
- Own decisions (completed outputs go to Decide automatically)
- Require the founder to manage agents manually

---

## 11. Visual Philosophy

### Density

Calm. Not sparse, but not crowded. Each element on screen should earn its place. If removing a card doesn't break a daily decision, it should not be there.

### Hierarchy

Clear primary / secondary / ghost text levels. The founder's eye should land on what matters first — always. The most important signal on any page is always the largest or highest-contrast element.

### Typography

- Heading: 28–36px, semibold, tight tracking
- Card titles: 13px, semibold
- Body / narrative: 14–16px, regular, relaxed line height (for reading)
- Labels: 9–11px, uppercase, high tracking, ghost color
- Numbers: monospace, larger than surrounding text

### Cards

Cards are containers, not destinations. A card surfaces information; clicking navigates to the canonical page. No card should have more than one primary action button.

### Navigation behavior

- Sidebar collapses to icon-only mode
- Active state: subtle highlight, no heavy borders
- No nested navigation inside the sidebar — depth lives in page-level tabs
- Decide badge in sidebar always shows live count

### Avoid

- Enterprise patterns (status tables, metric grids, KPI dashboards)
- CRM patterns (pipeline kanban, lead scoring columns)
- AI tool patterns (agent status indicators, queue visualizers, token counters)
- Inbox patterns (unread counts everywhere, mark-as-read mechanics)

---

## 12. Founder Workflow

### Morning open

The founder opens to Today. They read the Brief — one paragraph, synthesized from all live data. They see their Focus recommendation. They scan Attention (max 3 items). They check the Projects pulse (any blocked?). They glance at the Agenda including any time-sensitive personal items. This takes under 60 seconds.

### Starting work

If Focus is clear → navigate to the relevant Project or dispatch work to a team. If Attention has an urgent item → navigate to Decide, process it, return to Today.

### Processing decisions

Open Decide. Work through the list. Read full context in the detail panel. Approve, reject, or request changes. Each processed item exits Decide. The badge count in the sidebar decreases.

### Diving into depth

Open Projects to check a specific venture or initiative. Open Teams to assign new research or check what teams are working on. Open Life to check personal goals or the week ahead.

### Returning after an absence

The founder opens to Today. The Brief is in catch-up mode (last visit was >24h ago). It synthesizes: what changed, what was decided, what is new, what requires attention now. The founder can understand the last 7 days of activity from Today alone without navigating to each individual page.

### Ending the session

Decide queue is empty or deprioritized. Today's Focus has been addressed. The founder closes MioOS with a clear picture of what's happening.

---

## 13. Final V3 Blueprint

### Navigation (complete)

```
☀  Today
⊡  Decide
◈  Projects       (one list, type: Venture | Initiative)
◷  Life
⚡  Teams
⚙  Settings
```

### Ownership rules (complete)

| Rule | Owner |
|---|---|
| A decision lives exactly once | Decide |
| A project (venture or initiative) lives exactly once | Projects |
| A personal item lives exactly once | Life |
| An AI discovery (untracked) lives exactly once | Teams → Discoveries |
| An active AI assignment lives exactly once | Teams → Active Work |
| Revenue data lives exactly once | Projects (per project) |
| Calendar data lives exactly once | Life |

### Interaction model (complete)

| Page | Mode | What the founder does |
|---|---|---|
| Today | Read / Orient | Understand the day or catch up after absence |
| Decide | Process | Review context, make judgment calls |
| Projects | Manage | Update work, advance stages, track revenue |
| Life | Plan | Manage personal calendar, goals, and habits |
| Teams | Dispatch / Monitor | Assign work, check Active Work, review discoveries |
| Settings | Configure | One-time setup only |

### Success criteria

After V3 implementation:
- Opening MioOS gives a complete picture of the day in under 60 seconds
- The founder never asks "where do I find that?" — the answer is always obvious
- No information appears in two places
- Decisions have exactly one home (Decide) and exactly one set of action buttons
- Projects is a clean list of committed work — no uncommitted noise polluting it
- Today feels like a chief-of-staff brief, not a management dashboard
- The system feels like one product, not eight tools running in parallel
- **A founder can be absent for 7 days, open MioOS, and understand what happened, what changed, and what requires attention within 5 minutes — from Today alone, without navigating to individual pages**

---

*Wireframes: `docs/superpowers/wireframes/`*  
*01-navigation · 02-ownership-model · 03-idea-lifecycle · 04-projects-structure · 05-today-and-decide*
