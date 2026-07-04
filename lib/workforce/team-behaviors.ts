/**
 * Behavior catalogs for the 4 autonomous business units.
 * Each entry defines a team's mission, business model, revenue engine,
 * daily routine, and a rich work-item catalog the autonomous engine cycles
 * through — with lifecycle tags so the engine routes work by opportunity stage.
 */

export type WorkItemLifecycle = "discovery" | "validation" | "execution";

export interface WorkItem {
  title:           string;
  description:     string;
  outputType:      string;
  priority:        "low" | "medium" | "high" | "urgent";
  needsApproval:   boolean;
  approvalTrigger: string;
  lifecycle:       WorkItemLifecycle;
}

export interface TeamBehavior {
  slug:             string;
  name:             string;
  mission:          string;
  businessModel:    string;
  revenueEngine:    string;
  kpis:             string[];
  defaultObjective: string;
  dailyRoutine:     string;
  successMetrics:   string[];
  approvalTriggers: string[];
  stopConditions:   string[];
  cadenceMinutes:   number;
  workItems:        WorkItem[];
}

export const TEAM_BEHAVIORS: TeamBehavior[] = [
  // ── E-commerce ──────────────────────────────────────────────────────
  {
    slug: "ecommerce",
    name: "E-commerce Team",
    mission:
      "Build profitable direct-to-customer businesses through affiliate programs, " +
      "dropshipping, and B2B reseller agreements — no spend or listing without approval.",
    businessModel: "Supplier / POD / Fulfillment Partner → Customer",
    revenueEngine: "Product → Validation → Store → Traffic → Orders → Revenue",
    kpis: [
      "Opportunities validated per week",
      "Products launched",
      "Revenue generated",
      "Gross margin quality (>50%)",
    ],
    defaultObjective: "Find and validate 3 profitable products per week with documented margin analysis.",
    dailyRoutine:
      "1. Research trending product categories. " +
      "2. Validate demand signals and competition. " +
      "3. Identify supplier or affiliate partner. " +
      "4. Calculate margin and break-even. " +
      "5. Prepare product draft for founder review.",
    successMetrics: [
      "Products validated per week (target: 3)",
      "Affiliate programs evaluated (target: 5/week)",
      "Gross margin on validated products (target: >50%)",
      "Product drafts sent to Decide (target: 1/day)",
    ],
    approvalTriggers: ["approve_product", "approve_campaign"],
    stopConditions: [
      "More than 3 pending product approvals",
      "Emergency Stop active",
      "Daily output limit reached",
    ],
    cadenceMinutes: 480,
    workItems: [],
  },

  // ── Automation Sales ─────────────────────────────────────────────────
  {
    slug: "automation-sales",
    name: "Automation Sales Team",
    mission:
      "Generate customers for automation solutions by identifying operational inefficiencies, " +
      "designing tailored systems, and preparing personalised proposals — " +
      "no contact without founder approval.",
    businessModel: "Discovery → Solution Design → Proposal → Customer → Recurring Revenue",
    revenueEngine: "Lead → Qualification → Proposal → Demo → Contract → MRR",
    kpis: [
      "Qualified opportunities per week",
      "Proposals prepared",
      "Customers won",
      "MRR generated",
    ],
    defaultObjective:
      "Qualify 10 Dutch SMB leads per week and prepare 2 proposals for founder review.",
    dailyRoutine:
      "1. Identify companies with manual workflow pain points. " +
      "2. Research company context and decision-maker. " +
      "3. Design automation solution concept. " +
      "4. Draft outreach message or proposal. " +
      "5. Queue for founder approval before any contact.",
    successMetrics: [
      "Qualified leads identified per week (target: 10)",
      "Proposals prepared per week (target: 2)",
      "Outreach drafts created (target: 3/day)",
      "Lead-to-proposal conversion (target: 20%)",
    ],
    approvalTriggers: ["approve_outreach", "approve_proposal"],
    stopConditions: [
      "More than 5 pending outreach approvals",
      "Emergency Stop active",
      "Daily output limit reached",
    ],
    cadenceMinutes: 360,
    workItems: [],
  },

  // ── YouTube ──────────────────────────────────────────────────────────
  {
    slug: "youtube",
    name: "YouTube Automation Team",
    mission:
      "Build and scale content businesses that generate passive income through " +
      "advertising, sponsorships, and affiliate links — no content is published " +
      "without founder approval.",
    businessModel: "Content Studio → Views → Subscribers → Monetisation",
    revenueEngine: "Niche → Channel → Content → Views → Subscribers → Ad Revenue → Sponsorships",
    kpis: [
      "Content opportunities identified",
      "Videos prepared per week",
      "Channel views",
      "Revenue generated",
    ],
    defaultObjective:
      "Produce 5 publishable scripts per week and maintain a 30-day content calendar.",
    dailyRoutine:
      "1. Monitor trending topics in AI/automation/business niches. " +
      "2. Script or outline 1-2 videos. " +
      "3. Research SEO keywords and thumbnail concepts. " +
      "4. Prepare upload plan with metadata. " +
      "5. Submit content package for approval before scheduling.",
    successMetrics: [
      "Scripts produced per week (target: 5)",
      "Content calendar maintained (target: 30 days ahead)",
      "SEO-optimised titles per batch (target: 100%)",
      "Content approved and queued (target: 3/week)",
    ],
    approvalTriggers: ["approve_content", "approve_campaign"],
    stopConditions: [
      "More than 10 pending content drafts",
      "Emergency Stop active",
      "Daily output limit reached",
    ],
    cadenceMinutes: 480,
    workItems: [],
  },

  // ── Crypto / Stock ──────────────────────────────────────────────────
  {
    slug: "crypto-stock",
    name: "Crypto / Stock Trader Team",
    mission:
      "Grow capital through systematic research, validated trade theses, and " +
      "disciplined risk-managed execution — all trades require explicit founder " +
      "approval and are paper-traded until live execution is approved.",
    businessModel: "Research → Opportunity → Risk Assessment → Approval → Execution",
    revenueEngine: "Analysis → Thesis → Paper Trade → Approval → Position → Return",
    kpis: [
      "Opportunities identified per week",
      "Thesis accuracy (backtested)",
      "Risk-adjusted returns",
      "Portfolio growth",
    ],
    defaultObjective:
      "Produce 3 validated trade theses per week with documented evidence and risk score.",
    dailyRoutine:
      "1. Monitor key market signals (sector momentum, BTC levels, macro). " +
      "2. Research and validate 1-2 trade candidates. " +
      "3. Score risk/reward per thesis. " +
      "4. Write research report with entry/exit/stop-loss. " +
      "5. Submit trade thesis to Decide for founder review.",
    successMetrics: [
      "Trade theses produced per week (target: 3)",
      "Research accuracy (backtested win rate target: >55%)",
      "Risk-reward ratio per trade (target: >2:1)",
      "Paper trading return (benchmark: beat S&P 500)",
    ],
    approvalTriggers: ["review_research", "founder_decision"],
    stopConditions: [
      "Paper trading max drawdown reached (>10% portfolio)",
      "Emergency Stop active",
      "Daily output limit reached",
      "No live trading without explicit approval",
    ],
    cadenceMinutes: 720,
    workItems: [],
  },
];

export function getTeamBehavior(slug: string): TeamBehavior | undefined {
  return TEAM_BEHAVIORS.find(b => b.slug === slug);
}
