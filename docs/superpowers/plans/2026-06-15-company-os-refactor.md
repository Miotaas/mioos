# Company OS UI Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor MioOS navigation and Command Center into a coherent Company OS with an Executive Brief landing experience, Company OS nav groups, and outcome-focused department language throughout.

**Architecture:** Additive changes only — no rebuilds, no new API endpoints, no schema changes. (1) Nav restructure across 3 files sets the default view to Command Center and reorganises groups. (2) Command Center gains an Executive Brief header and enhanced grid. (3) Five drill-down pages receive header/label reframes. All existing functionality is preserved.

**Tech Stack:** Next.js 14, React 18, TypeScript, Zustand, Tailwind CSS, Lucide React icons, Prisma/SQLite

---

## File Map

| File | Change |
|------|--------|
| `store/appStore.ts` | Change default `activeView` from `"dashboard"` to `"company"` |
| `components/layout/Sidebar.tsx` | Full nav group restructure + labels + accentClass per group |
| `components/layout/MobileNav.tsx` | Full nav group restructure + bottom tabs reorder |
| `components/company/CompanyCommandCenter.tsx` | Add Executive Brief header; enhance Section component; restructure grid |
| `components/dashboard/DashboardHome.tsx` | Header: "Founder Mode" label reframe |
| `components/agents/WorkforceView.tsx` | Header + mission statements + outcome descriptions |
| `components/commerce/RevenueView.tsx` | Header + metric label reframe |
| `components/agents/DraftsView.tsx` | Header: "Pending Actions" reframe |
| `components/agents/FounderRequestsView.tsx` | Header: "Founder Command Console" reframe |

---

## Task 1: Set Command Center as Default Landing Page

**Files:**
- Modify: `store/appStore.ts:96`

- [ ] **Step 1: Change the default activeView**

In `store/appStore.ts`, find line 96 (the `activeView` initial value):

```typescript
// Before
  activeView: "dashboard",

// After
  activeView: "company",
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors. The value `"company"` is already in the `activeView` union.

- [ ] **Step 3: Commit**

```bash
git add store/appStore.ts
git commit -m "feat: set Command Center as default landing page"
```

---

## Task 2: Sidebar — Company OS Navigation Structure

**Files:**
- Modify: `components/layout/Sidebar.tsx`

- [ ] **Step 1: Add Lightbulb to imports**

Replace the existing import block at the top of `Sidebar.tsx`:

```typescript
import {
  LayoutDashboard, Inbox, CheckSquare, FolderOpen, Target, Calendar,
  TrendingUp, Users2, Newspaper, Zap, FileText,
  Settings, ChevronLeft, ChevronRight,
  Brain, LogOut, Sparkles, Building2, Lightbulb,
} from "lucide-react";
```

- [ ] **Step 2: Replace navGroups with the new 4-group structure**

Replace the entire `navGroups` constant (the array that starts with `label: "Cockpit"`):

```typescript
const navGroups: {
  label: string;
  accentClass: string;
  items: { id: ViewId; label: string; icon: React.ComponentType<{ className?: string }> }[];
}[] = [
  {
    label: "Cockpit",
    accentClass: "text-[#8b5cf6]",
    items: [
      { id: "dashboard", label: "Founder Mode", icon: LayoutDashboard },
      { id: "briefing",  label: "Briefing",     icon: Newspaper },
      { id: "inbox",     label: "Inbox",         icon: Inbox },
    ],
  },
  {
    label: "Company",
    accentClass: "text-[#00D4FF]",
    items: [
      { id: "company",       label: "Command Center", icon: Building2 },
      { id: "opportunities", label: "Opportunities",  icon: Lightbulb },
      { id: "workforce",     label: "Departments",    icon: Users2 },
      { id: "revenue",       label: "Revenue Health", icon: TrendingUp },
      { id: "drafts",        label: "Pending Actions",icon: FileText },
    ],
  },
  {
    label: "Execution",
    accentClass: "text-[#6366f1]",
    items: [
      { id: "projects", label: "Projects", icon: FolderOpen },
      { id: "goals",    label: "Goals",    icon: Target },
      { id: "tasks",    label: "Tasks",    icon: CheckSquare },
      { id: "calendar", label: "Calendar", icon: Calendar },
    ],
  },
  {
    label: "System",
    accentClass: "text-text-ghost",
    items: [
      { id: "requests",  label: "Requests", icon: Zap },
      { id: "settings",  label: "Settings", icon: Settings },
    ],
  },
];
```

- [ ] **Step 3: Update logo subtitle**

Find the subtitle `"Command Center"` inside the logo `<div>` and change it:

```typescript
// Before
<p className="text-[10px] text-text-ghost mt-0.5">Command Center</p>

// After
<p className="text-[10px] text-text-ghost mt-0.5">Personal AI Command Center</p>
```

- [ ] **Step 4: Use accentClass for group label colour**

Find the group label `<p>` inside `nav`:

```typescript
// Before
<p className="text-[9px] text-text-ghost uppercase tracking-[0.12em] font-medium px-3 mb-2">
  {group.label}
</p>

// After
<p className={cn("text-[9px] uppercase tracking-[0.12em] font-medium px-3 mb-2", group.accentClass)}>
  {group.label}
</p>
```

- [ ] **Step 5: Remove Settings from the footer (it's now a nav item)**

Find the Settings button in the `{/* Settings + Logout */}` footer section and delete only the Settings button block (keep the Logout button):

```typescript
// DELETE this entire button:
<button
  onClick={() => setActiveView("settings")}
  title={sidebarCollapsed ? "Settings" : undefined}
  className={cn(
    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all border",
    sidebarCollapsed && "justify-center px-0",
    activeView === "settings"
      ? "bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/15"
      : "text-text-muted hover:text-text-secondary hover:bg-white/[0.03] border-transparent"
  )}
>
  <Settings className="w-[15px] h-[15px] flex-shrink-0" />
  {!sidebarCollapsed && <span className="font-medium">Settings</span>}
