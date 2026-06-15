"use client";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import {
  LayoutDashboard, Inbox, CheckSquare, FolderOpen, Target, Calendar,
  TrendingUp, Users2, Newspaper, Zap, FileText,
  Settings, ChevronLeft, ChevronRight,
  Brain, LogOut, Sparkles, Building2, Lightbulb,
} from "lucide-react";

async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

type ViewId = ReturnType<typeof useAppStore.getState>["activeView"];

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

export function Sidebar() {
  const { activeView, setActiveView, sidebarCollapsed, setSidebarCollapsed, aiPanelOpen, setAiPanelOpen } = useAppStore();

  return (
    <aside
      className={cn(
        "flex flex-col h-full border-r border-white/[0.05] bg-[#0a0f1e] transition-all duration-300 relative z-20",
        sidebarCollapsed ? "w-[60px]" : "w-52"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-white/[0.05]",
        sidebarCollapsed && "justify-center px-0"
      )}>
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00D4FF]/20 to-[#00D4FF]/5 border border-[#00D4FF]/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-[#00D4FF]" />
          </div>
        </div>
        {!sidebarCollapsed && (
          <div>
            <h1 className="text-[13px] font-semibold text-text-primary tracking-wide leading-none">MioOS</h1>
            <p className="text-[10px] text-text-ghost mt-0.5">Personal AI Command Center</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!sidebarCollapsed && (
              <p className={cn("text-[9px] uppercase tracking-[0.12em] font-medium px-3 mb-2", group.accentClass)}>
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ id, label, icon: Icon }) => {
                const active = activeView === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveView(id)}
                    title={sidebarCollapsed ? label : undefined}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-100 group",
                      sidebarCollapsed && "justify-center px-0",
                      active
                        ? "bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/15"
                        : "text-text-muted hover:text-text-secondary hover:bg-white/[0.03] border border-transparent"
                    )}
                  >
                    <Icon className={cn(
                      "w-[15px] h-[15px] flex-shrink-0 transition-colors",
                      active ? "text-[#00D4FF]" : "group-hover:text-text-secondary"
                    )} />
                    {!sidebarCollapsed && (
                      <span className={cn("font-medium", active ? "text-[#00D4FF]" : "")}>{label}</span>
                    )}
                    {active && !sidebarCollapsed && (
                      <div className="ml-auto w-1 h-1 rounded-full bg-[#00D4FF] opacity-70" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* AI Assistant */}
      <div className="px-2 pb-1">
        <button
          onClick={() => setAiPanelOpen(!aiPanelOpen)}
          title={sidebarCollapsed ? "AI Assistant" : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-100 group border",
            sidebarCollapsed && "justify-center px-0",
            aiPanelOpen
              ? "bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/15"
              : "text-text-muted hover:text-text-secondary hover:bg-white/[0.03] border-transparent"
          )}
        >
          <Sparkles className={cn("w-[15px] h-[15px] flex-shrink-0", aiPanelOpen && "text-[#00D4FF]")} />
          {!sidebarCollapsed && <span className="font-medium">AI</span>}
        </button>
      </div>

      {/* Logout */}
      <div className="px-2 pb-4 pt-1 border-t border-white/[0.05] mt-1 space-y-0.5">
        <button
          onClick={logout}
          title={sidebarCollapsed ? "Sign out" : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-text-ghost hover:text-accent-red hover:bg-accent-red/[0.05] transition-all border border-transparent",
            sidebarCollapsed && "justify-center px-0"
          )}
        >
          <LogOut className="w-[15px] h-[15px] flex-shrink-0" />
          {!sidebarCollapsed && <span className="font-medium">Sign out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="absolute -right-3 top-[76px] w-6 h-6 rounded-full bg-[#0a0f1e] border border-white/[0.08] flex items-center justify-center text-text-ghost hover:text-text-muted transition-colors z-30"
      >
        {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
