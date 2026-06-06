"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { QuickCapture } from "@/components/ui/QuickCapture";
import { RightPanel } from "@/components/layout/RightPanel";
import { AIPanel } from "@/components/layout/AIPanel";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { TasksView } from "@/components/tasks/TasksView";
import { GoalsView } from "@/components/goals/GoalsView";
import { NotesView } from "@/components/notes/NotesView";
import { ProjectsView } from "@/components/dashboard/ProjectsView";
import { CaptureView } from "@/components/capture/CaptureView";
import { ProductsView } from "@/components/business/ProductsView";
import { LeadsView } from "@/components/business/LeadsView";
import { PipelineView } from "@/components/business/PipelineView";
import { DeploymentsView } from "@/components/business/DeploymentsView";
import { SupportView } from "@/components/business/SupportView";
import { AgentDashboard } from "@/components/agents/AgentDashboard";
import { AgentRegistry } from "@/components/agents/AgentRegistry";
import { AgentRunsView } from "@/components/agents/AgentRunsView";
import { ApprovalQueueView } from "@/components/agents/ApprovalQueueView";
import { SchedulesView } from "@/components/agents/SchedulesView";
import { AgentMemoryView } from "@/components/agents/AgentMemoryView";
import { AgentToolsView } from "@/components/agents/AgentToolsView";
import { WorkflowsView } from "@/components/agents/WorkflowsView";
import { PromptEditorView } from "@/components/agents/PromptEditorView";
import { StrategicBriefingView } from "@/components/agents/StrategicBriefingView";
import { AgentFleetView } from "@/components/agents/AgentFleetView";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

export default function Home() {
  const { activeView, selectedNode, aiPanelOpen, toast } = useAppStore();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-void">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex flex-col h-full flex-shrink-0">
        <Sidebar />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        <MobileNav />
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10 flex-1 overflow-hidden">
          {activeView === "dashboard" && <ErrorBoundary label="Dashboard"><DashboardHome /></ErrorBoundary>}
          {activeView === "graph" && <ErrorBoundary label="Graph"><GraphCanvas /></ErrorBoundary>}
          {activeView === "projects" && <ErrorBoundary label="Projects"><ProjectsView /></ErrorBoundary>}
          {activeView === "tasks" && <ErrorBoundary label="Tasks"><TasksView /></ErrorBoundary>}
          {activeView === "goals" && <ErrorBoundary label="Goals"><GoalsView /></ErrorBoundary>}
          {activeView === "notes" && <ErrorBoundary label="Notes"><NotesView /></ErrorBoundary>}
          {activeView === "capture" && <ErrorBoundary label="Capture"><CaptureView /></ErrorBoundary>}
          {activeView === "people" && <PeopleView />}
          {activeView === "products" && <ErrorBoundary label="Products"><ProductsView /></ErrorBoundary>}
          {activeView === "leads" && <ErrorBoundary label="Leads"><LeadsView /></ErrorBoundary>}
          {activeView === "pipeline" && <ErrorBoundary label="Pipeline"><PipelineView /></ErrorBoundary>}
          {activeView === "deployments" && <ErrorBoundary label="Deployments"><DeploymentsView /></ErrorBoundary>}
          {activeView === "support" && <ErrorBoundary label="Support"><SupportView /></ErrorBoundary>}
          {activeView === "agent-dashboard" && <ErrorBoundary label="Agent Dashboard"><AgentDashboard /></ErrorBoundary>}
          {activeView === "agent-fleet" && <ErrorBoundary label="Fleet Health"><AgentFleetView /></ErrorBoundary>}
          {activeView === "agent-registry" && <ErrorBoundary label="Agents"><AgentRegistry /></ErrorBoundary>}
          {activeView === "agent-runs" && <ErrorBoundary label="Agent Runs"><AgentRunsView /></ErrorBoundary>}
          {activeView === "approvals" && <ErrorBoundary label="Approvals"><ApprovalQueueView /></ErrorBoundary>}
          {activeView === "agent-schedules" && <ErrorBoundary label="Schedules"><SchedulesView /></ErrorBoundary>}
          {activeView === "agent-memory" && <ErrorBoundary label="Memory"><AgentMemoryView /></ErrorBoundary>}
          {activeView === "agent-tools" && <ErrorBoundary label="Tools"><AgentToolsView /></ErrorBoundary>}
          {activeView === "agent-workflows" && <ErrorBoundary label="Workflows"><WorkflowsView /></ErrorBoundary>}
          {activeView === "prompt-editor" && <ErrorBoundary label="Prompt Editor"><PromptEditorView /></ErrorBoundary>}
          {activeView === "strategic-briefing" && <ErrorBoundary label="Strategic Briefing"><StrategicBriefingView /></ErrorBoundary>}
        </div>
      </main>

      <div className="flex">
        {selectedNode && <ErrorBoundary label="Right Panel"><RightPanel /></ErrorBoundary>}
        {aiPanelOpen && <AIPanel />}
      </div>

      <QuickCapture />

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium animate-fade-in",
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

function PeopleView() {
  return (
    <div className="h-full flex items-center justify-center text-text-muted">
      <div className="text-center">
        <div className="text-4xl mb-4">👥</div>
        <p className="text-sm font-medium text-text-secondary">People & CRM</p>
        <p className="text-xs mt-1">Use the Leads view for business contacts</p>
      </div>
    </div>
  );
}
