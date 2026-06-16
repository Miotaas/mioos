# MioOS V3 Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Incrementally migrate MioOS to the V3 architecture — 6 destinations (Today / Decide / Projects / Life / Teams / Settings), strict one-truth-one-place ownership model, no big-bang rewrites.

**Architecture:** Migration-first. Each task leaves the app fully functional. Old views remain routable from within pages; they are only removed from the sidebar. New views are introduced additively before old ones are retired. No data is deleted or migrated — schema changes are additive with safe defaults.

**Tech Stack:** Next.js App Router, TypeScript, Prisma + SQLite, Zustand, TailwindCSS, Lucide React

---

## Current → V3 Page Mapping

| Current view ID | Current component | V3 destination | V3 component | Action |
|---|---|---|---|---|
| `today` | `TodayView.tsx` | Today | `TodayView.tsx` | Enhance (catch-up + Life signals) |
| `drafts` | `DraftsView.tsx` | Decide | `DecideView.tsx` | Supersede (keep old route) |
| `workforce` | `WorkforceView.tsx` | Teams | `TeamsView.tsx` | Supersede (keep old route) |
| `projects` | `ProjectsView.tsx` | Projects | `ProjectsView.tsx` | Update in-place |
| `calendar` | `CalendarView.tsx` | Life | `LifeView.tsx` | Absorbed (keep old route) |
| `goals` | `GoalsView.tsx` | Life (personal) + Projects (business) | `LifeView.tsx` | Absorbed (keep old route) |
| `tasks` | `TasksView.tsx` | Projects (per-project) | — | Remove from sidebar |
| `revenue` | `RevenueView.tsx` | Projects per-project + Today signal | — | Remove from sidebar |
| `requests` | `FounderRequestsView.tsx` | Teams → Dispatch tab | `TeamsView.tsx` | Absorbed |
| `opportunities` | `OpportunitiesView.tsx` | Decide + Projects | — | Remove from sidebar |
| `company` | `CompanyCommandCenter.tsx` | — | — | Remove from sidebar |
| `settings` | `SettingsView.tsx` | Settings | `SettingsView.tsx` | Keep |

## Component Reuse Analysis

| Component | Reuse decision |
|---|---|
| `TodayView.tsx` | Keep + enhance: catch-up mode, Life signals in Agenda |
| `DraftsView.tsx` | Code reused for reference; `DecideView.tsx` replaces it |
| `WorkforceView.tsx` | Code reused for reference; `TeamsView.tsx` replaces it |
| `ProjectsView.tsx` | Updated in-place: add type + stage badges and filters |
| `CalendarView.tsx` | Absorbed by `LifeView.tsx`; keep file |
| `GoalsView.tsx` | Absorbed by `LifeView.tsx` (personal) + Projects (business); keep file |
| `FounderRequestsView.tsx` | Dispatch logic absorbed into `TeamsView.tsx`; keep file |
| `SettingsView.tsx` | Unchanged |

## Database Migration Plan

Additive-only. No existing data is touched.

1. `Project` model: add `projectType String @default("initiative")` + `stage String @default("exploring")`
2. Existing projects automatically get `initiative` / `exploring` defaults
3. Founder manually promotes key projects to Venture / appropriate stage after migration

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Old views break when removed from sidebar | Low | Keep all old view IDs routable in `page.tsx` forever |
| TypeScript union errors from new view IDs | Medium | Update `appStore.ts` first, before any other file |
| Approvals + Drafts merge breaks actions | Medium | Build `DecideView` additively, test approve/reject against live data |
| Schema push breaks existing projects | Low | Additive fields only; SQLite `db push` is safe |
| `isDueSoon` returns nothing (no goal dates set) | Low | Renders nothing — not an error |

---

### Task 1: Update `store/appStore.ts` — add V3 view IDs

**Files:**
- Modify: `store/appStore.ts`

- [ ] **Step 1: Replace the `activeView` union type**

Find this block (lines 38–48):
```typescript
activeView:
  // MioOS 2.0 — Today (default landing)
  | "today"
  // Primary navigation
  | "dashboard" | "briefing" | "inbox" | "tasks" | "projects" | "goals" | "calendar" | "revenue" | "workforce" | "requests" | "settings"
  // Company Command Center (Omega)
  | "company"
  // Draft Center
  | "drafts"
  // Legacy / internal views (still routable, not in sidebar)
  | "activity" | "agent-overview" | "agents" | "operations" | "opportunities" | "prospects" | "campaigns";
```

Replace with:
```typescript
activeView:
  // V3 primary navigation (6 destinations)
  | "today"
  | "decide"
  | "projects"
  | "life"
  | "teams"
  | "settings"
  // Legacy — still routable, removed from sidebar
  | "dashboard" | "briefing" | "inbox" | "tasks" | "goals" | "calendar"
  | "revenue" | "workforce" | "requests" | "company" | "drafts"
  // Deep-legacy / internal
  | "activity" | "agent-overview" | "agents" | "operations"
  | "opportunities" | "prospects" | "campaigns";
```

- [ ] **Step 2: Verify typecheck**

```
npx tsc --noEmit
```

Expected: 0 errors (additive type change, no consumers changed yet).

- [ ] **Step 3: Commit**

```bash
git add store/appStore.ts
git commit -m "feat(v3): add V3 view IDs to appStore activeView union"
```

---

### Task 2: Update `Sidebar.tsx` — V3 navigation

**Files:**
- Modify: `components/layout/Sidebar.tsx`

- [ ] **Step 1: Replace the imports block at the top of the file**

```typescript
import {
  Sun, ClipboardCheck, FolderOpen, Calendar, Users2,
  Settings, ChevronLeft, ChevronRight,
  Brain, LogOut, Sparkles,
} from "lucide-react";
```

