# MioOS Company OS Refactor — Design Specification
**Date:** 2026-06-15  
**Status:** Approved  
**Sprint:** Phase 12 — Company OS UI Refactor

---

## Vision

MioOS is no longer a dashboard with AI features. It is an autonomous company operating system.

When the founder opens MioOS, the first question answered must be:

> "What has the company done since my last visit, what needs my attention, and what is the highest-value next decision?"

Everything on the screen must support that objective. The UI must feel like a CEO reviewing company performance — not a user operating software.

---

## North Star Principle

**Command Center answers one question:**  
"What did the company do while I was away, what needs my approval, and what should I do next?"

**Dashboard (Founder Mode) answers a different question:**  
"What do I need to do today personally?"

These two layers must never be confused.

---

## Navigation Architecture

### Final Structure

```
Cockpit (accent-purple)     — founder's personal layer
├── Dashboard               label: "Founder Mode"
├── Briefing
└── Inbox

Company (accent-cyan)       — company OS layer
├── Command Center          DEFAULT LANDING (view: "company")
├── Opportunities
├── Departments             (view: "workforce", label renamed)
├── Revenue Health          (view: "revenue", label renamed)
└── Pending Actions         (view: "drafts", label renamed)

Execution (accent-violet)   — work tracking
├── Projects
├── Goals
├── Tasks
└── Calendar

System (accent-ghost/gray)  — utilities
├── Requests
└── Settings
```

### What Changes

| Change | Detail |
|--------|--------|
| Default view | `"dashboard"` → `"company"` in `appStore.ts` |
| Logo subtitle | "Command Center" → "Personal AI Command Center" |
| "Work" group | Renamed → "Execution" |
| "Business" group | Removed — items redistributed to Company |
| "AI" group | Removed — Requests moves to System |
| Command Center | Moves from Company (was only item) → top of Company group |
| Dashboard | Stays in Cockpit, relabeled "Founder Mode" |
| Opportunities | Surfaces from legacy/hidden → Company group (view: "opportunities") |
| Workforce | Label renamed → "Departments" |
| Revenue | Label renamed → "Revenue Health" |
| Drafts | Label renamed → "Pending Actions" |

### Files That Change (atomic operation)

1. `store/appStore.ts` — change `activeView` default + add "opportunities" to union if needed
2. `components/layout/Sidebar.tsx` — new group structure, labels, accent colors
3. `components/layout/MobileNav.tsx` — new group structure, labels, bottom tabs
4. `app/page.tsx` — no changes needed (view IDs unchanged, opportunities already routable)

### Mobile Bottom Tabs

`Command Center · Dashboard · Inbox · ⋯ More`

---

## Command Center Redesign

### Component: `CompanyCommandCenter.tsx`

The Command Center becomes the company OS home screen. It has two zones:

**Zone 1: Executive Brief Header**  
**Zone 2: Live Company Grid**

### Zone 1 — Executive Brief Header

A full-width premium card at the top of the page. Dark gradient background. Visually distinct from the grid below.

**Content:**

```
Good morning, Michiel                     Monday · June 15, 2026
                                          Away for 8h 23m

Since your last visit:
● Research discovered 3 new opportunities              [View →]
⊙ 2 approvals are waiting for your decision           [Review →]
✓ Sales team completed outreach — 47 prospects         [View →]

────────────────────────────────────────────────────────────────

[Biggest Opportunity]        [Biggest Risk]         [Recommended Action]
DSV Logistics Automation     Mail Co-Pilot stalled   Approve outreach
Score 8.2 · €4.5k/mo est.   Blocked 12 days         Unblocks Sales · 2 min
```

**Data sources (all existing):**