</button>
```

- [ ] **Step 6: Remove the AI Assistant (Sparkles) button**

The `aiPanelOpen` button below the nav should be removed — it's no longer a primary nav item. Delete the entire `{/* AI Assistant */}` section.

Also remove `aiPanelOpen` and `setAiPanelOpen` from the `useAppStore()` destructure in `Sidebar` since they're no longer used.

- [ ] **Step 7: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add components/layout/Sidebar.tsx
git commit -m "feat: restructure sidebar into Company OS nav groups"
```

---

## Task 3: MobileNav — Company OS Navigation

**Files:**
- Modify: `components/layout/MobileNav.tsx`

- [ ] **Step 1: Add Lightbulb to imports**

```typescript
import {
  Menu, X, Brain, Sparkles, LogOut, Settings,
  LayoutDashboard, Inbox, CheckSquare, FolderOpen, Target, Calendar,
  TrendingUp, Users2, MoreHorizontal, Newspaper, Zap, Building2, FileText, Lightbulb,
} from "lucide-react";
```

- [ ] **Step 2: Replace navGroups with the same 4-group structure**

Replace the entire `navGroups` constant:

```typescript
const navGroups: {
  label: string;
  accentClass: string;
  items: { id: ViewId; label: string; icon: React.ComponentType<{ className?: string }> }[];
}[] = [
  {
    label: "Cockpit",
    accentClass: "text-[#8b5cf6]",
    items: [
      { id: "dashboard", label: "Founder Mode", icon: LayoutDashboard },
      { id: "briefing",  label: "Briefing",     icon: Newspaper },
      { id: "inbox",     label: "Inbox",         icon: Inbox },
    ],
  },
  {
    label: "Company",
    accentClass: "text-[#00D4FF]",
    items: [
      { id: "company",       label: "Command Center", icon: Building2 },
      { id: "opportunities", label: "Opportunities",  icon: Lightbulb },
      { id: "workforce",     label: "Departments",    icon: Users2 },
      { id: "revenue",       label: "Revenue Health", icon: TrendingUp },
      { id: "drafts",        label: "Pending Actions",icon: FileText },
    ],
  },
  {
    label: "Execution",
    accentClass: "text-[#6366f1]",
    items: [
      { id: "projects", label: "Projects", icon: FolderOpen },
      { id: "goals",    label: "Goals",    icon: Target },
      { id: "tasks",    label: "Tasks",    icon: CheckSquare },
      { id: "calendar", label: "Calendar", icon: Calendar },
    ],
  },
  {
    label: "System",
    accentClass: "text-text-ghost",
    items: [
      { id: "requests",  label: "Requests", icon: Zap },
      { id: "settings",  label: "Settings", icon: Settings },
    ],
  },
];
```

- [ ] **Step 3: Update drawer group label colours**

In the drawer `<nav>` section, find the group label `<p>`:

```typescript
// Before
<p className="text-[9px] text-text-ghost uppercase tracking-[0.12em] font-medium px-3 mb-2">
  {group.label}
</p>

// After
<p className={cn("text-[9px] uppercase tracking-[0.12em] font-medium px-3 mb-2", group.accentClass)}>
  {group.label}
</p>
```

- [ ] **Step 4: Replace bottom tabs**

Replace the entire `bottomTabs` constant:

```typescript
const bottomTabs: { id: ViewId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "company",   label: "Command", icon: Building2 },
  { id: "dashboard", label: "Founder", icon: LayoutDashboard },
  { id: "inbox",     label: "Inbox",   icon: Inbox },
];
```

- [ ] **Step 5: Remove Settings from drawer footer**