- [ ] **Step 2: Replace `navGroups` constant**

```typescript
const navGroups: {
  label: string;
  accentClass: string;
  items: { id: ViewId; label: string; icon: React.ComponentType<{ className?: string }> }[];
}[] = [
  {
    label: "Surface",
    accentClass: "text-[#8b5cf6]",
    items: [
      { id: "today",  label: "Today",  icon: Sun },
      { id: "decide", label: "Decide", icon: ClipboardCheck },
    ],
  },
  {
    label: "Depth",
    accentClass: "text-[#6366f1]",
    items: [
      { id: "projects", label: "Projects", icon: FolderOpen },
      { id: "life",     label: "Life",     icon: Calendar },
      { id: "teams",    label: "Teams",    icon: Users2 },
    ],
  },
  {
    label: "System",
    accentClass: "text-text-ghost",
    items: [
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];
```

- [ ] **Step 3: Keep all JSX rendering logic unchanged** — only the `navGroups` data changes. The `group.items.length > 1` label guard already exists and handles the single-item case.

- [ ] **Step 4: Commit**

```bash
git add components/layout/Sidebar.tsx
git commit -m "feat(v3): update Sidebar to V3 6-destination navigation"
```

---

### Task 3: Update `MobileNav.tsx` — V3 navigation

**Files:**
- Modify: `components/layout/MobileNav.tsx`

- [ ] **Step 1: Replace imports**

```typescript
import {
  Menu, X, Brain, Sparkles, LogOut,
  Sun, ClipboardCheck, FolderOpen, Calendar, Users2, Settings, MoreHorizontal,
} from "lucide-react";
```

- [ ] **Step 2: Replace `navGroups` constant** (same structure as Sidebar.tsx Task 2)

```typescript
const navGroups: {
  label: string;
  accentClass: string;
  items: { id: ViewId; label: string; icon: React.ComponentType<{ className?: string }> }[];
}[] = [
  {
    label: "Surface",
    accentClass: "text-[#8b5cf6]",
    items: [
      { id: "today",  label: "Today",  icon: Sun },
      { id: "decide", label: "Decide", icon: ClipboardCheck },
    ],
  },
  {
    label: "Depth",
    accentClass: "text-[#6366f1]",
    items: [
      { id: "projects", label: "Projects", icon: FolderOpen },
      { id: "life",     label: "Life",     icon: Calendar },
      { id: "teams",    label: "Teams",    icon: Users2 },
    ],
  },
  {
    label: "System",
    accentClass: "text-text-ghost",
    items: [
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];
```

- [ ] **Step 3: Replace `bottomTabs` constant**

```typescript
const bottomTabs: { id: ViewId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "today",    label: "Today",    icon: Sun },
  { id: "decide",   label: "Decide",   icon: ClipboardCheck },
  { id: "projects", label: "Projects", icon: FolderOpen },
];
```

- [ ] **Step 4: Commit**

```bash
git add components/layout/MobileNav.tsx
git commit -m "feat(v3): update MobileNav to V3 navigation"
```

---

### Task 4: Update `app/page.tsx` — wire V3 routes (stub phase)

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add three stub routes** in the main content block, alongside the existing routes. These are temporary stubs — replaced in Tasks 8, 9, 10.

```tsx
{/* V3 primary views — stubs replaced in later tasks */}
{activeView === "decide" && <ErrorBoundary label="Decide"><DraftsView /></ErrorBoundary>}
{activeView === "life"   && <ErrorBoundary label="Life"><CalendarView /></ErrorBoundary>}
{activeView === "teams"  && <ErrorBoundary label="Teams"><WorkforceView /></ErrorBoundary>}
```

Add these after the existing `{activeView === "today" && ...}` line.

**Do not remove any existing routes.** All old view IDs remain routable.

- [ ] **Step 2: Run typecheck**

```
npx tsc --noEmit
```

- [ ] **Step 3: Start dev server and verify navigation**

```
npm run dev
```

Click each sidebar item. All 6 destinations should render without errors. Decide shows DraftsView temporarily. Life shows CalendarView temporarily. Teams shows WorkforceView temporarily.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat(v3): wire V3 stub routes in page.tsx"
```

---

### Task 5: Schema — add `projectType` and `stage` to Project model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add two fields to the `Project` model**

Find the `model Project` block. After the `autoCreated Boolean @default(false)` line, add:

```prisma
projectType   String   @default("initiative")  // venture | initiative
stage         String   @default("exploring")   // exploring | validating | building | live | paused | killed
```

The Project model should now look like:

```prisma
model Project {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique
  description   String?
  status        String   @default("active")
  priority      String   @default("medium")
  nextAction    String?
  blocker       String?
  revenueImpact Float?
  opportunityId String?
  autoCreated   Boolean  @default(false)
  projectType   String   @default("initiative")  // venture | initiative
  stage         String   @default("exploring")   // exploring | validating | building | live | paused | killed
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("projects")
}
```

- [ ] **Step 2: Push schema**

```powershell
$env:DATABASE_URL = "file:./prisma/prisma/mioos.db"
npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(v3): add projectType and stage to Project model"
```

---

### Task 6: Update `types/index.ts` — V3 project types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add type aliases** near the top of the file (after existing type exports):

```typescript
export type ProjectType  = "venture" | "initiative";
export type ProjectStage = "exploring" | "validating" | "building" | "live" | "paused" | "killed";
```

- [ ] **Step 2: Update `MioProject` interface**

Find the `MioProject` interface. Add two fields at the end, before the closing `}`:

```typescript
projectType?: ProjectType;   // defaults to "initiative" if absent
stage?:       ProjectStage;  // defaults to "exploring" if absent
```

Mark both optional (`?`) because existing API responses may not include them until the API route is updated.

- [ ] **Step 3: Run typecheck**

```
npx tsc --noEmit
```

Fix any errors. Most likely zero — the fields are optional and additive.

- [ ] **Step 4: Commit**

```bash
git add types/index.ts
git commit -m "feat(v3): add ProjectType and ProjectStage to types"
```

---

### Task 7: Update `ProjectsView.tsx` — type + stage display

**Files:**
- Modify: `components/dashboard/ProjectsView.tsx`

- [ ] **Step 1: Add imports**

Add to the existing imports at the top of the file:
```typescript
import type { ProjectType, ProjectStage } from "@/types";
```

- [ ] **Step 2: Add badge constants** after the existing `PRIORITY_BADGE` constant:

```typescript
const PROJECT_TYPE_BADGE: Record<ProjectType, { label: string; bg: string; text: string; border: string }> = {
  venture:    { label: "Venture",    bg: "bg-accent-violet/10", text: "text-accent-violet", border: "border-accent-violet/20" },
  initiative: { label: "Initiative", bg: "bg-accent-cyan/10",   text: "text-accent-cyan",   border: "border-accent-cyan/20" },
};