- Greeting: time-of-day aware (morning/afternoon/evening)
- Date: `new Date()`
- "Away for": `Date.now() - lastVisit` where `lastVisit` is stored in `localStorage` on every page load
- "Since your last visit" bullets: query existing `/api/company/dashboard` filtered by `since=lastVisit` timestamp — opportunities created, approvals created, assignments completed
- Bullets are ranked by importance: pending approvals → new opportunities → completed work
- Bullet links navigate to the corresponding page via `setActiveView()`
- Intelligence strip (Biggest Opportunity, Risk, Recommended Action): already exists in `/api/company/dashboard` response as `topROIAction` and `blocked` — just surfaced differently

**Implementation note:** `lastVisit` is written to `localStorage` when the Command Center mounts, using the *previous* stored value to compute "away for" duration. After computing, it overwrites with `Date.now()`.

### Zone 2 — Live Company Grid

6 sections in a 3-column grid. Each section has:
- Section title with icon
- "View [Page] →" link in header (navigates to drill-down)
- 3–5 rows of live data
- Minimal clutter — outcomes and decisions only

**Section 1: Revenue**  
Link: → Revenue Health page  
Content: Live Revenue (large number), Pipeline Revenue, Potential Revenue. Top 3 revenue sources. At-risk flag if any.  
Labels use: "Live Revenue" / "Pipeline Revenue" / "Potential Revenue" (not MRR/ARR).

**Section 2: Opportunities**  
Link: → Opportunities page  
Content: Active count, new this week. Funnel status pills (discovered / validating / building / live). Top 2 opportunities by score.

**Section 3: Needs Decision** *(highest visual emphasis — amber-tinted)*  
Link: → Pending Actions page  
Content: Large approval count number. Each pending approval listed with title and priority badge. Callout text: "Approve to unblock [department]". This section must be impossible to miss.

**Section 4: Departments**  
Link: → Departments page  
Content: Department list with pulse dots (active vs idle). Each row shows: department name + most recent outcome in plain language.  
Format: `Research · 3 opportunities discovered` / `Sales · 14 prospects qualified`  
Not: run counts, execution status, or assignment IDs.

**Section 5: Projects**  
Link: → Projects page  
Content: Active count, blocked count. Top 3 projects with status badges. Blocker callout if any project is blocked.

**Section 6: Intelligence** *(green-tinted)*  
No link — this is a synthesis view.  
Content: Highest ROI next action. Effort allocation recommendation. Current bottleneck.  
This section is generated by the existing allocation engine in `/api/company/dashboard`.

---

## Drill-Down Page Changes

These pages are **not rebuilt**. Changes are scoped to headers, labels, and minor content reframes. All existing functionality is preserved.

### Dashboard → Founder Mode (`DashboardHome.tsx`)

| Element | Before | After |
|---------|--------|-------|
| Page header | "Good morning, [name]" generic | "Founder Mode" |
| Subtitle | — | "Your personal workspace" |
| Purpose | General OS dashboard | Personal execution layer: agenda, tasks, inbox, active goals |

No component logic changes. Header text only.

### Workforce → Departments (`WorkforceView.tsx`)

| Element | Before | After |
|---------|--------|-------|
| Page header | "AI Workforce / Your AI Departments" | "Departments" |
| Subtitle | "X departments active" | "X departments · Y outcomes this week" |
| Department card: mission | `dept.description` (generic) | Mission statement (see below) |
| Department card: activity | Last run status / agent count | Outcomes in plain language |

**Department mission statements:**

| Department | Mission |
|-----------|---------|
| Research | Discovers opportunities, markets and business ideas. |
| Sales | Converts validated opportunities into customers. |
| Marketing | Creates demand and market awareness. |
| Content | Produces assets that support growth. |
| Development | Builds products, automations and solutions. |
| Operations | Delivers and improves execution. |
| Support | Resolves issues and improves customer experience. |
| Commerce | Sources and validates product and service opportunities. |
| Executive | Allocates capital, priorities and attention. |

**Outcomes display format:**  
Instead of "last run: completed 2h ago", show outcome counts derived from team outputs:
- `3 opportunities discovered` (outputType: research/opportunity)
- `14 prospects qualified` (outputType: sales/lead)
- `2 campaigns prepared` (outputType: marketing/campaign)
- `1 product concept validated` (outputType: commerce/validation)

