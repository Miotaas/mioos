"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import {
  Menu, X, Brain, Sparkles, LogOut,
  Sun, Scale, Users2, Briefcase, Calendar, Settings,
  MoreHorizontal,
} from "lucide-react";

async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

type ViewId = ReturnType<typeof useAppStore.getState>["activeView"];

const navGroups: {
  label: string;
  items: { id: ViewId; label: string; icon: React.ComponentType<{ className?: string }>; accentColor: string }[];
}[] = [
  {
    label: "",
    items: [
      { id: "today",  label: "Today",  icon: Sun,   accentColor: "#F59E0B" },
      { id: "decide", label: "Decide", icon: Scale, accentColor: "#EF4444" },
    ],
  },
  {
    label: "Workforce",
    items: [
      { id: "workforce", label: "Workforce", icon: Users2,    accentColor: "#00D4FF" },
      { id: "projects",  label: "Projects",  icon: Briefcase, accentColor: "#6366f1" },
    ],
  },
  {
    label: "Personal",
    items: [
      { id: "life", label: "Life", icon: Calendar, accentColor: "#8B5CF6" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "settings", label: "Settings", icon: Settings, accentColor: "#6b7280" },
    ],
  },
];

const bottomTabs: { id: ViewId; label: string; icon: React.ComponentType<{ className?: string }>; accentColor: string }[] = [
  { id: "today",     label: "Today",     icon: Sun,    accentColor: "#F59E0B" },
  { id: "workforce", label: "Workforce", icon: Users2, accentColor: "#00D4FF" },
  { id: "decide",    label: "Decide",    icon: Scale,  accentColor: "#EF4444" },
];

export function MobileNav() {
  const { activeView, setActiveView, aiPanelOpen, setAiPanelOpen } = useAppStore();
  const [open, setOpen] = useState(false);

  function navigate(id: ViewId) {
    setActiveView(id);
    setOpen(false);
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex-shrink-0 flex items-center justify-between h-14 px-4 border-b border-white/[0.05] bg-[#0a0f1e] relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-[#00D4FF]" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-text-primary leading-none">MioOS</p>
            <p className="text-[9px] text-text-ghost leading-none mt-0.5">AI Command Center</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-xl bg-surface-1 border border-white/[0.06] text-text-muted hover:text-text-secondary transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/75 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in drawer */}
      <div
        className={cn(
          "md:hidden fixed left-0 top-0 bottom-0 z-[60] w-[280px] bg-[#0a0f1e] border-r border-white/[0.05] flex flex-col transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.05] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 flex items-center justify-center">
              <Brain className="w-4 h-4 text-[#00D4FF]" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-text-primary">MioOS</p>
              <p className="text-[10px] text-text-ghost">AI Command Center</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-text-ghost hover:text-text-muted transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label || "__top__"}>
              {group.label && (
                <p className="text-[9px] uppercase tracking-[0.12em] font-medium px-3 mb-2 text-text-ghost">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ id, label, icon: Icon, accentColor }) => {
                  const active = activeView === id;
                  return (
                    <button
                      key={id}
                      onClick={() => navigate(id)}
                      style={active ? {
                        color: accentColor,
                        backgroundColor: `${accentColor}1A`,
                        borderColor: `${accentColor}26`,
                      } : undefined}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all border",
                        active
                          ? "border-transparent"
                          : "text-text-muted hover:text-text-secondary hover:bg-white/[0.03] border-transparent"
                      )}
                    >
                      <Icon className="w-[15px] h-[15px] flex-shrink-0" />
                      <span className="font-medium">{label}</span>
                      {active && (
                        <div
                          className="ml-auto w-1 h-1 rounded-full opacity-70"
                          style={{ backgroundColor: accentColor }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Drawer footer */}
        <div className="px-2 pb-6 pt-3 border-t border-white/[0.05] space-y-0.5">
          <button
            onClick={() => { setAiPanelOpen(!aiPanelOpen); setOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all border",
              aiPanelOpen
                ? "bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/15"
                : "text-text-muted hover:text-text-secondary hover:bg-white/[0.03] border-transparent"
            )}
          >
            <Sparkles className="w-[15px] h-[15px] flex-shrink-0" />
            <span className="font-medium">AI Assistant</span>
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] border border-transparent text-text-ghost hover:text-accent-red hover:bg-accent-red/[0.05] transition-all"
          >
            <LogOut className="w-[15px] h-[15px] flex-shrink-0" />
            <span className="font-medium">Sign out</span>
          </button>
        </div>
      </div>

      {/* Bottom tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0f1e]/95 backdrop-blur-xl border-t border-white/[0.05] flex items-center safe-area-bottom">
        {bottomTabs.map(({ id, label, icon: Icon, accentColor }) => {
          const active = activeView === id;
          return (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors"
            >
              <span style={{ color: active ? accentColor : undefined }}>
                <Icon className={cn("w-5 h-5 transition-colors", !active && "text-text-ghost")} />
              </span>
              <span
                className={cn("text-[10px] font-medium transition-colors", !active && "text-text-ghost")}
                style={{ color: active ? accentColor : undefined }}
              >
                {label}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setOpen(true)}
          className="flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors"
        >
          <MoreHorizontal className="w-5 h-5 text-text-ghost" />
          <span className="text-[10px] font-medium text-text-ghost">More</span>
        </button>
      </div>
    </>
  );
}
