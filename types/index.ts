export type NodeType =
  | "project"
  | "idea"
  | "task"
  | "goal"
  | "note"
  | "person"
  | "workflow"
  | "decision"
  | "problem"
  | "roadmap"
  | "system";

export type NodeStatus = "inbox" | "active" | "blocked" | "done" | "archived";
export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "blocked" | "done" | "cancelled";
export type GoalStatus = "active" | "achieved" | "abandoned" | "paused";

export interface MioNode {
  id: string;
  label: string;
  type: NodeType;
  status: NodeStatus;
  description?: string | null;
  content?: string | null;
  priority?: Priority | null;
  color?: string | null;
  icon?: string | null;
  posX: number;
  posY: number;
  createdAt: string;
  updatedAt: string;
  tasks?: MioTask[];
  goals?: MioGoal[];
  notes?: MioNote[];
  checklists?: ChecklistItem[];
}

export interface MioEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string | null;
  type: string;
  animated: boolean;
  createdAt: string;
}

export interface MioTask {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string | null;
  completedAt?: string | null;
  nodeId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MioGoal {
  id: string;
  title: string;
  description?: string | null;
  status: GoalStatus;
  progress: number;
  targetDate?: string | null;
  nodeId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MioNote {
  id: string;
  title: string;
  content: string;
  tags?: string | null;
  nodeId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string | null;
  order: number;
  nodeId?: string | null;
  taskId?: string | null;
  createdAt: string;
}

export interface AIConversation {
  id: string;
  title?: string | null;
  nodeId?: string | null;
  createdAt: string;
  updatedAt: string;
  messages: AIMessage[];
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export type CaptureSource = "chatgpt" | "claude" | "manual" | "whatsapp" | "email" | "meeting" | "other";
export type CaptureType = "note" | "task" | "idea" | "decision" | "bug" | "roadmap" | "goal" | "project_update" | "sales_note" | "technical_note";
export type CaptureStatus = "inbox" | "processed" | "archived";

export interface MioCapture {
  id: string;
  title: string;
  content: string;
  source: CaptureSource;
  type: CaptureType;
  status: CaptureStatus;
  priority: Priority;
  tags?: string | null;
  nodeId?: string | null;
  convertedToType?: string | null;
  convertedToId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedActionItem {
  text: string;
  approved: boolean;
}

// ============================================================
// AGENT OS TYPES
// ============================================================

export type AgentStatus = "active" | "paused" | "disabled";
export type AgentType = "strategy" | "research" | "lead_generation" | "outreach" | "project_management" | "custom";
export type AgentRunStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ScheduleFrequency = "daily" | "weekly" | "monthly" | "manual";

export interface Agent {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: AgentStatus;
  agentType: AgentType;
  prompt: string | null;
  systemPrompt: string | null;
  scheduleEnabled: boolean;
  scheduleExpression: string | null;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
  runs?: AgentRun[];
  schedule?: AgentSchedule | null;
}

export interface AgentRun {
  id: string;
  agentId: string;
  status: AgentRunStatus;
  inputContext: string | null;
  output: string | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  agent?: Pick<Agent, "id" | "name" | "slug">;
  approvals?: ApprovalQueueItem[];
}

export interface AgentSchedule {
  id: string;
  agentId: string;
  enabled: boolean;
  frequency: ScheduleFrequency;
  timeOfDay: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

export interface ApprovalQueueItem {
  id: string;
  agentRunId: string;
  actionType: string;
  proposedAction: string;
  reason: string | null;
  status: ApprovalStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  agentRun?: AgentRun & { agent?: Pick<Agent, "id" | "name" | "slug"> };
}

export interface ParsedAgentOutput {
  summary: string;
  recommendations: string[];
  insights: string[];
  proposedActions: ParsedProposedAction[];
}

export interface ParsedProposedAction {
  actionType: string;
  description: string;
  reason: string;
  targetEntity?: string;
  targetId?: string | null;
  payload?: Record<string, unknown>;
}

// ── Phase 1.5: Intelligence Foundation ─────────────────────

export type MemoryType = "short_term" | "long_term" | "fact" | "decision" | "pattern";

export interface AgentMemory {
  id: string;
  agentId: string;
  memoryType: MemoryType;
  title: string;
  content: string;
  importance: number;
  createdAt: string;
  updatedAt: string;
  agent?: Pick<Agent, "id" | "name" | "slug">;
}

export interface Tool {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  enabled: boolean;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
  agentTools?: AgentTool[];
}

export interface AgentTool {
  id: string;
  agentId: string;
  toolId: string;
  tool?: Tool;
}

export type WorkflowTrigger = "manual" | "approved_action" | "completed_run";

export interface AgentWorkflow {
  id: string;
  name: string;
  sourceAgentId: string;
  targetAgentId: string;
  triggerType: WorkflowTrigger;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  sourceAgent?: Pick<Agent, "id" | "name" | "slug">;
  targetAgent?: Pick<Agent, "id" | "name" | "slug">;
}

export interface AgentPromptVersion {
  id: string;
  agentId: string;
  version: number;
  systemPrompt: string | null;
  userPromptTemplate: string | null;
  createdAt: string;
  agent?: Pick<Agent, "id" | "name" | "slug">;
}

// ── Phase 1.7: Agent Health & Operational Visibility ────────

export type AgentHealthStatus = "healthy" | "warning" | "offline";
export type ApprovalPressure = "low" | "medium" | "high";

export interface AgentHealthRecord {
  id: string;
  name: string;
  slug: string;
  status: AgentStatus;
  agentType: AgentType;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
  // Health
  healthStatus: AgentHealthStatus;
  // Run stats
  totalRuns: number;
  successCount: number;
  failureCount: number;
  runningCount: number;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  successRate: number;  // 0–100
  failureRate: number;  // 0–100
  // Operational counts
  pendingApprovalCount: number;
  memoryCount: number;
  toolCount: number;
  workflowCount: number;
  // Derived
  approvalPressure: ApprovalPressure;
}

export interface FleetHealthSummary {
  healthy: number;
  warning: number;
  offline: number;
  total: number;
  fleetHealthScore: number;
}