In the drawer footer section, remove the Settings button (it's now in the System nav group). Keep only the AI Assistant toggle button and Logout button, or remove the AI Assistant button too if the Sidebar step removed it.

Find and delete this button from the drawer footer:
```typescript
<button
  onClick={() => navigate("settings")}
  // ... (the settings button in MobileNav drawer footer)
>
  <Settings className="w-[15px] h-[15px] flex-shrink-0" />
  <span className="font-medium">Settings</span>
</button>
```

- [ ] **Step 6: Update mobile top bar subtitle**

Find `"Command Center"` in the mobile top bar and change it:

```typescript
// Before
<p className="text-[9px] text-text-ghost leading-none mt-0.5">Command Center</p>

// After
<p className="text-[9px] text-text-ghost leading-none mt-0.5">Company OS</p>
```

- [ ] **Step 7: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add components/layout/MobileNav.tsx
git commit -m "feat: restructure mobile nav into Company OS groups"
```

---

## Task 4: Command Center — Executive Brief Header

**Files:**
- Modify: `components/company/CompanyCommandCenter.tsx`

This task adds the Executive Brief header zone above the existing grid. It adds two new pieces of state (`awayMinutes`, `wfData`) and a new section of JSX. The grid itself is unchanged in this task.

- [ ] **Step 1: Add useAppStore import**

At the top of `CompanyCommandCenter.tsx`, add the store import:

```typescript
import { useAppStore } from "@/store/appStore";
```

- [ ] **Step 2: Add workforce performance type**

Add this interface below the existing `Goal` interface (around line 14):

```typescript
interface WfTeamPerf {
  teamId: string;
  teamName: string;
  departmentType: string;
  completedThisWeek: number;
  outputsThisWeek: number;
}
```

- [ ] **Step 3: Add state and effects inside CompanyCommandCenter**

Inside `CompanyCommandCenter()`, after the existing state declarations (after line 79), add:

```typescript
const { setActiveView } = useAppStore();
const [awayMinutes, setAwayMinutes] = useState(0);
const [wfTeams, setWfTeams] = useState<WfTeamPerf[]>([]);

// Track last visit time and compute away duration
useEffect(() => {
  const key = "mios_last_visit";
  const prev = localStorage.getItem(key);
  if (prev) {
    setAwayMinutes(Math.floor((Date.now() - parseInt(prev, 10)) / 60000));
  }
  localStorage.setItem(key, String(Date.now()));
}, []);

// Fetch workforce outcomes for the brief
useEffect(() => {
  fetch("/api/executive/workforce")
    .then(r => r.json())
    .then(d => { if (d?.teams) setWfTeams(d.teams); })
    .catch(() => {});
}, []);
```

- [ ] **Step 4: Add helper functions**

Add these two helpers near the existing `fmt` helper (around line 48):

```typescript
function fmtAway(minutes: number): string {
  if (minutes < 2)    return "just now";
  if (minutes < 60)   return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60 > 0 ? `${minutes % 60}m` : ""}`.trim();
  return `${Math.floor(minutes / 1440)}d`;
}

function getBriefGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
```

- [ ] **Step 5: Build the brief bullet data**

Add this derived data block inside the component, just before the `return` statement (after the `refresh` function):

```typescript
const briefDate = new Date().toLocaleDateString("en-GB", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});

// Auto-generate "since your last visit" bullets from existing API data
const briefBullets: { color: string; text: string; view: typeof activeViewPlaceholder | null; cta: string }[] = [];
type NavView = Parameters<typeof setActiveView>[0];
const bullets: { color: string; text: string; view: NavView | null; cta: string }[] = [];
if (data) {
  if (data.opportunities.recentCount > 0) {
    bullets.push({
      color: "bg-[#6366f1]",
      text: `Research discovered ${data.opportunities.recentCount} new opportunit${data.opportunities.recentCount === 1 ? "y" : "ies"}`,
      view: "opportunities",
      cta: "View →",
    });
  }
  if (data.approvals.pendingCount > 0) {
    bullets.push({
      color: "bg-accent-amber",
      text: `${data.approvals.pendingCount} approval${data.approvals.pendingCount === 1 ? "" : "s"} waiting for your decision`,
      view: "drafts",
      cta: "Review →",
    });
  }
  if (data.artifactsThisWeek > 0) {
    bullets.push({
      color: "bg-accent-green",
      text: `${data.artifactsThisWeek} artifact${data.artifactsThisWeek === 1 ? "" : "s"} created this week`,
      view: null,
      cta: "",
    });
  }
  if (data.blocked.totalIssues > 0 && bullets.length < 3) {
    bullets.push({
      color: "bg-accent-red",
      text: `${data.blocked.totalIssues} item${data.blocked.totalIssues === 1 ? "" : "s"} blocked or stalled`,
      view: "projects",
      cta: "View →",
    });
  }
}

// Intelligence strip data from existing API response
const biggestOpp = data?.opportunities.recent.slice().sort((a, b) => b.score - a.score)[0] ?? null;
const biggestRisk = data?.blocked.blockedProjects[0] ?? data?.blocked.stalledOpportunities[0] ?? null;
const topAction   = data?.topROIAction ?? null;
```

Note: the `activeViewPlaceholder` type trick isn't needed — replace the bullets array type directly. The correct version is:

```typescript
const bullets: { color: string; text: string; view: Parameters<typeof setActiveView>[0] | null; cta: string }[] = [];
```

- [ ] **Step 6: Insert Executive Brief header JSX**

Inside the `return`, immediately after the opening `<div className="h-full overflow-y-auto px-4 py-6 md:px-8">` and before the existing `{/* Header */}` div, insert:

```tsx
{/* ── EXECUTIVE BRIEF ─────────────────────────────────────────── */}
{data && (
  <div className="mb-6 rounded-xl overflow-hidden border border-[#00D4FF]/10"
    style={{
      background: "linear-gradient(135deg, rgba(0,212,255,0.07) 0%, rgba(99,102,241,0.04) 50%, rgba(16,185,129,0.03) 100%)",
    }}
  >
    {/* Top row: greeting + meta */}
    <div className="flex items-start justify-between px-6 pt-5 pb-3">
      <div>
        <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] mb-1.5">Command Center</p>
        <h2 className="text-[20px] font-semibold text-text-primary tracking-tight">{getBriefGreeting()}</h2>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[10px] text-text-ghost uppercase tracking-[0.07em]">{briefDate}</p>
        {awayMinutes > 1 && (
          <p className="text-[11px] text-text-ghost mt-1">
            Away for <span className="text-text-secondary font-medium">{fmtAway(awayMinutes)}</span>
          </p>
        )}
      </div>
    </div>

    {/* Since your last visit bullets */}
    {bullets.length > 0 && (
      <div className="px-6 pb-4 space-y-2">
        {bullets.map((b, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${b.color}`} />
            <p className="text-[12px] text-text-secondary flex-1">{b.text}</p>
            {b.view && (
              <button
                onClick={() => setActiveView(b.view!)}
                className="text-[10px] text-text-ghost hover:text-text-secondary border border-white/[0.07] hover:border-white/[0.12] px-2 py-0.5 rounded transition-all flex-shrink-0"
              >
                {b.cta}
              </button>
            )}
          </div>
        ))}
      </div>
    )}
    {bullets.length === 0 && (
      <div className="px-6 pb-4">
        <p className="text-[12px] text-text-ghost">All systems running. No events since your last visit.</p>
      </div>
    )}

    {/* Intelligence strip */}
    <div className="grid grid-cols-3 gap-px border-t border-white/[0.06]">
      {/* Biggest Opportunity */}
      <div className="px-5 py-3 bg-[rgba(16,185,129,0.03)]">
        <p className="text-[8.5px] uppercase tracking-[0.1em] text-accent-green font-semibold mb-1.5">Biggest Opportunity</p>
        {biggestOpp ? (
          <>
            <p className="text-[11px] text-text-primary font-medium leading-snug">{biggestOpp.title}</p>
            <p className="text-[10px] text-text-ghost mt-0.5">Score {biggestOpp.score}/10 · {biggestOpp.status}</p>
          </>
        ) : (
          <p className="text-[11px] text-text-ghost">No active opportunities</p>
        )}
      </div>

      {/* Biggest Risk */}
      <div className="px-5 py-3 bg-[rgba(239,68,68,0.03)] border-x border-white/[0.05]">
        <p className="text-[8.5px] uppercase tracking-[0.1em] text-accent-red font-semibold mb-1.5">Biggest Risk</p>
        {biggestRisk ? (
          <>
            <p className="text-[11px] text-text-primary font-medium leading-snug">
              {"name" in biggestRisk ? biggestRisk.name : biggestRisk.title}
            </p>
            <p className="text-[10px] text-text-ghost mt-0.5">
              {"blocker" in biggestRisk && biggestRisk.blocker ? biggestRisk.blocker : "Stalled — needs attention"}
            </p>
          </>
        ) : (
          <p className="text-[11px] text-accent-green text-[11px]">No active blockers</p>
        )}
      </div>

      {/* Recommended Action */}
      <div className="px-5 py-3 bg-[rgba(0,212,255,0.03)]">
        <p className="text-[8.5px] uppercase tracking-[0.1em] text-[#00D4FF] font-semibold mb-1.5">Recommended Action</p>
        {topAction ? (
          <>
            <p className="text-[11px] text-text-primary font-medium leading-snug">{topAction.title}</p>
            <p className="text-[10px] text-text-ghost mt-0.5">{topAction.recommendation?.slice(0, 60) ?? `Est. ${fmt(topAction.roi)}/mo`}</p>
          </>
        ) : (
          <p className="text-[11px] text-text-ghost">No recommendation available</p>
        )}
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 7: Typecheck**