const STAGE_BADGE: Record<ProjectStage, { label: string; dot: string }> = {
  exploring:  { label: "Exploring",  dot: "bg-text-ghost" },
  validating: { label: "Validating", dot: "bg-accent-amber" },
  building:   { label: "Building",   dot: "bg-accent-cyan" },
  live:       { label: "Live",       dot: "bg-accent-green" },
  paused:     { label: "Paused",     dot: "bg-text-ghost" },
  killed:     { label: "Killed",     dot: "bg-accent-red" },
};
```

- [ ] **Step 3: Add `typeFilter` state** alongside existing state declarations:

```typescript
const [typeFilter, setTypeFilter] = useState<"all" | ProjectType>("all");
```

- [ ] **Step 4: Update the `filtered` derivation** — replace the existing `filtered` const with:

```typescript
const filtered = projects
  .filter(p => statusFilter === "all" || p.status === statusFilter)
  .filter(p => typeFilter === "all" || (p.projectType ?? "initiative") === typeFilter)
  .sort((a, b) => {
    if (typeFilter === "all") {
      // Ventures first in default view
      const av = (a.projectType ?? "initiative") === "venture" ? 0 : 1;
      const bv = (b.projectType ?? "initiative") === "venture" ? 0 : 1;
      if (av !== bv) return av - bv;
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
```

- [ ] **Step 5: Add type filter pill row** in JSX

Find the header/filter area (where status filter buttons are rendered). Add a type filter row directly below the existing status pills:

```tsx
{/* Type filter */}
<div className="flex gap-1.5 px-6 pb-3 border-b border-white/[0.04]">
  {(["all", "venture", "initiative"] as const).map(t => (
    <button
      key={t}
      onClick={() => setTypeFilter(t)}
      className={cn(
        "px-3 py-1 rounded-full text-[11px] font-medium border transition-all",
        typeFilter === t
          ? "bg-accent-violet/10 border-accent-violet/20 text-accent-violet"
          : "border-white/[0.07] text-text-ghost hover:text-text-muted hover:bg-white/[0.03]"
      )}
    >
      {t === "all" ? "All" : t === "venture" ? "Ventures" : "Initiatives"}
    </button>
  ))}
</div>
```

- [ ] **Step 6: Add type + stage badges on each project row**

Find the JSX that renders each project list item (inside the `filtered.map(p => ...)` block). After the project name line, add:

```tsx
{/* Type + Stage */}
<div className="flex items-center gap-2 mt-1">
  {(() => {
    const type  = PROJECT_TYPE_BADGE[p.projectType ?? "initiative"];
    const stage = STAGE_BADGE[p.stage ?? "exploring"];
    return (
      <>
        <span className={cn(
          "text-[9px] font-semibold px-2 py-0.5 rounded-full border",
          type.bg, type.text, type.border
        )}>
          {type.label}
        </span>
        <div className="flex items-center gap-1">
          <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", stage.dot)} />
          <span className="text-[10px] text-text-ghost">{stage.label}</span>
        </div>
      </>
    );
  })()}
</div>
```

- [ ] **Step 7: Run typecheck and verify**

```
npx tsc --noEmit
npm run dev
```

Navigate to Projects. Verify: each project shows type + stage badges. Type filter pills appear and filter the list. Ventures sort first in "All" view.

- [ ] **Step 8: Commit**

```bash
git add components/dashboard/ProjectsView.tsx
git commit -m "feat(v3): add projectType/stage display and filtering to ProjectsView"
```

---

### Task 8: Create `DecideView` — unified decision hub

**Files:**
- Create: `components/decide/DecideView.tsx`
- Modify: `app/page.tsx` (replace stub)

- [ ] **Step 1: Create directory**

```powershell
New-Item -ItemType Directory -Force -Path "components/decide"
```

- [ ] **Step 2: Create `components/decide/DecideView.tsx`**

> Before writing: open `components/agents/DraftsView.tsx` and verify the exact field names of `UnifiedDraft` (body vs content) and `WorkforceApproval` (riskLevel, sourceTeamId). Use those exact names below.

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import type { WorkforceApproval, UnifiedDraft, DraftType } from "@/types";
import {
  ClipboardCheck, ChevronRight, CheckCircle2, XCircle,
  Clock, Loader2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────

type DecideTab = "all" | "approvals" | "drafts";

type DecideItem =
  | { kind: "approval"; data: WorkforceApproval }
  | { kind: "draft";    data: UnifiedDraft };

// ── Constants ──────────────────────────────────────────────────────

const URGENCY_BAR: Record<string, string> = {
  urgent:   "bg-accent-red",
  high:     "bg-accent-amber",
  critical: "bg-accent-red",
  medium:   "bg-accent-violet",
  low:      "bg-text-ghost",
};

// ── Component ──────────────────────────────────────────────────────

export function DecideView() {
  const [approvals,  setApprovals]  = useState<WorkforceApproval[]>([]);
  const [drafts,     setDrafts]     = useState<UnifiedDraft[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState<DecideTab>("all");
  const [selected,   setSelected]   = useState<DecideItem | null>(null);
  const [acting,     setActing]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/workforce-approvals?status=pending").then(r => r.json()).catch(() => []),
      fetch("/api/drafts").then(r => r.json()).catch(() => []),
    ]).then(([app, dr]) => {
      setApprovals(Array.isArray(app) ? app.filter((a: WorkforceApproval) => a.status === "pending") : []);
      setDrafts(Array.isArray(dr) ? dr : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const items: DecideItem[] = [
    ...approvals.map(a => ({ kind: "approval" as const, data: a })),
    ...drafts
      .filter(d => d.status === "review_needed" || d.status === "draft")
      .map(d => ({ kind: "draft" as const, data: d })),
  ].filter(item =>
    tab === "all"       ? true :
    tab === "approvals" ? item.kind === "approval" :
                          item.kind === "draft"
  );

  const totalPending = approvals.length + drafts.filter(d => d.status === "review_needed").length;

  async function actApproval(id: string, decision: "approved" | "rejected") {
    setActing(true);
    await fetch(`/api/workforce-approvals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: decision }),
    }).catch(() => {});
    setSelected(null);
    await load();
    setActing(false);
  }

  async function actDraft(id: string, type: DraftType, status: string) {
    setActing(true);
    await fetch(`/api/drafts/${type}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => {});
    setSelected(null);
    await load();
    setActing(false);
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* LEFT — list panel */}
      <div className="w-[320px] flex-shrink-0 border-r border-white/[0.05] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/[0.05] flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-[20px] font-semibold text-text-primary tracking-tight">Decide</h1>
            {totalPending > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-accent-amber/10 border border-accent-amber/20 text-accent-amber text-[11px] font-semibold tabular-nums">
                {totalPending}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            {(["all", "approvals", "drafts"] as DecideTab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setSelected(null); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-medium capitalize transition-all",
                  tab === t ? "bg-white/[0.08] text-text-primary" : "text-text-ghost hover:text-text-muted"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-4 h-4 text-text-ghost animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CheckCircle2 className="w-8 h-8 text-accent-green/30 mx-auto mb-3" />
              <p className="text-[13px] text-text-ghost">All clear</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {items.map(item => {
                const isSelected = selected !== null && selected.kind === item.kind && selected.data.id === item.data.id;
                const priority   = item.kind === "approval" ? item.data.priority : (item.data as UnifiedDraft).status;
                const title      = item.data.title;
                const sub        = item.kind === "approval"
                  ? (item.data as WorkforceApproval).sourceTeamId ? `Team · Approval` : "Approval"
                  : `${(item.data as UnifiedDraft).draftType} · Draft`;
                return (
                  <button
                    key={`${item.kind}-${item.data.id}`}
                    onClick={() => setSelected(item)}
                    className={cn(
                      "w-full text-left flex items-stretch transition-all",
                      isSelected ? "bg-white/[0.05]" : "hover:bg-white/[0.02]"
                    )}
                  >
                    <div className={cn("w-[3px] flex-shrink-0 self-stretch", URGENCY_BAR[priority ?? "medium"])} />
                    <div className="flex-1 min-w-0 px-4 py-3">
                      <p className="text-[12px] font-medium text-text-primary leading-snug line-clamp-2">{title}</p>
                      <p className="text-[10px] text-text-ghost mt-0.5">{sub}</p>
                    </div>
                    <div className="flex items-center px-3">
                      <ChevronRight className="w-3 h-3 text-text-ghost opacity-50" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — detail panel */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {selected === null ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ClipboardCheck className="w-10 h-10 text-white/[0.06] mx-auto mb-3" />
              <p className="text-[13px] text-text-ghost">Select an item to review</p>
            </div>
          </div>
        ) : selected.kind === "approval" ? (
          <ApprovalDetail
            approval={selected.data as WorkforceApproval}
            acting={acting}
            onApprove={() => actApproval(selected.data.id, "approved")}
            onReject={() => actApproval(selected.data.id, "rejected")}
          />
        ) : (
          <DraftDetail
            draft={selected.data as UnifiedDraft}
            acting={acting}
            onApprove={() => actDraft(selected.data.id, (selected.data as UnifiedDraft).draftType, "approved")}
            onReject={() => actDraft(selected.data.id, (selected.data as UnifiedDraft).draftType, "rejected")}
            onArchive={() => actDraft(selected.data.id, (selected.data as UnifiedDraft).draftType, "archived")}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function ApprovalDetail({ approval, acting, onApprove, onReject }: {
  approval: WorkforceApproval;
  acting: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <p className="text-[10px] text-text-ghost uppercase tracking-wider mb-2">Approval Request</p>
        <h2 className="text-[22px] font-semibold text-text-primary mb-5 leading-snug">{approval.title}</h2>
        {approval.description && (
          <p className="text-[14px] text-text-secondary leading-relaxed mb-6">{approval.description}</p>
        )}
        {approval.reason && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-6">
            <p className="text-[10px] text-text-ghost uppercase tracking-wider mb-2">Reason</p>
            <p className="text-[13px] text-text-secondary leading-relaxed">{approval.reason}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <p className="text-[10px] text-text-ghost uppercase tracking-wider mb-1">Risk</p>
            <p className="text-[13px] text-text-primary capitalize">{approval.riskLevel ?? "medium"}</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <p className="text-[10px] text-text-ghost uppercase tracking-wider mb-1">Priority</p>
            <p className="text-[13px] text-text-primary capitalize">{approval.priority ?? "medium"}</p>
          </div>
        </div>
      </div>
      {/* Action bar — bottom only, never in list */}
      <div className="flex-shrink-0 px-8 py-5 border-t border-white/[0.05] flex gap-3">
        <button onClick={onApprove} disabled={acting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green text-[13px] font-medium hover:bg-accent-green/15 transition-all disabled:opacity-50">
          <CheckCircle2 className="w-4 h-4" /> Approve
        </button>
        <button onClick={onReject} disabled={acting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-[13px] font-medium hover:bg-accent-red/15 transition-all disabled:opacity-50">
          <XCircle className="w-4 h-4" /> Reject
        </button>
        <button disabled={acting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-text-secondary text-[13px] font-medium hover:bg-white/[0.06] transition-all disabled:opacity-50">
          <Clock className="w-4 h-4" /> Defer
        </button>
      </div>
    </div>
  );
}

function DraftDetail({ draft, acting, onApprove, onReject, onArchive }: {
  draft: UnifiedDraft;
  acting: boolean;
  onApprove: () => void;
  onReject: () => void;
  onArchive: () => void;
}) {
  // UnifiedDraft may expose content via different fields depending on type.
  // Check types/index.ts for the exact field — common options: body, content, adCopy.
  const bodyContent = (draft as Record<string, unknown>).body
    ?? (draft as Record<string, unknown>).content
    ?? null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <p className="text-[10px] text-text-ghost uppercase tracking-wider mb-2 capitalize">
          {draft.draftType} Draft
        </p>
        <h2 className="text-[22px] font-semibold text-text-primary mb-5 leading-snug">{draft.title}</h2>
        {bodyContent && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <p className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-wrap">
              {String(bodyContent)}
            </p>
          </div>
        )}
      </div>
      {/* Action bar — bottom only */}
      <div className="flex-shrink-0 px-8 py-5 border-t border-white/[0.05] flex gap-3">
        <button onClick={onApprove} disabled={acting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green text-[13px] font-medium hover:bg-accent-green/15 transition-all disabled:opacity-50">
          <CheckCircle2 className="w-4 h-4" /> Approve
        </button>
        <button onClick={onReject} disabled={acting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-[13px] font-medium hover:bg-accent-red/15 transition-all disabled:opacity-50">
          <XCircle className="w-4 h-4" /> Reject
        </button>
        <button onClick={onArchive} disabled={acting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-text-secondary text-[13px] font-medium hover:bg-white/[0.06] transition-all disabled:opacity-50">
          Archive
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Replace stub in `app/page.tsx`**

Add import at top:
```typescript
import { DecideView } from "@/components/decide/DecideView";
```

Replace:
```tsx
{activeView === "decide" && <ErrorBoundary label="Decide"><DraftsView /></ErrorBoundary>}
```
With:
```tsx
{activeView === "decide" && <ErrorBoundary label="Decide"><DecideView /></ErrorBoundary>}
```

- [ ] **Step 4: Run typecheck**

```
npx tsc --noEmit
```

If `UnifiedDraft` or `WorkforceApproval` field names differ from the component's assumptions, fix them now by cross-referencing `types/index.ts`.

- [ ] **Step 5: Verify in browser**

Navigate to Decide. Verify:
1. List shows pending approvals + drafts with colored urgency bars
2. Clicking an item shows full context in the right panel
3. Action buttons are ONLY in the right panel (not in the list)
4. Approve/Reject refresh the list and clear the selection

- [ ] **Step 6: Commit**

```bash
git add components/decide/DecideView.tsx app/page.tsx
git commit -m "feat(v3): add DecideView — two-panel decision hub with approval + draft unification"
```

---

### Task 9: Create `TeamsView` — Active Work + Dispatch

**Files:**
- Create: `components/teams/TeamsView.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create directory**

```powershell
New-Item -ItemType Directory -Force -Path "components/teams"
```

- [ ] **Step 2: Check the assignment creation API endpoint**

Open `components/agents/FounderRequestsView.tsx` and find the `fetch` call used to POST a new assignment. Note the exact URL and body shape. Use that same endpoint in Step 3.

- [ ] **Step 3: Create `components/teams/TeamsView.tsx`**

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import type { WorkforceTeam, Assignment } from "@/types";
import {
  Users2, Send, Compass, Loader2, PlayCircle, Clock, CheckCircle2,
} from "lucide-react";

type TeamsTab = "active-work" | "dispatch" | "discoveries";

const ASSIGNMENT_STATUS_META: Record<string, { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  active:    { label: "Working",           color: "text-accent-cyan",  Icon: PlayCircle },
  pending:   { label: "Waiting for input", color: "text-accent-amber", Icon: Clock },
  completed: { label: "Output ready",      color: "text-accent-green", Icon: CheckCircle2 },
  review:    { label: "In review",         color: "text-accent-violet", Icon: Clock },
};

export function TeamsView() {
  const { setActiveView } = useAppStore();
  const [tab,          setTab]          = useState<TeamsTab>("active-work");
  const [teams,        setTeams]        = useState<WorkforceTeam[]>([]);
  const [assignments,  setAssignments]  = useState<Assignment[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [dispatchText, setDispatchText] = useState("");
  const [teamId,       setTeamId]       = useState("");
  const [dispatching,  setDispatching]  = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/workforce/teams").then(r => r.json()).catch(() => []),
      fetch("/api/assignments").then(r => r.json()).catch(() => []),
    ]).then(([t, a]) => {
      const active = Array.isArray(t) ? t.filter((x: WorkforceTeam) => x.status === "active") : [];
      const liveAssignments = Array.isArray(a)
        ? a.filter((x: Assignment) => ["active", "pending", "review"].includes(x.status))
        : [];
      setTeams(active);
      setAssignments(liveAssignments);
      if (active.length > 0 && !teamId) setTeamId(active[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [teamId]);

  useEffect(() => { load(); }, [load]);

  async function dispatch() {
    if (!dispatchText.trim() || !teamId) return;
    setDispatching(true);
    // Use the same endpoint as FounderRequestsView — verify in that file
    await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: dispatchText.trim(), teamId, priority: "medium" }),
    }).catch(() => {});
    setDispatchText("");
    await load();
    setDispatching(false);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/[0.05] flex-shrink-0">
        <h1 className="text-[20px] font-semibold text-text-primary tracking-tight mb-4">Teams</h1>
        <div className="flex gap-1">
          {([
            { id: "active-work", label: "Active Work" },
            { id: "dispatch",    label: "Dispatch" },
            { id: "discoveries", label: "Discoveries" },
          ] as { id: TeamsTab; label: string }[]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all",
                tab === t.id ? "bg-white/[0.08] text-text-primary" : "text-text-ghost hover:text-text-muted"
              )}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-4 h-4 text-text-ghost animate-spin" />
          </div>
        ) : tab === "active-work" ? (
          <ActiveWorkTab teams={teams} assignments={assignments} />
        ) : tab === "dispatch" ? (
          <DispatchTab
            teams={teams}
            text={dispatchText}
            teamId={teamId}
            dispatching={dispatching}
            onTextChange={setDispatchText}
            onTeamChange={setTeamId}
            onDispatch={dispatch}
          />
        ) : (
          <DiscoveriesTab onGoToDecide={() => setActiveView("decide")} />
        )}
      </div>
    </div>
  );
}

