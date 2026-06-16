"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { RightPanel } from "@/components/layout/RightPanel";
import { AIPanel } from "@/components/layout/AIPanel";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { BriefingView } from "@/components/dashboard/BriefingView";
import { TasksView } from "@/components/tasks/TasksView";
import { GoalsView } from "@/components/goals/GoalsView";
import { ProjectsView } from "@/components/dashboard/ProjectsView";
import { OpportunitiesView } from "@/components/commerce/OpportunitiesView";
import { ProspectsView } from "@/components/commerce/ProspectsView";
import { CampaignDraftsView } from "@/components/commerce/CampaignDraftsView";
import { AgentOverviewView } from "@/components/agents/AgentOverviewView";
import { AgentRegistry } from "@/components/agents/AgentRegistry";
import { ActivityView } from "@/components/agents/ActivityView";
import { AutomationView as OperationsView } from "@/components/agents/AutomationView";
import { WorkforceView } from "@/components/agents/WorkforceView";
import { FounderRequestsView } from "@/components/agents/FounderRequestsView";
import { RevenueView } from "@/components/commerce/RevenueView";
import { CalendarView } from "@/components/dashboard/CalendarView";
import { SettingsView } from "@/components/settings/SettingsView";
import { CompanyCommandCenter } from "@/components/company/CompanyCommandCenter";
import { DraftsView } from "@/components/agents/DraftsView";
import { TodayView } from "@/components/today/TodayView";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

export default function Home() {
  const { activeView, selectedNode, aiPanelOpen, toast } = useAppStore();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070B14]">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col h-full flex-shrink-0">
        <Sidebar />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        <MobileNav />
        <div
          className="absolute inset-0 opacity-[0.15] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,212,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.02) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* extra bottom padding on mobile for the tab bar */}
        <div className="relative z-10 flex-1 overflow-hidden pb-[60px] md:pb-0">
          {/* MioOS 2.0 Today */}
          {activeView === "today"      && <ErrorBoundary label="Today"><TodayView /></ErrorBoundary>}
          {/* V3 destinations — stub routes (dedicated views in Tasks 8–10) */}
          {activeView === "decide" && <ErrorBoundary label="Decide"><DraftsView /></ErrorBoundary>}
          {activeView === "life"   && <ErrorBoundary label="Life"><CalendarView /></ErrorBoundary>}
          {activeView === "teams"  && <ErrorBoundary label="Teams"><WorkforceView /></ErrorBoundary>}
          {/* Primary navigation */}
          {activeView === "dashboard"  && <ErrorBoundary label="Dashboard"><DashboardHome /></ErrorBoundary>}
          {activeView === "briefing"   && <ErrorBoundary label="Briefing"><BriefingView /></ErrorBoundary>}
          {activeView === "inbox"      && <ErrorBoundary label="Inbox"><ActivityView /></ErrorBoundary>}
          {activeView === "tasks"      && <ErrorBoundary label="Tasks"><TasksView /></ErrorBoundary>}
          {activeView === "projects"   && <ErrorBoundary label="Projects"><ProjectsView /></ErrorBoundary>}
          {activeView === "goals"      && <ErrorBoundary label="Goals"><GoalsView /></ErrorBoundary>}
          {activeView === "calendar"   && <ErrorBoundary label="Calendar"><CalendarView /></ErrorBoundary>}
          {activeView === "revenue"    && <ErrorBoundary label="Revenue"><RevenueView /></ErrorBoundary>}
          {activeView === "company"    && <ErrorBoundary label="Company"><CompanyCommandCenter /></ErrorBoundary>}
          {activeView === "workforce"  && <ErrorBoundary label="Workforce"><WorkforceView /></ErrorBoundary>}
          {activeView === "requests"   && <ErrorBoundary label="Requests"><FounderRequestsView /></ErrorBoundary>}
          {activeView === "drafts"     && <ErrorBoundary label="Drafts"><DraftsView /></ErrorBoundary>}
          {activeView === "settings"   && <ErrorBoundary label="Settings"><SettingsView /></ErrorBoundary>}
          {/* Legacy views — still routable from within primary views */}
          {activeView === "activity"       && <ErrorBoundary label="Activity"><ActivityView /></ErrorBoundary>}
          {activeView === "agent-overview" && <ErrorBoundary label="Agent Overview"><AgentOverviewView /></ErrorBoundary>}
          {activeView === "agents"         && <ErrorBoundary label="Agents"><AgentRegistry /></ErrorBoundary>}
          {activeView === "operations"     && <ErrorBoundary label="Operations"><OperationsView /></ErrorBoundary>}
          {activeView === "opportunities"  && <ErrorBoundary label="Opportunities"><OpportunitiesView /></ErrorBoundary>}
          {activeView === "prospects"      && <ErrorBoundary label="Prospects"><ProspectsView /></ErrorBoundary>}
          {activeView === "campaigns"      && <ErrorBoundary label="Campaigns"><CampaignDraftsView /></ErrorBoundary>}
        </div>
      </main>

      <div className="flex">
        {selectedNode && <ErrorBoundary label="Right Panel"><RightPanel /></ErrorBoundary>}
        {aiPanelOpen && <AIPanel />}
      </div>

      {toast && (
        <div
          className={cn(
            "fixed bottom-20 md:bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium animate-fade-in",
            toast.type === "success"
              ? "bg-surface-2 border-accent-green/30 text-text-primary"
              : "bg-surface-2 border-accent-red/30 text-text-primary"
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-accent-green flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-accent-red flex-shrink-0" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}