```bash
npx tsc --noEmit
```

Fix any type errors. Common ones: `b.view` might be `null` — the `b.view!` non-null assertion in `setActiveView(b.view!)` is guarded by `{b.view && ...}` so it's safe, but TypeScript may still complain. If so, change to `setActiveView(b.view as Parameters<typeof setActiveView>[0])`.

- [ ] **Step 8: Commit**

```bash
git add components/company/CompanyCommandCenter.tsx
git commit -m "feat: add Executive Brief header to Command Center"
```

---

## Task 5: Command Center — Grid Enhancements

**Files:**
- Modify: `components/company/CompanyCommandCenter.tsx`

This task (a) adds "View →" links to every Section, (b) relabels Revenue metrics, (c) adds a Departments outcome section, (d) restructures the 3-column grid to include Departments and improve Needs Decision emphasis.

- [ ] **Step 1: Update the Section component**

Replace the existing `Section` function (lines 54–64):

```typescript
function Section({
  title, icon: Icon, children, className = "", onLink, linkLabel,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
  onLink?: () => void;
  linkLabel?: string;
}) {
  return (
    <div className={`bg-surface-1 border border-white/[0.06] rounded-xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-accent-cyan opacity-70" />
          <h2 className="text-xs font-semibold text-text-ghost uppercase tracking-widest">{title}</h2>
        </div>
        {onLink && (
          <button
            onClick={onLink}
            className="text-[10px] text-text-ghost hover:text-text-secondary border border-white/[0.06] hover:border-white/[0.1] px-2 py-0.5 rounded-md transition-all"
          >
            {linkLabel ?? "View →"}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Add a Departments outcome helper**

Add this function near the other helpers (below `fmt`):

```typescript
function describeTeamOutcome(departmentType: string, outputs: number, completed: number): string {
  const n = outputs > 0 ? outputs : completed;
  if (n === 0) return "No activity this week";
  const w = outputs > 0 ? "output" : "task";
  if (departmentType === "research")    return `${n} research ${w}${n === 1 ? "" : "s"} this week`;
  if (departmentType === "sales")       return `${n} prospect${n === 1 ? "" : "s"} qualified`;
  if (departmentType === "marketing")   return `${n} campaign${n === 1 ? "" : "s"} prepared`;
  if (departmentType === "content")     return `${n} content piece${n === 1 ? "" : "s"}`;
  if (departmentType === "development") return `${n} deliverable${n === 1 ? "" : "s"}`;
  if (departmentType === "commerce")    return `${n} opportunit${n === 1 ? "y" : "ies"} validated`;
  return `${n} ${w}${n === 1 ? "" : "s"} this week`;
}
```

- [ ] **Step 3: Restructure the grid**

Replace the entire `<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">` block (lines 160–357) with the new 6-section grid:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

  {/* ── REVENUE ─────────────────────────────────────────────── */}
  <Section
    title="Revenue"
    icon={TrendingUp}
    onLink={() => setActiveView("revenue")}
    linkLabel="Revenue Health →"
  >
    <div className="grid grid-cols-2 gap-4 mb-4">
      <Metric
        label="Live Revenue"
        value={fmt(revenue.mrr)}
        sub={revenue.potential > 0 ? `${fmt(revenue.potential)} potential` : "No live revenue yet"}
      />
      <Metric
        label="Pipeline"
        value={revenue.total > 0 ? fmt(revenue.total) : "—"}
        sub={revenue.arr > 0 ? `${fmt(revenue.arr)} ARR` : "Building pipeline"}
      />
    </div>
    {revenue.entries.slice(0, 3).map((e, i) => (
      <div key={i} className="flex items-center justify-between py-2 border-t border-white/[0.04] text-sm">
        <span className="text-text-secondary truncate max-w-[60%]">{e.title}</span>
        <span className="text-text-primary font-medium">{fmt(e.amount)}</span>
      </div>
    ))}
    {revenue.entries.length === 0 && (
      <p className="text-text-ghost text-xs text-center py-2">No revenue entries yet</p>
    )}
  </Section>

  {/* ── OPPORTUNITIES ───────────────────────────────────────── */}
  <Section
    title="Opportunities"
    icon={Lightbulb}
    onLink={() => setActiveView("opportunities")}
    linkLabel="View all →"
  >
    <div className="flex items-center gap-4 mb-4">
      <Metric label="Active" value={String(opportunities.totalActive)} />
      <Metric label="This week" value={String(opportunities.recentCount)} sub="new" />
    </div>
    <div className="flex flex-wrap gap-1.5 mb-4">
      {Object.entries(opportunities.funnel).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([status, count]) => (
        <span key={status} className={`text-[10px] px-2 py-0.5 rounded-full border border-white/[0.08] ${STATUS_COLORS[status] ?? "text-text-ghost"}`}>
          {count} {status}
        </span>
      ))}
    </div>
    {opportunities.recent.slice(0, 3).map(opp => (
      <div key={opp.id} className="flex items-start justify-between gap-2 py-1.5 border-t border-white/[0.04]">
        <p className="text-sm text-text-secondary truncate">{opp.title}</p>
        <span className={`text-[10px] font-medium flex-shrink-0 ${STATUS_COLORS[opp.status] ?? "text-text-ghost"}`}>
          {opp.score}/10
        </span>
      </div>
    ))}
    {opportunities.recent.length === 0 && (
      <p className="text-text-ghost text-xs text-center py-2">Research team discovering opportunities</p>
    )}
  </Section>

  {/* ── NEEDS DECISION (amber-tinted — visually dominant) ───── */}
  <Section
    title="Needs Decision"
    icon={Shield}
    className="bg-accent-amber/[0.03] border-accent-amber/20"
    onLink={() => setActiveView("drafts")}
    linkLabel="Pending Actions →"
  >
    {approvals.pendingCount > 0 ? (
      <>
        <div className="text-[36px] font-bold text-accent-amber leading-none mb-4">{approvals.pendingCount}</div>
        <div className="space-y-2">
          {approvals.pending.slice(0, 4).map(a => (
            <div key={a.id} className="py-2 border-t border-accent-amber/10">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-text-secondary truncate">{a.title}</p>
                <span className={`text-[10px] flex-shrink-0 font-medium ${
                  a.priority === "urgent" ? "text-accent-red" :
                  a.priority === "high"   ? "text-accent-amber" : "text-text-ghost"
                }`}>{a.priority}</span>
              </div>
              {a.sourceTeam?.name && (
                <p className="text-[10px] text-text-ghost mt-0.5">{a.sourceTeam.name}</p>
              )}
            </div>
          ))}
        </div>
        {approvals.pendingCount > 4 && (
          <p className="text-[10px] text-text-ghost text-center pt-2 border-t border-accent-amber/10">
            +{approvals.pendingCount - 4} more
          </p>
        )}
      </>
    ) : (
      <div className="flex items-center gap-3 py-2">
        <CheckCircle2 className="w-4 h-4 text-accent-green flex-shrink-0" />
        <div>
          <p className="text-sm text-text-primary font-medium">All clear</p>
          <p className="text-xs text-text-ghost">No decisions waiting</p>
        </div>
      </div>
    )}
  </Section>

  {/* ── DEPARTMENTS ─────────────────────────────────────────── */}
  <Section
    title="Departments"
    icon={Users2}
    onLink={() => setActiveView("workforce")}
    linkLabel="View Departments →"
  >
    {wfTeams.length > 0 ? (
      <div className="space-y-0">
        {wfTeams
          .filter(t => t.completedThisWeek > 0 || t.outputsThisWeek > 0)
          .slice(0, 5)
          .map(t => (
            <div key={t.teamId} className="flex items-center gap-2.5 py-2 border-t border-white/[0.04]">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                t.outputsThisWeek > 0 ? "bg-accent-green" : "bg-text-ghost/40"
              }`} />
              <span className="text-[12px] text-text-secondary font-medium w-20 flex-shrink-0 truncate">{t.teamName}</span>
              <span className="text-[11px] text-text-ghost truncate">
                {describeTeamOutcome(t.departmentType, t.outputsThisWeek, t.completedThisWeek)}
              </span>
            </div>
          ))}
        {wfTeams.filter(t => t.completedThisWeek === 0 && t.outputsThisWeek === 0).length > 0 && (
          <div className="pt-2 border-t border-white/[0.04]">
            <p className="text-[10px] text-text-ghost">
              {wfTeams.filter(t => t.completedThisWeek === 0 && t.outputsThisWeek === 0).length} department{wfTeams.filter(t => t.completedThisWeek === 0 && t.outputsThisWeek === 0).length > 1 ? "s" : ""} idle this week
            </p>
          </div>
        )}
      </div>
    ) : (
      <p className="text-text-ghost text-xs text-center py-3">Loading department data...</p>
    )}
  </Section>

  {/* ── PROJECTS ────────────────────────────────────────────── */}
  <Section
    title="Projects"
    icon={BarChart3}
    onLink={() => setActiveView("projects")}
    linkLabel="View Projects →"
  >
    {projects.active.slice(0, 4).map(p => (
      <div key={p.id} className="py-2 border-t border-white/[0.04]">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-sm text-text-secondary truncate max-w-[70%]">{p.name}</span>
          <div className="flex items-center gap-1.5">
            {p.revenueImpact && p.revenueImpact > 0 && (
              <span className="text-[10px] text-accent-green">{fmt(p.revenueImpact)}</span>
            )}
            {p.autoCreated && (
              <span className="text-[9px] text-accent-cyan/60 border border-accent-cyan/20 rounded px-1">auto</span>
            )}
          </div>
        </div>
        {p.nextAction && (
          <p className="text-[10px] text-text-ghost truncate">{p.nextAction}</p>
        )}
      </div>
    ))}
    {projects.active.length === 0 && (
      <p className="text-text-ghost text-xs text-center py-2">No active projects</p>
    )}
    {blocked.blockedProjects.length > 0 && (
      <div className="mt-2 pt-2 border-t border-white/[0.04]">
        <p className="text-[10px] text-accent-red flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {blocked.blockedProjects.length} project{blocked.blockedProjects.length > 1 ? "s" : ""} blocked
        </p>
      </div>
    )}
  </Section>

  {/* ── INTELLIGENCE (green-tinted, no link) ────────────────── */}
  <Section
    title="Intelligence"
    icon={Zap}
    className="bg-accent-green/[0.02] border-accent-green/15"
  >
    {topROIAction ? (
      <div className="mb-3">
        <p className="text-[9px] text-accent-green uppercase tracking-wider font-semibold mb-1">Highest ROI Action</p>
        <p className="text-sm font-medium text-text-primary">{topROIAction.title}</p>
        <p className="text-xs text-text-ghost mt-0.5">{OPP_TYPE_LABELS[topROIAction.opportunityType] ?? topROIAction.opportunityType} · {fmt(topROIAction.roi)}/mo</p>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-accent-green rounded-full" style={{ width: `${topROIAction.allocationPct}%` }} />
          </div>
          <span className="text-[9px] text-accent-green font-medium">{topROIAction.allocationPct}% effort</span>
        </div>
        <p className="text-[10px] text-text-ghost mt-1">{topROIAction.recommendation}</p>
      </div>
    ) : (
      <p className="text-text-ghost text-xs mb-3">Building allocation plan...</p>
    )}

    {goals.length > 0 && (
      <div className="border-t border-white/[0.04] pt-3">
        <p className="text-[9px] text-text-ghost uppercase tracking-wider font-semibold mb-2">Active Goals</p>
        {goals.slice(0, 2).map(g => (
          <div key={g.id} className="mb-2">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs text-text-secondary truncate max-w-[75%]">{g.title}</span>
              <span className="text-[10px] text-text-ghost">{g.progress ?? 0}%</span>
            </div>
            <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-accent-violet rounded-full" style={{ width: `${g.progress ?? 0}%` }} />
            </div>
          </div>
        ))}
      </div>
    )}
  </Section>

</div>
```

- [ ] **Step 4: Remove the old alerts row and existing Blocked/Approvals sections**

The existing `{/* Alerts row */}` block and the separate Blocked and Approvals sections that were in Column 3 are now replaced by the grid above. Delete them if they remain.

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```

Fix any errors. Common: `Users2` may need importing if not already present. Check that all icon imports are present: `Users2`, `AlertTriangle`, `BarChart3`, `CheckCircle2`, `Shield`, `Lightbulb`, `TrendingUp`, `Zap`, `Clock`, `Target` — all should already be in the existing import block.

- [ ] **Step 6: Commit**

```bash
git add components/company/CompanyCommandCenter.tsx
git commit -m "feat: enhance Command Center grid with View links, Departments section, and Needs Decision emphasis"
```

---

## Task 6: Dashboard → Founder Mode Header

**Files:**
- Modify: `components/dashboard/DashboardHome.tsx:404-413`

- [ ] **Step 1: Update the hero section header**

Find the hero section (around line 403–413):

```tsx
// Before
<p className="text-[11px] text-text-ghost font-medium tracking-[0.12em] uppercase mb-3">
  {today} · {currentTime}
</p>
<h1 className="text-[36px] md:text-[48px] font-semibold text-text-primary tracking-tight leading-[1.1] mb-4">
  {getGreeting()}, <span className="text-[#00D4FF]">Mio</span>
</h1>
```

```tsx
// After
<p className="text-[11px] text-text-ghost font-medium tracking-[0.12em] uppercase mb-3">
  Founder Mode · {today} · {currentTime}
</p>
<h1 className="text-[36px] md:text-[48px] font-semibold text-text-primary tracking-tight leading-[1.1] mb-4">
  {getGreeting()}, <span className="text-[#00D4FF]">Mio</span>
</h1>
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/DashboardHome.tsx
git commit -m "feat: reframe Dashboard as Founder Mode personal layer"
```

---

## Task 7: Workforce → Departments Page Reframe

**Files:**
- Modify: `components/agents/WorkforceView.tsx`

- [ ] **Step 1: Update the page header**

Find the header block (lines 197–225):

```tsx
// Before
<p className="text-[11px] text-text-ghost font-medium tracking-[0.12em] uppercase mb-2">
  AI Workforce
</p>
<h1 className="text-[32px] md:text-[40px] font-semibold text-text-primary tracking-tight leading-tight mb-2">
  Your AI Departments
</h1>
```

```tsx
// After
<p className="text-[11px] text-text-ghost font-medium tracking-[0.12em] uppercase mb-2">
  Company
</p>
<h1 className="text-[32px] md:text-[40px] font-semibold text-text-primary tracking-tight leading-tight mb-2">
  Departments
</h1>
```

- [ ] **Step 2: Update the subtitle**

Find the subtitle paragraph (just below the h1):

```tsx
// Before
<p className="text-[15px] text-text-secondary">
  {loading
    ? "Loading workforce…"
    : teams.length > 0
    ? `${teams.filter(t => t.status === "active").length} department${...} active.`
    : activeAgents > 0
    ? `${activeAgents} agent${...} configured.`
    : "Set up your first agent to activate a department."}
  ...
</p>

// After — replace just the non-loading non-pending text:
<p className="text-[15px] text-text-secondary">
  {loading
    ? "Loading departments…"
    : `${DEPARTMENTS.length} departments · ${teams.filter(t => t.status === "active").length} active`}
  {!loading && pendingApprovals > 0 && (
    <>
      {" · "}
      <button
        onClick={() => setActiveView("inbox")}
        className="text-accent-amber hover:opacity-80 transition-opacity"
      >
        {pendingApprovals} approval{pendingApprovals !== 1 ? "s" : ""} waiting
      </button>
    </>
  )}
</p>
```

- [ ] **Step 3: Add mission statements to the DEPARTMENTS constant**

Replace the `description` field in the `DEPARTMENTS` constant with mission-statement phrasing. Update each object's `label` (remove "Team") and `description`:

```typescript
const DEPARTMENTS = [
  {
    id: "commerce",
    label: "Commerce",
    types: ["digital_commerce", "fulfillment"],
    icon: ShoppingBag,
    color: "#10b981",
    description: "Sources and validates product and service opportunities.",
  },
  {
    id: "research",
    label: "Research",
    types: ["research"],
    icon: Search,
    color: "#6366f1",
    description: "Discovers opportunities, markets and business ideas.",
  },
  {
    id: "sales",
    label: "Sales",
    types: ["sales", "lead_generation", "outreach"],
    icon: UserCheck,
    color: "#00D4FF",
    description: "Converts validated opportunities into customers.",
  },
  {
    id: "marketing",
    label: "Marketing",
    types: ["ads"],
    icon: Megaphone,
    color: "#f59e0b",
    description: "Creates demand and market awareness.",
  },
  {
    id: "content",
    label: "Content",
    types: ["content", "writing"],
    icon: FileText,
    color: "#8b5cf6",
    description: "Produces assets that support growth.",
  },
  {
    id: "operations",
    label: "Operations",
    types: ["strategy", "project_management", "custom"],
    icon: Settings2,
    color: "#94a3b8",
    description: "Delivers and improves execution.",
  },
  {
    id: "support",
    label: "Support",
    types: ["support"],
    icon: Headphones,
    color: "#06b6d4",
    description: "Resolves issues and improves customer experience.",
  },
  {
    id: "development",
    label: "Development",
    types: ["development", "dev", "engineering"],
    icon: Code2,
    color: "#a78bfa",
    description: "Builds products, automations and solutions.",
  },
  {
    id: "executive",
    label: "Executive",
    types: ["ceo"],
    icon: Crown,
    color: "#fbbf24",
    description: "Allocates capital, priorities and attention.",
  },
] as const;
```

- [ ] **Step 4: Add outcome description helper**

Add this function below the existing `describeOutcome` function (around line 99):

```typescript
function describeOutputOutcome(deptId: string, outputs: WorkforceOutput[]): string {
  const recent = outputs.filter(o => {
    return Date.now() - new Date(o.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
  });
  const n = recent.length;
  if (n === 0) return "No outputs this week";
  if (deptId === "research")    return `${n} research output${n === 1 ? "" : "s"} this week`;
  if (deptId === "sales")       return `${n} prospect${n === 1 ? "" : "s"} qualified this week`;
  if (deptId === "marketing")   return `${n} campaign${n === 1 ? "" : "s"} prepared this week`;
  if (deptId === "content")     return `${n} content piece${n === 1 ? "" : "s"} this week`;
  if (deptId === "development") return `${n} deliverable${n === 1 ? "" : "s"} this week`;
  if (deptId === "commerce")    return `${n} opportunit${n === 1 ? "y" : "ies"} validated this week`;
  return `${n} output${n === 1 ? "" : "s"} this week`;
}
```

- [ ] **Step 5: Update department card content display**

Inside the department card rendering (the block that shows `latestOutput`), replace the output display area with the outcome description. Find the area that renders `latestOutput` in the card and update it:

```tsx
// The "latest output" row in the department card — replace with outcome description
{team && (team.outputs ?? []).length > 0 ? (
  <div className="mt-3">
    <p className="text-[12px] text-text-secondary">
      {describeOutputOutcome(dept.id, (team.outputs ?? []) as WorkforceOutput[])}
    </p>
  </div>
) : lastRun ? (
  <div className="mt-3 flex items-center gap-2">
    <div className={cn(
      "w-1.5 h-1.5 rounded-full flex-shrink-0",
      lastRun.status === "completed" ? "bg-accent-green" :
      lastRun.status === "running"   ? "bg-[#00D4FF] animate-pulse-slow" :
      lastRun.status === "failed"    ? "bg-accent-red" : "bg-text-ghost"
    )} />
    <p className="text-[12px] text-text-secondary flex-1">
      {describeOutcome(lastRun.status, dept.id)}
    </p>
    <span className="text-[11px] text-text-ghost flex-shrink-0">
      {fmtTime(lastRun.completedAt ?? lastRun.startedAt ?? lastRun.createdAt)}
    </span>
  </div>
) : null}
```

- [ ] **Step 6: Update Workforce Performance footer**

Find "Manage individual agents" footer (around line 996) and update it:

```tsx
// Before
<p className="text-[13px] text-text-secondary font-medium">Manage individual agents</p>
<p className="text-[11px] text-text-muted mt-0.5">
  {agents.length} configured · {totalRuns} total runs
</p>

// After
<p className="text-[13px] text-text-secondary font-medium">Agent Registry</p>
<p className="text-[11px] text-text-muted mt-0.5">
  {agents.length} agent{agents.length !== 1 ? "s" : ""} configured
</p>
```

- [ ] **Step 7: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add components/agents/WorkforceView.tsx
git commit -m "feat: reframe Workforce as Departments with mission statements and outcome language"
```

---

## Task 8: Revenue → Revenue Health

**Files:**
- Modify: `components/commerce/RevenueView.tsx:114-150`

- [ ] **Step 1: Update page header**

Find the header block (lines 114–122):

```tsx
// Before
<p className="text-[11px] text-text-ghost font-medium tracking-[0.12em] uppercase mb-2">
  Revenue
</p>
<h1 className="text-[32px] md:text-[40px] font-semibold text-text-primary tracking-tight leading-tight">
  Revenue
</h1>

// After
<p className="text-[11px] text-text-ghost font-medium tracking-[0.12em] uppercase mb-2">
  Company
</p>
<h1 className="text-[32px] md:text-[40px] font-semibold text-text-primary tracking-tight leading-tight">
  Revenue Health
</h1>
```

- [ ] **Step 2: Update KPI card labels**

Find the four `<RevenueCard>` usages (lines 126–150) and update their `label` props:

```tsx
// Before
<RevenueCard label="Live MRR" ... />
<RevenueCard label="Pipeline" ... />
<RevenueCard label="Potential" ... />
<RevenueCard label="Entries" ... />

// After
<RevenueCard label="Live Revenue" ... />
<RevenueCard label="Pipeline Revenue" ... />
<RevenueCard label="Potential Revenue" ... />
<RevenueCard label="Sources" ... />
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/commerce/RevenueView.tsx
git commit -m "feat: reframe Revenue as Revenue Health with business-outcome labels"
```

---

## Task 9: Drafts → Pending Actions

**Files:**
- Modify: `components/agents/DraftsView.tsx:165-176`

- [ ] **Step 1: Update page header**

Find the header block (lines 165–176):

```tsx
// Before
<p className="text-[11px] text-text-ghost font-medium tracking-[0.12em] uppercase mb-2">Business</p>
<div className="flex items-start justify-between gap-4">
  <div>
    <h1 className="text-[32px] md:text-[38px] font-semibold text-text-primary tracking-tight leading-tight">
      Draft Center
    </h1>
    <p className="text-[12px] text-text-muted mt-1">
      Everything MioOS has prepared for your review
    </p>
  </div>

// After
<p className="text-[11px] text-text-ghost font-medium tracking-[0.12em] uppercase mb-2">Company</p>
<div className="flex items-start justify-between gap-4">
  <div>
    <h1 className="text-[32px] md:text-[38px] font-semibold text-text-primary tracking-tight leading-tight">
      Pending Actions
    </h1>
    <p className="text-[12px] text-text-muted mt-1">
      Decisions waiting for you
    </p>
  </div>
```

- [ ] **Step 2: Update search placeholder**

Find `placeholder="Search drafts…"` and change to `placeholder="Search pending actions…"`.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/agents/DraftsView.tsx
git commit -m "feat: reframe Draft Center as Pending Actions"
```

---

## Task 10: Requests → Founder Command Console

**Files:**
- Modify: `components/agents/FounderRequestsView.tsx:217-234`

- [ ] **Step 1: Update page header**

Find the header block (lines 217–234):

```tsx
// Before
<p className="text-[11px] text-text-ghost font-medium tracking-[0.12em] uppercase mb-2">
  AI Workforce
</p>
<h1 className="text-[32px] md:text-[40px] font-semibold text-text-primary tracking-tight leading-tight mb-2">
  Founder Requests
</h1>
<p className="text-[15px] text-text-secondary leading-relaxed">
  Type what you need. Your AI workforce handles the rest.
</p>

// After
<p className="text-[11px] text-text-ghost font-medium tracking-[0.12em] uppercase mb-2">
  System
</p>
<h1 className="text-[32px] md:text-[40px] font-semibold text-text-primary tracking-tight leading-tight mb-2">
  What do you want the company to do?
</h1>
<p className="text-[15px] text-text-secondary leading-relaxed">
  Your request is routed to the right department and executed.
</p>
```

- [ ] **Step 2: Update the example requests**

Find the `EXAMPLE_REQUESTS` constant (lines 71–80) and replace with business-outcome-focused prompts:

```typescript
const EXAMPLE_REQUESTS = [
  "Find automation opportunities in logistics",
  "Generate leads for Mail Co-Pilot",
  "Research AI opportunities in insurance",
  "Build an ecommerce business around pet products",
  "Draft outreach sequence for B2B prospects in the Netherlands",
  "Analyze competitors of Mail Co-Pilot",
  "Create a content plan for LinkedIn for the next 30 days",
  "Research white-label opportunities for AI tools",
];
```

- [ ] **Step 3: Find where examples are rendered and verify they are chips**

Search for `EXAMPLE_REQUESTS` usage further down in the component (it uses `useExample(ex)` to prefill the input). If the examples are already rendered as clickable chips, they will pick up the new text automatically. If they are not rendered at all, add this block just above the textarea:

```tsx
{/* Example prompt chips */}
<div className="flex flex-wrap gap-2 mb-5">
  {EXAMPLE_REQUESTS.slice(0, 5).map(ex => (
    <button
      key={ex}
      onClick={() => useExample(ex)}
      className="text-[11px] text-text-ghost hover:text-text-secondary border border-white/[0.07] hover:border-white/[0.12] px-3 py-1.5 rounded-xl transition-all hover:bg-white/[0.02]"
    >
      {ex}
    </button>
  ))}
</div>
```

Place this just before `{/* Command box */}` (the `<div className="rounded-2xl border bg-[#0d1220]...">` that contains the textarea).

- [ ] **Step 4: Update the "no teams" button target**

Find `setActiveView("workforce")` inside the no-teams empty state and update to the new label context (no code change needed — the view ID is the same, but update the button text):

```tsx
// Before
Set up Workforce

// After
Set up Departments
```

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add components/agents/FounderRequestsView.tsx
git commit -m "feat: reframe Requests as Founder Command Console"
```

---

## Task 11: Final Verification

**Files:** None (read-only verification)

- [ ] **Step 1: Full typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected: Build completes successfully. Zero type errors in build output.

- [ ] **Step 3: Smoke test checklist**

Start dev server (`npm run dev`) and verify:

1. App opens to **Command Center** (not Dashboard)
2. Sidebar shows 4 groups: Cockpit (purple), Company (cyan), Execution (violet), System (ghost)
3. "Company" group contains: Command Center, Opportunities, Departments, Revenue Health, Pending Actions
4. "Execution" group contains: Projects, Goals, Tasks, Calendar
5. "System" group contains: Requests, Settings
6. Settings opens correctly from the nav (not a footer button)
7. Executive Brief header shows date, "away for" duration, bullets, intelligence strip
8. Each grid section has a "View →" link that navigates to the correct page
9. "Needs Decision" section is amber-tinted and shows approval count
10. Departments page header reads "Departments" (not "AI Workforce")
11. Revenue page header reads "Revenue Health" with "Live Revenue / Pipeline Revenue / Potential Revenue" labels
12. Drafts page header reads "Pending Actions" with subtitle "Decisions waiting for you"
13. Requests page header reads "What do you want the company to do?"
14. Dashboard still accessible from Cockpit group as "Founder Mode"
15. Mobile bottom tabs show: Command, Founder, Inbox, ⋯ More

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: Phase 12 — Company OS UI refactor complete

- Command Center is now the default landing page
- 4-group nav: Cockpit / Company / Execution / System
- Executive Brief header with since-last-visit intelligence
- Departments page with mission statements and outcome language
- Revenue Health with Live/Pipeline/Potential labels
- Pending Actions (was Draft Center)
- Founder Command Console (was Requests)
- Founder Mode label on Dashboard personal layer
- All sections link to corresponding drill-down pages"
```