function ActiveWorkTab({ teams, assignments }: { teams: WorkforceTeam[]; assignments: Assignment[] }) {
  if (teams.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <Users2 className="w-8 h-8 text-white/10 mx-auto mb-3" />
        <p className="text-[13px] text-text-ghost">No active teams</p>
      </div>
    );
  }
  return (
    <div className="divide-y divide-white/[0.04]">
      {teams.map(team => {
        const current = assignments.find(a => a.teamId === team.id);
        const statusKey = current?.status ?? "pending";
        const meta = ASSIGNMENT_STATUS_META[statusKey] ?? ASSIGNMENT_STATUS_META.pending;
        const { Icon } = meta;
        return (
          <div key={team.id} className="px-6 py-5 flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Users2 className="w-4 h-4 text-accent-cyan" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-text-primary">{team.name}</p>
              {current ? (
                <>
                  <p className="text-[12px] text-text-secondary leading-relaxed mt-0.5">
                    {current.description ?? current.title}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Icon className={cn("w-3 h-3", meta.color)} />
                    <span className={cn("text-[10px] font-medium", meta.color)}>{meta.label}</span>
                    {current.startedAt && (
                      <span className="text-[10px] text-text-ghost">
                        · since {new Date(current.startedAt).toLocaleDateString("en-GB", { weekday: "short" })}
                      </span>
                    )}
                  </div>
                </>
              ) : team.currentFocus ? (
                <p className="text-[12px] text-text-secondary mt-0.5">{team.currentFocus}</p>
              ) : (
                <p className="text-[12px] text-text-ghost mt-0.5 italic">No active assignment</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DispatchTab({ teams, text, teamId, dispatching, onTextChange, onTeamChange, onDispatch }: {
  teams: WorkforceTeam[];
  text: string;
  teamId: string;
  dispatching: boolean;
  onTextChange: (v: string) => void;
  onTeamChange: (v: string) => void;
  onDispatch: () => void;
}) {
  return (
    <div className="px-6 py-6 max-w-2xl">
      <p className="text-[13px] text-text-secondary mb-6">Describe what you need done in plain language. A team will pick it up.</p>
      <div className="space-y-3">
        <textarea
          value={text}
          onChange={e => onTextChange(e.target.value)}
          placeholder="e.g. Research enterprise pricing benchmarks for AION..."
          rows={4}
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-text-primary placeholder:text-text-ghost resize-none focus:outline-none focus:border-accent-cyan/30 transition-colors"
        />
        <div className="flex items-center gap-3">
          <select
            value={teamId}
            onChange={e => onTeamChange(e.target.value)}
            className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-accent-cyan/30 transition-colors"
          >
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button
            onClick={onDispatch}
            disabled={dispatching || !text.trim() || !teamId}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-[13px] font-medium hover:bg-accent-cyan/15 transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {dispatching ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DiscoveriesTab({ onGoToDecide }: { onGoToDecide: () => void }) {
  return (
    <div className="px-6 py-12 text-center">
      <Compass className="w-8 h-8 text-white/10 mx-auto mb-3" />
      <p className="text-[13px] text-text-ghost mb-1">Team discoveries appear here</p>
      <p className="text-[11px] text-text-ghost/60 mb-4">Outputs ready for review are in Decide</p>
      <button
        onClick={onGoToDecide}
        className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-text-secondary text-[12px] font-medium hover:bg-white/[0.06] transition-all"
      >
        Open Decide →
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Replace stub in `app/page.tsx`**

Add import:
```typescript
import { TeamsView } from "@/components/teams/TeamsView";
```

Replace:
```tsx
{activeView === "teams" && <ErrorBoundary label="Teams"><WorkforceView /></ErrorBoundary>}
```
With:
```tsx
{activeView === "teams" && <ErrorBoundary label="Teams"><TeamsView /></ErrorBoundary>}
```

- [ ] **Step 5: Typecheck + verify**

```
npx tsc --noEmit
npm run dev
```

Navigate to Teams. Verify: Active Work shows each team with its current assignment in plain language. Dispatch sends a new assignment. Discoveries links to Decide.

- [ ] **Step 6: Commit**

```bash
git add components/teams/TeamsView.tsx app/page.tsx
git commit -m "feat(v3): add TeamsView with Active Work, Dispatch, and Discoveries tabs"
```

---

### Task 10: Create `LifeView` — personal layer

**Files:**
- Create: `components/life/LifeView.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create directory**

```powershell
New-Item -ItemType Directory -Force -Path "components/life"
```

- [ ] **Step 2: Create `components/life/LifeView.tsx`**

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { MioGoal } from "@/types";
import { Calendar, Target, Heart, Loader2, CheckCircle2 } from "lucide-react";

type LifeTab = "calendar" | "goals" | "habits";

export function LifeView() {
  const [tab,     setTab]     = useState<LifeTab>("calendar");
  const [goals,   setGoals]   = useState<MioGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/goals")
      .then(r => r.json())
      .then((data: MioGoal[]) => {
        // goalType "personal" = Life; "business" = Projects
        setGoals(Array.isArray(data) ? data.filter(g => g.goalType === "personal") : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b border-white/[0.05] flex-shrink-0">
        <h1 className="text-[20px] font-semibold text-text-primary tracking-tight mb-4">Life</h1>
        <div className="flex gap-1">
          {([
            { id: "calendar", label: "Calendar", Icon: Calendar },
            { id: "goals",    label: "Goals",    Icon: Target },
            { id: "habits",   label: "Habits",   Icon: Heart },
          ] as { id: LifeTab; label: string; Icon: React.ComponentType<{ className?: string }> }[]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all",
                tab === t.id ? "bg-white/[0.08] text-text-primary" : "text-text-ghost hover:text-text-muted"
              )}>
              <t.Icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "calendar" ? (
          <CalendarTab />
        ) : tab === "goals" ? (
          loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-4 h-4 text-text-ghost animate-spin" />
            </div>
          ) : (
            <PersonalGoalsTab goals={goals} />
          )
        ) : (
          <HabitsTab />
        )}
      </div>
    </div>
  );
}

function CalendarTab() {
  return (
    <div className="px-6 py-8">
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-8 text-center">
        <Calendar className="w-8 h-8 text-white/10 mx-auto mb-3" />
        <p className="text-[13px] text-text-ghost">No calendar connected</p>
        <p className="text-[11px] text-text-ghost/60 mt-1">Connect a calendar in Settings to see events here</p>
      </div>
    </div>
  );
}

function PersonalGoalsTab({ goals }: { goals: MioGoal[] }) {
  const active   = goals.filter(g => g.status === "active");
  const achieved = goals.filter(g => g.status === "achieved");

  return (
    <div className="px-6 py-6 space-y-6">
      <div>
        <p className="text-[10px] text-text-ghost uppercase tracking-wider mb-3">Active</p>
        {active.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 text-center">
            <p className="text-[13px] text-text-ghost">No personal goals yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map(goal => (
              <div key={goal.id} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
                <p className="text-[13px] font-medium text-text-primary">{goal.title}</p>
                {goal.description && (
                  <p className="text-[11px] text-text-secondary mt-1">{goal.description}</p>
                )}
                {goal.progress > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] text-text-ghost">Progress</span>
                      <span className="text-[10px] text-text-muted">{goal.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-accent-purple rounded-full" style={{ width: `${goal.progress}%` }} />
                    </div>
                  </div>
                )}
                {goal.targetDate && (
                  <p className="text-[10px] text-text-ghost mt-2">
                    Target: {new Date(goal.targetDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {achieved.length > 0 && (
        <div>
          <p className="text-[10px] text-text-ghost uppercase tracking-wider mb-3">Achieved</p>
          <div className="space-y-2">
            {achieved.map(goal => (
              <div key={goal.id} className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-accent-green flex-shrink-0" />
                <p className="text-[13px] text-text-muted">{goal.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HabitsTab() {
  return (
    <div className="px-6 py-8">
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-8 text-center">
        <Heart className="w-8 h-8 text-white/10 mx-auto mb-3" />
        <p className="text-[13px] text-text-ghost">Habits tracking coming soon</p>
        <p className="text-[11px] text-text-ghost/60 mt-1">Daily routines and streaks will appear here</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Replace stub in `app/page.tsx`**

Add import:
```typescript
import { LifeView } from "@/components/life/LifeView";
```

Replace:
```tsx
{activeView === "life" && <ErrorBoundary label="Life"><CalendarView /></ErrorBoundary>}
```
With:
```tsx
{activeView === "life" && <ErrorBoundary label="Life"><LifeView /></ErrorBoundary>}
```

- [ ] **Step 4: Typecheck + verify**

```
npx tsc --noEmit
npm run dev
```

Navigate to Life. Verify: Goals tab shows personal goals (goalType: "personal"). Calendar tab shows placeholder. Habits tab shows placeholder.

- [ ] **Step 5: Commit**

```bash
git add components/life/LifeView.tsx app/page.tsx
git commit -m "feat(v3): add LifeView with Calendar, personal Goals, and Habits tabs"
```

---

### Task 11: Update `TodayView` — Life surfacing + catch-up mode

**Files:**
- Modify: `components/today/TodayView.tsx`

- [ ] **Step 1: Add `Clock` to the Lucide imports** if not already present

```typescript
import { ..., Clock } from "lucide-react";
```

- [ ] **Step 2: Add state and types** — at the top of the `TodayView` function, alongside existing state declarations:

```typescript
const [catchUpMode, setCatchUpMode] = useState(false);
const [lifeGoals,   setLifeGoals]   = useState<MioGoal[]>([]);
```

Add the `MioGoal` import if not already imported:
```typescript
import type { ..., MioGoal } from "@/types";
```

- [ ] **Step 3: Add catch-up mode detection** — add this `useEffect` at the beginning of the component (before the data-loading `useEffect`):

```typescript
useEffect(() => {
  const KEY = "mioos_last_visit";
  const last = localStorage.getItem(KEY);
  if (last) {
    const gap = Date.now() - parseInt(last, 10);
    if (gap > 24 * 60 * 60 * 1000) setCatchUpMode(true);
  }
  localStorage.setItem(KEY, String(Date.now()));
}, []);
```

- [ ] **Step 4: Add Life goals fetch** — inside the existing `load()` function, add `/api/goals` to the `Promise.all` array:

```typescript
fetch("/api/goals").then(r => r.json()).catch(() => []),
```

In the `.then()` destructuring, add the variable (e.g., `lifeGoalData`) and set state:

```typescript
const personal = Array.isArray(lifeGoalData)
  ? lifeGoalData.filter((g: MioGoal) => {
      if (g.goalType !== "personal") return false;
      if (!g.targetDate) return false;
      const diff = new Date(g.targetDate).getTime() - Date.now();
      return diff > 0 && diff < 48 * 60 * 60 * 1000; // due within 48h
    })
  : [];
setLifeGoals(personal);
```

- [ ] **Step 5: Add catch-up banner** — in the Brief card JSX, after the date/status line and before the AI narrative text:

```tsx
{catchUpMode && (
  <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-lg bg-accent-amber/10 border border-accent-amber/20 w-fit">
    <Clock className="w-3 h-3 text-accent-amber flex-shrink-0" />
    <span className="text-[11px] text-accent-amber font-medium">
      Catch-up — showing activity since your last visit
    </span>
  </div>
)}
```

- [ ] **Step 6: Add Life signals to the Agenda card** — find the Agenda card JSX in TodayView. After the last calendar event row, add:

```tsx
{lifeGoals.length > 0 && (
  <div className="mt-2 pt-2 border-t border-white/[0.04]">
    <p className="text-[9px] text-text-ghost uppercase tracking-wider mb-1.5 px-6">Personal</p>
    {lifeGoals.map(goal => (
      <div key={goal.id} className="flex items-center gap-3 px-6 py-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-accent-purple flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-text-secondary truncate">{goal.title}</p>
          <p className="text-[10px] text-text-ghost">
            Due {new Date(goal.targetDate!).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
          </p>
        </div>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 7: Typecheck**

```
npx tsc --noEmit
```

- [ ] **Step 8: Verify**

Navigate to Today. Check:
- If any personal goals have `targetDate` within 48h: they appear in the Agenda card under a "Personal" section
- To test catch-up mode: in browser console run `localStorage.setItem("mioos_last_visit", String(Date.now() - 25 * 60 * 60 * 1000))` then refresh

- [ ] **Step 9: Commit**

```bash
git add components/today/TodayView.tsx
git commit -m "feat(v3): add catch-up mode and Life time-sensitive surfacing to TodayView"
```

---

### Task 12: Final cleanup + verification

**Files:**
- Verify all: `store/appStore.ts`, `app/page.tsx`, `Sidebar.tsx`, `MobileNav.tsx`

- [ ] **Step 1: Verify V3 routes are present in `app/page.tsx`**

Confirm these 6 lines exist:
```tsx
{activeView === "today"    && <ErrorBoundary label="Today"><TodayView /></ErrorBoundary>}
{activeView === "decide"   && <ErrorBoundary label="Decide"><DecideView /></ErrorBoundary>}
{activeView === "projects" && <ErrorBoundary label="Projects"><ProjectsView /></ErrorBoundary>}
{activeView === "life"     && <ErrorBoundary label="Life"><LifeView /></ErrorBoundary>}
{activeView === "teams"    && <ErrorBoundary label="Teams"><TeamsView /></ErrorBoundary>}
{activeView === "settings" && <ErrorBoundary label="Settings"><SettingsView /></ErrorBoundary>}
```

Confirm all old routes remain (they should — no old routes were removed).

- [ ] **Step 2: Run full typecheck**

```
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Run build**

```
npm run build
```

Expected: succeeds. Fix any build-time errors (usually unused import warnings that become errors, or type mismatches surfaced only at build time).

- [ ] **Step 4: Smoke test all 6 V3 destinations**

```
npm run dev
```

- [ ] Today — opens by default, shows Brief + Attention (max 3) + Agenda
- [ ] Decide — two-panel layout, pending approvals + drafts in list
- [ ] Projects — type + stage badges visible, type filter works
- [ ] Life — Calendar / Goals / Habits tabs render
- [ ] Teams — Active Work shows team assignments, Dispatch sends work
- [ ] Settings — opens without errors

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(v3): complete V3 navigation migration — all 6 destinations live"
```

---

## Definition of Done — by Task

| Task | Done when |
|---|---|
| 1 — appStore | `activeView` union includes "decide", "life", "teams"; 0 type errors |
| 2 — Sidebar | Shows 6 V3 destinations; old destinations removed from nav |
| 3 — MobileNav | Mobile drawer + bottom tabs show V3 destinations |
| 4 — page.tsx stubs | All 6 destinations render without crashes |
| 5 — Schema | `npx prisma db push` succeeds; `projectType` + `stage` columns exist |
| 6 — Types | `MioProject` has `projectType?` and `stage?`; 0 type errors |
| 7 — ProjectsView | Type + stage badges visible; type filter functional; Ventures sort first |
| 8 — DecideView | Two-panel layout; action buttons only in right panel; approve/reject work |
| 9 — TeamsView | Active Work shows assignment descriptions; Dispatch creates assignments |
| 10 — LifeView | Personal goals visible; tabs render; no errors |
| 11 — TodayView | Life goals surface when due within 48h; catch-up banner after 24h gap |
| 12 — Cleanup | `tsc --noEmit` passes; `npm run build` succeeds; all 6 V3 destinations work |
