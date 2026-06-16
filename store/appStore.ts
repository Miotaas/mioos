import { create } from "zustand";
import { MioNode, MioEdge, MioTask, MioGoal, MioNote, ChecklistItem, MioCapture } from "@/types";

interface Toast {
  message: string;
  type: "success" | "error";
  id: number;
}

interface AppState {
  selectedNode: MioNode | null;
  setSelectedNode: (node: MioNode | null) => void;

  aiPanelOpen: boolean;
  setAiPanelOpen: (open: boolean) => void;

  nodes: MioNode[];
  edges: MioEdge[];
  setNodes: (nodes: MioNode[]) => void;
  setEdges: (edges: MioEdge[]) => void;
  addNode: (node: MioNode) => void;
  updateNode: (node: MioNode) => void;
  removeNode: (id: string) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;

  tasks: MioTask[];
  setTasks: (tasks: MioTask[]) => void;

  goals: MioGoal[];
  setGoals: (goals: MioGoal[]) => void;

  notes: MioNote[];
  setNotes: (notes: MioNote[]) => void;

  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;

  activeView:
    // V4 primary navigation (7 destinations)
    | "command"
    | "revenue"
    | "opportunities"
    | "workforce"
    | "decisions"
    | "life"
    | "settings"
    // V3 legacy — still routable
    | "today" | "decide" | "projects" | "teams"
    // Deep legacy
    | "dashboard" | "briefing" | "inbox" | "tasks" | "goals" | "calendar"
    | "requests" | "company" | "drafts"
    // Internal / agent-level
    | "activity" | "agent-overview" | "agents" | "operations"
    | "prospects" | "campaigns";
  setActiveView: (view: AppState["activeView"]) => void;

  captures: MioCapture[];
  setCaptures: (captures: MioCapture[]) => void;

  toast: Toast | null;
  showToast: (message: string, type?: "success" | "error") => void;

  prefillRequest: string | null;
  setPrefillRequest: (v: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedNode: null,
  setSelectedNode: (node) => set({ selectedNode: node }),

  aiPanelOpen: false,
  setAiPanelOpen: (open) => set({ aiPanelOpen: open }),

  nodes: [],
  edges: [],
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  addNode: (node) => set((s) => ({ nodes: [node, ...s.nodes] })),
  updateNode: (node) => set((s) => ({
    nodes: s.nodes.map((n) => (n.id === node.id ? node : n)),
    selectedNode: s.selectedNode?.id === node.id ? node : s.selectedNode,
  })),
  removeNode: (id) => set((s) => ({
    nodes: s.nodes.filter((n) => n.id !== id),
    selectedNode: s.selectedNode?.id === id ? null : s.selectedNode,
  })),
  updateNodePosition: (id, x, y) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, posX: x, posY: y } : n)),
    })),

  tasks: [],
  setTasks: (tasks) => set({ tasks }),

  goals: [],
  setGoals: (goals) => set({ goals }),

  notes: [],
  setNotes: (notes) => set({ notes }),

  sidebarCollapsed: false,
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

  activeView: "command",
  setActiveView: (view) => set({ activeView: view }),

  captures: [],
  setCaptures: (captures) => set({ captures }),

  toast: null,
  showToast: (message, type = "success") => {
    const id = Date.now();
    set({ toast: { message, type, id } });
    setTimeout(() => set((s) => (s.toast?.id === id ? { toast: null } : {})), 3000);
  },

  prefillRequest: null,
  setPrefillRequest: (v) => set({ prefillRequest: v }),
}));