This data comes from `team.outputs` already fetched. Filter by `createdAt` within last 7 days. Count by output type. Display top 2 outcomes per department.

Remove: agent count, total runs, "AI" language throughout.

### Revenue → Revenue Health (`RevenueView.tsx`)

| Element | Before | After |
|---------|--------|-------|
| Page header | "Revenue" | "Revenue Health" |
| MRR label | "MRR" | "Live Revenue" |
| Pipeline label | "Pipeline" | "Pipeline Revenue" |
| Potential label | "Potential" | "Potential Revenue" |

No data model changes. Label-only updates.

### Drafts → Pending Actions (`DraftsView.tsx`)

| Element | Before | After |
|---------|--------|-------|
| Page header | "Draft Center" | "Pending Actions" |
| Subtitle | — | "Decisions waiting for you" |
| Sidebar label | "Drafts" | "Pending Actions" |

All filter/edit/approve/reject/archive flows unchanged. Long-term: this becomes the unified approval workflow for outreach drafts, campaigns, proposals, content, products, and development items.

### Requests — Founder Command Console (`FounderRequestsView.tsx`)

| Element | Before | After |
|---------|--------|-------|
| Page header | "Requests" or similar | "What do you want the company to do?" |
| Subtitle | — | "Your request is routed to the right department and executed." |
| Input | Plain textarea | Same textarea, but preceded by clickable example prompt chips |

**Example prompt chips (clickable — prefills input):**
- "Find automation opportunities in logistics"
- "Generate leads for Mail Co-Pilot"
- "Research AI opportunities in insurance"
- "Build an ecommerce business around pet products"
- "Draft outreach for [product name]"

No changes to routing logic, department detection, or execution.

### Opportunities — First-Class Page

Currently a legacy view (`OpportunitiesView`). No component changes needed. Work required:
- Add `"opportunities"` navigation entry to all 4 nav files
- Confirm `OpportunitiesView` renders correctly in the new Company context
- Future: upgrade to a proper pipeline/kanban view (Phase B)

---

## Architecture Notes for Phase B (Path 1)

The drill-down pages are built as independent views accessible via `setActiveView()`. When Phase B comes:

- Sections inside Command Center can be expanded in-place (accordion/drawer pattern) without removing the drill-down pages
- The `lastVisit` pattern is reusable for any page-level "since you were here" feature
- Department outcome counts are already computed from `team.outputs` — they can be surfaced inline in Command Center without a new API
- Approval Preview can be added to the Command Center grid as a 4th row in Needs Decision (show the draft content inline)

No architectural decisions made now will block Path 1 later.

---

## Accent Color System (unchanged)

| Group | Color |
|-------|-------|
| Cockpit | accent-purple |
| Company | accent-cyan |
| Execution | accent-violet |
| System | text-ghost |
| Approvals / Warnings | accent-amber |
| Errors / Destructive | accent-red |
| Opportunities / Growth | accent-green |

---

## Implementation Sequence

1. **Nav restructure** — 3 files (appStore, Sidebar, MobileNav). Atomic. No visual regression.
2. **Command Center: Executive Brief header** — new component section at top of `CompanyCommandCenter.tsx`. Reads existing API + localStorage.
3. **Command Center: grid enhancements** — add "View →" links, relabel Revenue section, replace Workforce section with outcomes.
4. **Drill-down page reframes** — header/label changes across 5 components. Low risk.
5. **Opportunities nav entry** — add to 3 nav files, verify existing component renders.
6. **typecheck + build** — confirm clean.

---

## Out of Scope (This Sprint)

- Merging Revenue/Workforce/Drafts into Command Center (Path 1 — Phase B)
- Opportunities page full redesign (pipeline/kanban view)
- Approval Preview inline in Command Center
- Any new database schema or API endpoints (all data comes from existing endpoints)
- Mobile-specific layout overhauls
