"use client";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import {
  LayoutDashboard,
  GitBranch,
  FolderOpen,
  CheckSquare,
  Target,
  FileText,
  Users,
  Settings,
  Brain,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  Inbox,
  Package,
  GitMerge,
  Server,
  LifeBuoy,
  Bot,
  Activity,
  ShieldCheck,
  Calendar,
  Cpu,
  Database,
  Wrench,
  Network,
  FileEdit,
  FileBarChart,
  HeartPulse,
  LogOut,
} from "lucide-react";

async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

const personalNavItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "graph", label: "Brain Graph", icon: GitBranch },
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "goals", label: "Goals", icon: Target },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "capture", label: "Capture", icon: Inbox },
  { id: "people", label: "People", icon: Users },
] as const;

const businessNavItems = [
  { id: "products", label: "Products", icon: Package },
  { id: "leads", label: "Leads", icon: Users },
  { id: "pipeline", label: "Pipeline", icon: GitMerge },
  { id: "deployments", label: "Deployments", icon: Server },
  { id: "support", label: "Support", icon: LifeBuoy },
] as const;

const agentNavItems = [
  { id: "agent-dashboard",      label: "Dashboard",     icon: Cpu },
  { id: "agent-fleet",          label: "Fleet Health",  icon: HeartPulse },
  { id: "agent-registry",       label: "Agents",        icon: Bot },
  { id: "strategic-briefing",   label: "Briefing",      icon: FileBarChart },
  { id: "agent-runs",           label: "Run History",   icon: Activity },
  { id: "approvals",        label: "Approvals",      icon: ShieldCheck },
  { id: "agent-schedules",  label: "Schedules",      icon: Calendar },
  { id: "agent-memory",     label: "Memory",         icon: Database },
  { id: "agent-tools",      label: "Tools",          icon: Wrench },
  { id: "agent-workflows",  label: "Workflows",      icon: Network },
  { id: "prompt-editor",    label: "Prompt Editor",  icon: FileEdit },
] as const;

export function Sidebar() {
  const { activeView, setActiveView, sidebarCollapsed, setSidebarCollapsed, aiPanelOpen, setAiPanelOpen } = useAppStore();

  return (
    <aside
      className={cn(
        "flex flex-col h-full border-r border-white/[0.06] bg-surface-1 transition-all duration-300 relative z-20",
        sidebarCollapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]",
        sidebarCollapsed && "justify-center px-0"
      )}>
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-purple to-accent-violet flex items-center justify-center shadow-glow">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div className="absolute inset-0 rounded-lg bg-accent-purple/20 blur-md -z-10" />
        </div>
        {!sidebarCollapsed && (
          <div>
            <h1 className="text-sm font-semibold text-text-primary tracking-wide">MioOS</h1>
            <p className="text-[10px] text-text-muted">Business OS</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {/* Personal OS group */}
        {!sidebarCollapsed && (
          <p className="text-[9px] text-text-ghost uppercase tracking-widest font-medium px-3 mb-1.5">Personal OS</p>
        )}
        <div className="space-y-0.5 mb-3">
          {personalNavItems.map(({ id, label, icon: Icon }) => {
            const active = activeView === id;
            return (
              <button
                key={id}
                onClick={() => setActiveView(id as typeof activeView)}
                title={sidebarCollapsed ? label : undefined}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group",
                  sidebarCollapsed && "justify-center px-0",
                  active
                    ? "bg-accent-purple/15 text-accent-purple border border-accent-purple/20"
                    : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04]"
                )}
              >
                <Icon className={cn("w-4 h-4 flex-shrink-0 transition-colors", active ? "text-accent-purple" : "group-hover:text-text-primary")} />
                {!sidebarCollapsed && <span className="font-medium">{label}</span>}
                {active && !sidebarCollapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-purple" />
                )}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.06] mx-2 mb-3" />

        {/* Business OS group */}
        {!sidebarCollapsed && (
          <p className="text-[9px] text-text-ghost uppercase tracking-widest font-medium px-3 mb-1.5">Business OS</p>
        )}
        <div className="space-y-0.5 mb-3">
          {businessNavItems.map(({ id, label, icon: Icon }) => {
            const active = activeView === id;
            return (
              <button
                key={id}
                onClick={() => setActiveView(id as typeof activeView)}
                title={sidebarCollapsed ? label : undefined}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group",
                  sidebarCollapsed && "justify-center px-0",
                  active
                    ? "bg-accent-violet/15 text-accent-violet border border-accent-violet/20"
                    : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04]"
                )}
              >
                <Icon className={cn("w-4 h-4 flex-shrink-0 transition-colors", active ? "text-accent-violet" : "group-hover:text-text-primary")} />
                {!sidebarCollapsed && <span className="font-medium">{label}</span>}
                {active && !sidebarCollapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-violet" />
                )}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.06] mx-2 mb-3" />

        {/* Agent OS group */}
        {!sidebarCollapsed && (
          <p className="text-[9px] text-text-ghost uppercase tracking-widest font-medium px-3 mb-1.5">Agent OS</p>
        )}
        <div className="space-y-0.5">
          {agentNavItems.map(({ id, label, icon: Icon }) => {
            const active = activeView === id;
            return (
              <button
                key={id}
                onClick={() => setActiveView(id as typeof activeView)}
                title={sidebarCollapsed ? label : undefined}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group",
                  sidebarCollapsed && "justify-center px-0",
                  active
                    ? "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/20"
                    : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04]"
                )}
              >
                <Icon className={cn("w-4 h-4 flex-shrink-0 transition-colors", active ? "text-accent-cyan" : "group-hover:text-text-primary")} />
                {!sidebarCollapsed && <span className="font-medium">{label}</span>}
                {active && !sidebarCollapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-cyan" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* AI Button */}
      <div className="px-2 pb-2">
        <button
          onClick={() => setAiPanelOpen(!aiPanelOpen)}
          title={sidebarCollapsed ? "AI Assistant" : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group",
            sidebarCollapsed && "justify-center px-0",
            aiPanelOpen
              ? "bg-accent-violet/15 text-accent-violet border border-accent-violet/20"
              : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04]"
          )}
        >
          <Sparkles className={cn("w-4 h-4 flex-shrink-0", aiPanelOpen && "text-accent-violet")} />
          {!sidebarCollapsed && <span className="font-medium">AI Assistant</span>}
          {aiPanelOpen && !sidebarCollapsed && (
            <div className="ml-auto flex items-center gap-1">
              <Zap className="w-3 h-3 text-accent-violet" />
            </div>
          )}
        </button>
      </div>

      {/* Settings + Logout */}
      <div className="px-2 pb-3 border-t border-white/[0.06] pt-2 space-y-0.5">
        <button
          title={sidebarCollapsed ? "Settings" : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-all",
            sidebarCollapsed && "justify-center px-0"
          )}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!sidebarCollapsed && <span className="font-medium">Settings</span>}
        </button>
        <button
          onClick={logout}
          title={sidebarCollapsed ? "Sign out" : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-muted hover:text-accent-red hover:bg-accent-red/[0.06] transition-all",
            sidebarCollapsed && "justify-center px-0"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!sidebarCollapsed && <span className="font-medium">Sign out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-surface-3 border border-white/[0.08] flex items-center justify-center text-text-muted hover:text-text-primary transition-colors shadow-card z-30"
      >
        {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
