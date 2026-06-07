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
export type AgentType = "strategy" | "research" | "lead_generation" | "outreach" | "project_management" | "custom" | "digital_commerce" | "ads" | "sales" | "fulfillment" | "ceo";
export type AgentRunStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ScheduleFrequency = "daily" | "weekly" | "monthly" | "manual";

export type AuthorityLevel = "coordinate" | "delegate" | "research" | "review" | "observe";

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
  role: string | null;
  mission: string | null;
  successMetric: string | null;
  authorityLevel: AuthorityLevel | null;
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

export type MemoryType = "short_term" | "long_term" | "fact" | "decision" | "pattern" | "preference" | "lesson" | "risk" | "opportunity";

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

// ── Phase 2.1: Commerce Autopilot ───────────────────────────────

export type OpportunityType =
  | "ai_product" | "digital_product" | "affiliate" | "reseller" | "plr"
  | "dropshipping" | "productized_service" | "ads_campaign" | "lead_generation";

export type OpportunityStatus =
  | "discovered" | "validating" | "approved" | "rejected" | "testing" | "live" | "archived";

export interface CommerceOpportunity {
  id: string;
  title: string;
  opportunityType: OpportunityType;
  targetCustomer: string | null;
  painPoint: string | null;
  offer: string | null;
  estimatedRevenue: number | null;
  estimatedMargin: number | null;
  buildEffort: string;
  salesDifficulty: string;
  fulfillmentDifficulty: string;
  riskLevel: string;
  status: OpportunityStatus;
  source: string | null;
  notes: string | null;
  createdByAgentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ProspectStatus = "discovered" | "qualified" | "rejected" | "converted_to_lead" | "archived";

export interface Prospect {
  id: string;
  companyName: string;
  contactName: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  website: string | null;
  industry: string | null;
  country: string | null;
  companySize: string | null;
  fitScore: number | null;
  painPointHypothesis: string | null;
  suggestedOffer: string | null;
  source: string | null;
  status: ProspectStatus;
  createdByAgentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CampaignChannel =
  | "linkedin" | "email" | "google_ads" | "meta_ads"
  | "instagram" | "facebook" | "retargeting" | "landing_page";

export type CampaignStatus =
  | "draft" | "pending_approval" | "approved" | "rejected"
  | "ready_to_launch" | "launched_manually" | "archived";

export interface CampaignDraft {
  id: string;
  name: string;
  channel: CampaignChannel;
  goal: string | null;
  targetAudience: string | null;
  offer: string | null;
  hook: string | null;
  adCopy: string | null;
  outreachMessage: string | null;
  landingPageAngle: string | null;
  cta: string | null;
  suggestedBudget: number | null;
  expectedObjection: string | null;
  successMetric: string | null;
  status: CampaignStatus;
  createdByAgentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PaymentProvider = "stripe" | "gumroad" | "shopify" | "manual";
export type DeliveryType =
  | "email_delivery" | "download_link" | "license_key"
  | "affiliate_redirect" | "manual_delivery" | "onboarding_call";
export type FulfillmentStatus = "draft" | "approved" | "active" | "archived";

export interface FulfillmentFlow {
  id: string;
  name: string;
  productName: string;
  paymentProvider: PaymentProvider;
  deliveryType: DeliveryType;
  confirmationEmailTemplate: string | null;
  invoiceRequired: boolean;
  deliveryEmailTemplate: string | null;
  followUpEmailTemplate: string | null;
  supportInstructions: string | null;
  status: FulfillmentStatus;
  createdByAgentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ConnectorProvider =
  | "linkedin" | "gmail" | "outlook" | "stripe" | "meta_ads"
  | "google_ads" | "shopify" | "gumroad" | "web_search" | "browser";

export type ConnectorStatus = "planned" | "configured" | "connected" | "disconnected" | "error" | "disabled";

export interface Connector {
  id: string;
  name: string;
  provider: ConnectorProvider;
  status: ConnectorStatus;
  requiresApproval: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Phase 2.0: Intelligence Quality Layer ──────────────────────────

export type MemoryClass =
  | "fact" | "decision" | "preference" | "pattern"
  | "lesson" | "risk" | "opportunity" | "observation";

export type InsightType = "risk" | "opportunity" | "efficiency" | "revenue" | "execution";
export type InsightStatus = "active" | "dismissed";
export type PatternType = "blocker" | "overdue" | "approval_delay" | "revenue_risk" | "operational_risk";
export type PatternStatus = "pending" | "approved" | "rejected" | "dismissed";

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  summary: string;
  confidence: number;
  importance: number;
  agentId: string | null;
  runId: string | null;
  status: InsightStatus;
  createdAt: string;
}

export interface PatternRecord {
  id: string;
  patternType: PatternType;
  title: string;
  description: string;
  occurrences: number;
  agentId: string | null;
  runId: string | null;
  status: PatternStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutiveBriefing {
  id: string;
  summary: string;
  risks: string;
  opportunities: string;
  actions: string;
  patterns: string | null;
  insights: string | null;
  agentId: string | null;
  runId: string | null;
  createdAt: string;
}

export interface IntelligenceOverview {
  latestBriefing: ExecutiveBriefing | null;
  topRisks: Insight[];
  topOpportunities: Insight[];
  recentPatterns: PatternRecord[];
  recentInsights: Insight[];
  insightCount: number;
  pendingPatternCount: number;
  activeResearch: number;
  completedResearch: number;
  latestEmailInsight: EmailInsight | null;
  latestCalendarInsight: CalendarInsight | null;
}

// ── Phase 1.9: Execution Layer ───────────────────────────────────

export type ExecutionStatus = "pending" | "executed" | "failed";
export type WorkflowExecutionStatus = "pending" | "executed" | "failed" | "blocked";
export type ScheduleExecutionStatus = "success" | "failed" | "skipped";
export type ToolExecutionStatus = "pending" | "success" | "failed";
export type MemorySuggestionStatus = "pending" | "approved" | "rejected";
export type SystemLogSourceType = "agent" | "workflow" | "schedule" | "tool" | "approval" | "system";

export interface SystemConfig {
  key: string;
  value: string;
  updatedAt: string;
}
export type SuggestionMemoryType = "fact" | "decision" | "pattern" | "warning" | "lesson" | "preference" | "risk" | "opportunity";

export interface ExecutionHistoryRecord {
  id: string;
  approvalId: string;
  agentId: string;
  actionType: string;
  actionPayload: string;
  status: ExecutionStatus;
  error: string | null;
  executedAt: string | null;
  createdAt: string;
}

export interface WorkflowExecutionRecord {
  id: string;
  workflowId: string;
  sourceAgentId: string;
  targetAgentId: string;
  triggerType: string;
  status: WorkflowExecutionStatus;
  reason: string | null;
  createdAt: string;
  executedAt: string | null;
}

export interface ScheduleExecutionRecord {
  id: string;
  scheduleId: string;
  agentId: string;
  status: ScheduleExecutionStatus;
  reason: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ToolExecutionRecord {
  id: string;
  toolId: string;
  agentId: string;
  input: string | null;
  output: string | null;
  status: ToolExecutionStatus;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface MemorySuggestion {
  id: string;
  agentId: string;
  runId: string;
  memoryType: SuggestionMemoryType;
  title: string;
  content: string;
  importance: number;
  status: MemorySuggestionStatus;
  createdAt: string;
}

export interface SystemExecutionLog {
  id: string;
  sourceType: SystemLogSourceType;
  sourceId: string;
  event: string;
  details: string | null;
  createdAt: string;
}

export interface ExecutionOverview {
  pendingExecutions: number;
  executedToday: number;
  failedToday: number;
  workflowTriggersToday: number;
  scheduleRunsToday: number;
  memorySuggestionsPending: number;
}

// ── Phase 2.1A: Multi-Agent Communication Foundation ─────────────

export type MessagePriority = "low" | "medium" | "high" | "critical";
export type MessageStatus = "unread" | "read" | "archived";
export type DelegationStatus = "pending" | "accepted" | "running" | "completed" | "failed" | "cancelled";
export type WorkspaceType = "strategy" | "revenue" | "opportunity" | "research" | "operations" | "project" | "custom";
export type WorkspaceStatus = "active" | "paused" | "completed" | "archived";
export type WorkspaceMemberRole = "executive" | "researcher" | "validator" | "planner" | "reviewer" | "observer";
export type WorkspaceActivityType = "message" | "delegation" | "memory" | "execution" | "approval";

export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  subject: string;
  content: string;
  context: string | null;
  priority: MessagePriority;
  status: MessageStatus;
  createdAt: string;
  readAt: string | null;
}

export interface AgentDelegation {
  id: string;
  assignedByAgentId: string;
  assignedToAgentId: string;
  objective: string;
  inputContext: string | null;
  expectedOutput: string | null;
  status: DelegationStatus;
  result: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface AgentWorkspaceMember {
  id: string;
  workspaceId: string;
  agentId: string;
  role: WorkspaceMemberRole;
  createdAt: string;
  agent?: Pick<Agent, "id" | "name" | "slug" | "role" | "authorityLevel">;
}

export interface WorkspaceActivity {
  id: string;
  workspaceId: string;
  activityType: WorkspaceActivityType;
  sourceId: string | null;
  summary: string;
  createdAt: string;
}

export interface AgentWorkspace {
  id: string;
  name: string;
  description: string | null;
  workspaceType: WorkspaceType;
  status: WorkspaceStatus;
  createdAt: string;
  updatedAt: string;
  members?: AgentWorkspaceMember[];
  activities?: WorkspaceActivity[];
}

// ── Phase 2.3 — Executive Loop, Agent Goals & Scorecards ─────────

export type GoalType = "revenue" | "opportunity" | "execution" | "research" | "operations" | "knowledge" | "support" | "custom";
export type GoalPeriod = "daily" | "weekly" | "monthly" | "quarterly" | "ongoing";
export type AgentGoalStatus = "active" | "paused" | "completed" | "failed" | "archived";

export interface AgentGoal {
  id: string;
  agentId: string;
  title: string;
  description: string | null;
  goalType: GoalType;
  targetMetric: string | null;
  targetValue: number | null;
  currentValue: number;
  period: GoalPeriod;
  status: AgentGoalStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  agent?: Pick<Agent, "id" | "name" | "slug">;
}

export type LoopTriggerType = "manual" | "scheduled" | "goal_review" | "briefing" | "system";
export type LoopRunStatus = "running" | "completed" | "failed";

export interface ExecutiveLoopRun {
  id: string;
  triggerType: LoopTriggerType;
  status: LoopRunStatus;
  summary: string | null;
  decisions: string | null;
  createdDelegations: number;
  createdMessages: number;
  createdWorkspaces: number;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}

export type ReviewRequestStatus = "pending" | "in_review" | "approved" | "rejected" | "needs_changes";

export interface AgentReviewRequest {
  id: string;
  requestedByAgentId: string;
  reviewerAgentId: string;
  workspaceId: string | null;
  delegationId: string | null;
  subject: string;
  content: string;
  context: string | null;
  status: ReviewRequestStatus;
  reviewResult: string | null;
  reviewNotes: string | null;
  createdAt: string;
  completedAt: string | null;
  requestedByAgent?: Pick<Agent, "id" | "name">;
  reviewerAgent?: Pick<Agent, "id" | "name">;
}

export interface AgentScorecard {
  id: string;
  agentId: string;
  periodStart: string;
  periodEnd: string;
  runsCompleted: number;
  runsFailed: number;
  delegationsAssigned: number;
  delegationsCompleted: number;
  delegationsFailed: number;
  messagesSent: number;
  reviewsCompleted: number;
  approvalsCreated: number;
  approvalsApproved: number;
  approvalsRejected: number;
  memoriesCreated: number;
  insightsGenerated: number;
  usefulnessScore: number;
  reliabilityScore: number;
  executionScore: number;
  qualityScore: number;
  overallScore: number;
  summary: string | null;
  createdAt: string;
  agent?: Pick<Agent, "id" | "name" | "slug" | "role">;
}

export interface ExecutiveLoopOverview {
  activeGoals: AgentGoal[];
  latestRun: ExecutiveLoopRun | null;
  recentRuns: ExecutiveLoopRun[];
  openDelegations: number;
  pendingReviews: number;
  topAgent: AgentScorecard | null;
  weakestAgent: AgentScorecard | null;
}

export interface AgentTeamOverview {
  activeWorkspaces: number;
  activeDelegations: number;
  unreadMessages: number;
  pendingResearch: number;
  completedDelegationsToday: number;
}

// ── Phase 2.4A — Intelligence Connectors & External Awareness ────

export type SearchResearchStatus = "pending" | "completed" | "failed";
export type ResearchPriority = "low" | "medium" | "high" | "critical";
export type ResearchStatus = "pending" | "running" | "completed" | "failed";
export interface SearchResearch {
  id: string;
  query: string;
  requestedByAgentId: string | null;
  workspaceId: string | null;
  status: SearchResearchStatus;
  summary: string | null;
  sources: string | null;
  resultsCount: number;
  createdAt: string;
  completedAt: string | null;
}

export interface EmailInsight {
  id: string;
  agentId: string | null;
  emailCount: number;
  unreadCount: number;
  importantCount: number;
  summary: string | null;
  createdAt: string;
}

export interface CalendarInsight {
  id: string;
  agentId: string | null;
  todayEvents: number;
  upcomingEvents: number;
  nextDeadline: string | null;
  summary: string | null;
  createdAt: string;
}

export interface ResearchRequest {
  id: string;
  requestedByAgentId: string | null;
  workspaceId: string | null;
  title: string;
  objective: string;
  priority: ResearchPriority;
  status: ResearchStatus;
  resultSummary: string | null;
  createdAt: string;
  completedAt: string | null;
  results?: ResearchResult[];
  requestedByAgent?: Pick<Agent, "id" | "name"> | null;
}

export interface ResearchResult {
  id: string;
  requestId: string;
  summary: string;
  findings: string;
  risks: string | null;
  opportunities: string | null;
  recommendations: string | null;
  confidenceScore: number;
  createdAt: string;
}

export interface ConnectorRegistryItem {
  id: string;
  name: string;
  provider: string;
  status: ConnectorStatus;
  requiresApproval: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectorStatusInfo {
  connected: boolean;
  message: string;
}
