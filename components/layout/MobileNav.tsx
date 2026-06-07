"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import {
  Menu, X, Brain, Sparkles, LogOut, Settings,
  LayoutDashboard, GitBranch, FolderOpen, CheckSquare, Target,
  FileText, Users, Inbox, Package, GitMerge, Server, LifeBuoy,
  Cpu, HeartPulse, Bot, FileBarChart, Activity, ShieldCheck,
  Calendar, Database, Wrench, Network, FileEdit,
  TrendingUp, Users2, Megaphone, Truck, Plug, Zap,
} from "lucide-react";

async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

const personalNavItems = [
  { id: "dashboard",  label: "Dashboard",   icon: LayoutDashboard },
  { id: "graph",      label: "Brain Graph", icon: GitBranch },
  { id: "projects",   label: "Projects",    icon: FolderOpen },
  { id: "tasks",      label: "Tasks",       icon: CheckSquare },
  { id: "goals",      label: "Goals",       icon: Target },
  { id: "notes",      label: "Notes",       icon: FileText },
  { id: "capture",    label: "Capture",     icon: Inbox },
  { id: "people",     label: "People",      icon: Users },
] as const;

const businessNavItems = [
  { id: "products",    label: "Products",    icon: Package },
  { id: "leads",       label: "Leads",       icon: Users },
  { id: "pipeline",    label: "Pipeline",    icon: GitMerge },
  { id: "deployments", label: "Deployments", icon: Server },
  { id: "support",     label: "Support",     icon: LifeBuoy },
] as const;

const commerceNavItems = [
  { id: "commerce-opportunities", label: "Opportunities",   icon: TrendingUp },
  { id: "commerce-prospects",     label: "Prospects",       icon: Users2 },
  { id: "commerce-campaigns",     label: "Campaign Drafts", icon: Megaphone },
  { id: "commerce-fulfillment",   label: "Fulfillment",     icon: Truck },
  { id: "commerce-connectors",    label: "Connectors",      icon: Plug },
] as const;

const agentNavItems = [
  { id: "agent-dashboard",    label: "Dashboard",     icon: Cpu },
  { id: "agent-fleet",        label: "Fleet Health",  icon: HeartPulse },
  { id: "agent-registry",     label: "Agents",        icon: Bot },
  { id: "agent-team",         label: "Agent Team",    icon: Users2 },
  { id: "executive-loop",     label: "Exec Loop",     icon: Zap },
  { id: "strategic-briefing", label: "Briefing",      icon: FileBarChart },
  { id: "agent-runs",         label: "Run History",   icon: Activity },
  { id: "approvals",          label: "Approvals",     icon: ShieldCheck },
  { id: "agent-schedules",    label: "Schedules",     icon: Calendar },
  { id: "agent-memory",       label: "Memory",        icon: Database },
  { id: "agent-tools",        label: "Tools",         icon: Wrench },
  { id: "agent-workflows",    label: "Workflows",     icon: Network },
  { id: "prompt-editor",      label: "Prompt Editor", icon: FileEdit },
] as const;

type NavItem = { id: string; label: string; icon: React.ComponentType<{ className?: string }> };

const navGroups: {
  label: string;
  items: readonly NavItem[];
  activeClass: string;
}[] = [
  {
    label: "Personal OS",
    items: personalNavItems,
    activeClass: "bg-accent-purple/15 text-accent-purple border-accent-purple/20",
  },
  {
    label: "Business OS",
    items: businessNavItems,
    activeClass: "bg-accent-violet/15 text-accent-violet border-accent-violet/20",
  },
  {
    label: "Commerce Autopilot",
    items: commerceNavItems,
    activeClass: "bg-accent-green/15 text-accent-green border-accent-green/20",
  },
  {
    label: "Agent OS",
    items: agentNavItems,
    activeClass: "bg-accent-cyan/15 text-accent-cyan border-accent-cyan/20",
  },
];

export function MobileNav() {
  const { activeView, setActiveView, aiPanelOpen, setAiPanelOpen } = useAppStore();
  const [open, setOpen] = useState(false);

  function navigate(id: string) {
    setActiveView(id as Parameters<typeof setActiveView>[0]);
    setOpen(false);
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex-shrink-0 flex items-center justify-between h-14 px-4 border-b border-white/[0.06] bg-surface-1 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-purple to-accent-violet flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary leading-none">MioOS</p>
            <p className="text-[9px] text-text-muted leading-none mt-0.5">Founder Cockpit</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2.5 rounded-xl bg-surface-2 border border-white/[0.06] text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in drawer */}
      <div
        className={cn(
          "md:hidden fixed left-0 top-0 bottom-0 z-[60] w-72 bg-surface-1 border-r border-white/[0.06] flex flex-col transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-purple to-accent-violet flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">MioOS</p>
              <p className="text-[10px] text-text-muted">Business OS</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navGroups.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? "mt-4" : ""}>
              {gi > 0 && <div className="h-px bg-white/[0.06] mx-2 mb-4" />}
              <p className="text-[9px] text-text-ghost uppercase tracking-widest font-medium px-3 mb-1.5">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ id, label, icon: Icon }) => {
                  const active = activeView === id;
                  return (
                    <button
                      key={id}
                      onClick={() => navigate(id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all border",
                        active
                          ? group.activeClass
                          : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04] border-transparent"
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium">{label}</span>
                      {active && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="h-px bg-white/[0.06] mx-2 mt-4 mb-4" />
          <div className="space-y-0.5">
            <button
              onClick={() => navigate("settings")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all border",
                activeView === "settings"
                  ? "bg-white/[0.06] text-text-primary border-white/[0.08]"
                  : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04] border-transparent"
              )}
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">Settings</span>
            </button>
            <button
              onClick={() => { setAiPanelOpen(!aiPanelOpen); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all border",
                aiPanelOpen
                  ? "bg-accent-violet/15 text-accent-violet border-accent-violet/20"
                  : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04] border-transparent"
              )}
            >
              <Sparkles className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">AI Assistant</span>
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all border border-transparent text-text-muted hover:text-accent-red hover:bg-accent-red/[0.06]"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">Sign out</span>
            </button>
          </div>
        </nav>
      </div>
    </>
  );
}
