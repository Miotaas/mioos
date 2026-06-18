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
    workItems: [
      {
        title: "Evaluate top 5 affiliate programs with >30% recurring commission in EU market",
        description:
          "Research affiliate networks (Impact, Awin, ShareASale) for SaaS products with recurring commission ≥30%. " +
          "Focus on EU-based programs or those accepting Dutch affiliates. " +
          "Document commission structure, cookie window, and payout terms.",
        outputType:      "research",
        priority:        "high",
        needsApproval:   false,
        approvalTrigger: "review_research",
        lifecycle:       "discovery",
      },
      {
        title: "Validate B2B SaaS reseller opportunity — Mail Co-Pilot EU distribution",
        description:
          "Research reseller opportunities for email automation SaaS tools in the Dutch/EU SMB market. " +
          "Identify 3 candidate products with white-label or reseller programs. " +
          "Document pricing margin and target customer profile.",
        outputType:      "product_candidate",
        priority:        "high",
        needsApproval:   true,
        approvalTrigger: "approve_product",
        lifecycle:       "validation",
      },
      {
        title: "Research trending AI productivity tools for affiliate partnership",
        description:
          "Scan Product Hunt, G2, and Capterra for AI tools launched in the last 90 days with affiliate programs. " +
          "Identify top 3 by growth velocity and commission rate. Confirm EU traffic eligibility.",
        outputType:      "research",
        priority:        "medium",
        needsApproval:   false,
        approvalTrigger: "review_research",
        lifecycle:       "discovery",
      },
      {
        title: "Analyse pricing models for e-commerce automation bundle — Dutch SMB target",
        description:
          "Research how Dutch SMBs currently buy e-commerce automation tools. " +
          "Benchmark 5 competitors' pricing. " +
          "Recommend bundle structure (starter/growth/enterprise) with monthly and annual pricing.",
        outputType:      "research",
        priority:        "medium",
        needsApproval:   false,
        approvalTrigger: "review_research",
        lifecycle:       "validation",
      },
      {
        title: "Identify dropshipping product with <€20 COGS and >€60 sell price in NL",
        description:
          "Use DSers, CJDropshipping, or Alibaba to find a product meeting the margin criteria. " +
          "Validate demand via Google Trends NL and estimated search volume. " +
          "Document top 3 candidates with supplier links.",
        outputType:      "product_candidate",
        priority:        "medium",
        needsApproval:   true,
        approvalTrigger: "approve_product",
        lifecycle:       "validation",
      },
      {
        title: "Draft affiliate partnership outreach for top 3 SaaS programs identified",
        description:
          "Write a professional outreach email to apply for affiliate partnership with the top 3 SaaS programs. " +
          "Include traffic sources, audience description, and proposed promotion channels. " +
          "Submit for founder approval before sending.",
        outputType:      "outreach",
        priority:        "high",
        needsApproval:   true,
        approvalTrigger: "approve_outreach",
        lifecycle:       "execution",
      },
      {
        title: "Map EU e-commerce market trends for Q3 2026 — top 5 growth categories",
        description:
          "Analyse Euromonitor, Statista, and Google Trends data for EU e-commerce. " +
          "Identify top 5 growth categories by YoY revenue increase. " +
          "Summarise opportunity size and competitive landscape per category.",
        outputType:      "research",
        priority:        "medium",
        needsApproval:   false,
        approvalTrigger: "review_research",
        lifecycle:       "discovery",
      },
      {
        title: "Design product launch sequence for first validated product",
        description:
          "Create a step-by-step launch plan: landing page copy, pricing, traffic strategy (SEO/ads/social), " +
          "first 30-day sales targets, and success metrics. Format as an executable checklist.",
        outputType:      "product_candidate",
        priority:        "high",
        needsApproval:   true,
        approvalTrigger: "approve_product",
        lifecycle:       "execution",
      },
      {
        title: "Research white-label SaaS products suitable for Dutch market reselling",
        description:
          "Find 5 white-label SaaS tools (email marketing, CRM, invoicing, or scheduling) with reseller agreements. " +
          "Document minimum purchase commitment, margin potential, and required localisation for NL market.",
        outputType:      "research",
        priority:        "medium",
        needsApproval:   false,
        approvalTrigger: "review_research",
        lifecycle:       "discovery",
      },
      {
        title: "Build comparison matrix: affiliate vs dropship vs reseller for 2026 portfolio",
        description:
          "Create a structured comparison of three business models: affiliate marketing, dropshipping, and SaaS reselling. " +
          "Score each on capital required, margin, time-to-revenue, and operational complexity for a solo founder.",
        outputType:      "research",
        priority:        "low",
        needsApproval:   false,
        approvalTrigger: "review_research",
        lifecycle:       "discovery",
      },
    ],
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
    workItems: [
      {
        title: "Identify 10 Dutch SMBs with manual invoice or HR workflow bottlenecks",
        description:
          "Search LinkedIn, Chamber of Commerce (KvK), and local business directories for Dutch SMBs (10-100 employees) " +
          "in accounting, HR, or logistics sectors. Find companies that still use Excel or email for core processes. " +
          "Document company name, size, sector, and contact person.",
        outputType:      "prospect",
        priority:        "urgent",
        needsApproval:   false,
        approvalTrigger: "review_research",
        lifecycle:       "discovery",
      },
      {
        title: "Design automation proposal for accounting firm — invoice-to-CRM workflow",
        description:
          "Create a detailed automation proposal: current state pain points, proposed workflow (invoice→OCR→CRM sync), " +
          "estimated time savings (hours/month), and pricing at €3,500 setup + €350/month.",
        outputType:      "research",
        priority:        "high",
        needsApproval:   true,
        approvalTrigger: "approve_proposal",
        lifecycle:       "execution",
      },
      {
        title: "Draft outreach sequence for AI automation services — 5-touch LinkedIn + email",
        description:
          "Write a complete 5-touch sequence: (1) LinkedIn connection request, (2) LinkedIn intro message, " +
          "(3) follow-up email with case study, (4) LinkedIn check-in, (5) final email with CTA. " +
          "Target: Dutch SMB operations manager with >50 hours/month in manual workflows.",
        outputType:      "outreach",
        priority:        "high",
        needsApproval:   true,
        approvalTrigger: "approve_outreach",
        lifecycle:       "execution",
      },
      {
        title: "Qualify top 5 inbound leads from LinkedIn campaign — BANT framework",
        description:
          "Apply BANT (Budget, Authority, Need, Timeline) to the 5 most promising inbound leads. " +
          "Research each company's revenue, decision-making structure, and current tech stack. " +
          "Score each 1-10 and recommend next action.",
        outputType:      "prospect",
        priority:        "urgent",
        needsApproval:   false,
        approvalTrigger: "review_research",
        lifecycle:       "validation",
      },
      {
        title: "Research competitor pricing for B2B workflow automation in Netherlands",
        description:
          "Research pricing from Make.com, Zapier, n8n partners, and Dutch automation agencies. " +
          "Document service tiers, pricing models, and perceived value proposition. " +
          "Identify where our offer can win on value or price.",
        outputType:      "research",
        priority:        "medium",
        needsApproval:   false,
        approvalTrigger: "review_research",
        lifecycle:       "discovery",
      },
      {
        title: "Build target account list — 20 Dutch logistics companies with manual dispatch",
        description:
          "Find 20 logistics, freight, or transport companies in the Netherlands (20-200 employees) " +
          "likely using manual dispatch or Excel-based routing. Include contact for operations director or CEO. " +
          "Priority: companies with recent job posts for coordinators (signal of manual work).",
        outputType:      "prospect",
        priority:        "high",
        needsApproval:   false,
        approvalTrigger: "review_research",
        lifecycle:       "discovery",
      },
      {
        title: "Design AI-powered HR onboarding automation — proposal for 50-person company",
        description:
          "Design an automation workflow for employee onboarding: form submission→IT account creation→email provisioning→Slack→manager notification. " +
          "Estimate 4 hours saved per hire. Prepare as a one-page proposal with workflow description.",
        outputType:      "research",
        priority:        "medium",
        needsApproval:   true,
        approvalTrigger: "approve_proposal",
        lifecycle:       "execution",
      },
      {
        title: "Write personalised outreach for top 3 qualified prospects",
        description:
          "Write 3 personalised cold emails (1 per company) referencing a specific inefficiency observed. " +
          "Each email should propose a call to explore automation. Max 150 words each. " +
          "Submit for founder approval before sending.",
        outputType:      "outreach",
        priority:        "urgent",
        needsApproval:   true,
        approvalTrigger: "approve_outreach",
        lifecycle:       "execution",
      },
      {
        title: "Research AI agent pricing models — productised service vs retainer vs per-automation",
        description:
          "Analyse how AI automation agencies price their services: fixed project fee, monthly retainer, or per-automation. " +
          "Survey 10 agencies from the US and EU. " +
          "Recommend which model maximises revenue for a solo founder with AION infrastructure.",
        outputType:      "research",
        priority:        "medium",
        needsApproval:   false,
        approvalTrigger: "review_research",
        lifecycle:       "discovery",
      },
      {
        title: "Prepare lead scoring model for automation sales pipeline",
        description:
          "Design a lead scoring matrix: company size, sector, current tech debt, budget signals, decision-maker access, and timing. " +
          "Score 0-100 with thresholds for warm/hot/qualified. " +
          "Include implementation instructions for tracking in MioOS.",
        outputType:      "research",
        priority:        "low",
        needsApproval:   false,
        approvalTrigger: "review_research",
        lifecycle:       "validation",
      },
    ],
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
    workItems: [
      {
        title: "Research top 20 faceless YouTube channels in AI business automation niche",
        description:
          "Analyse top 20 YouTube channels covering AI automation or business automation. " +
          "Document subscriber count, average views, posting frequency, content format, and estimated monthly revenue. " +
          "Identify top 3 formats with highest view-to-subscriber ratio.",
        outputType:      "research",
        priority:        "high",
        needsApproval:   false,
        approvalTrigger: "review_research",
        lifecycle:       "discovery",
      },
      {
        title: "Script 3 YouTube Shorts: How AI agents run my business autonomously",
        description:
          "Write 3 YouTube Shorts scripts (60 seconds each). Format: hook (5s) + demonstration (45s) + CTA (10s). " +
          "Include on-screen text suggestions and voiceover script. " +
          "Titles should be curiosity-driven and click-optimised.",
        outputType:      "content",
        priority:        "high",
        needsApproval:   true,
        approvalTrigger: "approve_content",
        lifecycle:       "execution",
      },
      {
        title: "Analyse monetisation strategies — RPM, sponsorship, affiliate for AI channels",
        description:
          "Research average YouTube RPM for AI/tech channels (target: €4-12 CPM in EU). " +
          "Compare revenue from AdSense, sponsorships, and affiliate programs. " +
          "Estimate monthly revenue at 10K, 50K, and 100K monthly views.",
        outputType:      "research",
        priority:        "medium",
        needsApproval:   false,
        approvalTrigger: "review_research",
        lifecycle:       "discovery",
      },
      {
        title: "Draft 30-day content calendar for AI automation YouTube channel",
        description:
          "Create a 30-day calendar with 3 videos per week (12 total). " +
          "For each video: title, format (short/long), target keyword, estimated views, and production complexity. " +
          "Include 2 Shorts per week.",
        outputType:      "content",
        priority:        "medium",
        needsApproval:   true,
        approvalTrigger: "approve_content",
        lifecycle:       "validation",
      },
      {
        title: "Write script: 'I replaced my sales team with AI agents — here is what happened'",
        description:
          "Full YouTube video script (8-12 minutes). Structure: personal story hook, problem setup, solution reveal, " +
          "results data, what went wrong, what worked, and CTA. " +
          "Include B-roll suggestions and chapter timestamps.",
        outputType:      "content",
        priority:        "high",
        needsApproval:   true,
        approvalTrigger: "approve_content",
        lifecycle:       "execution",
      },
      {
        title: "Research SEO keyword strategy for AI automation YouTube channel",
        description:
          "Find 20 high-opportunity keywords: >1,000 monthly searches, <500K competing videos, growing trend. " +
          "Categorise by beginner/advanced, short-tail/long-tail, evergreen/trending. " +
          "Recommend top 5 keywords for the first batch of videos.",
        outputType:      "research",
        priority:        "high",
        needsApproval:   false,
        approvalTrigger: "review_research",
        lifecycle:       "discovery",
      },
      {
        title: "Script: 'How I built a 6-figure business with AI agents and no employees'",
        description:
          "Vision-casting YouTube script targeting solopreneurs and small business owners. " +
          "Structure: bold claim→credibility→story arc→proof→framework→CTA. " +
          "Length 10-15 minutes with chapter timestamps and thumbnail text suggestion.",
        outputType:      "content",
        priority:        "high",
        needsApproval:   true,
        approvalTrigger: "approve_content",
        lifecycle:       "execution",
      },
      {
        title: "Design thumbnail strategy: split-test concepts for AI automation channel",
        description:
          "Design 3 thumbnail concepts. For each: background colour, text overlay (max 3 words), " +
          "main visual element, and emotion to evoke. Recommend A/B test pairs. " +
          "Reference top-performing thumbnail patterns from competitor research.",
        outputType:      "content",
        priority:        "medium",
        needsApproval:   true,
        approvalTrigger: "approve_content",
        lifecycle:       "execution",
      },
      {
        title: "Research: top AI tools that creators use to run faceless YouTube channels",
        description:
          "Survey how successful faceless YouTube creators use AI. Document tools for: scriptwriting, voiceover, " +
          "video editing, thumbnail design, and SEO. " +
          "Estimate monthly tool cost and time saved per video.",
        outputType:      "research",
        priority:        "medium",
        needsApproval:   false,
        approvalTrigger: "review_research",
        lifecycle:       "discovery",
      },
      {
        title: "Write 5 video titles and descriptions for AI automation niche (SEO-optimised)",
        description:
          "Write 5 YouTube video titles + full descriptions. Each title should include the target keyword in first 60 characters. " +
          "Descriptions should be 300+ words with timestamps, link placeholders, and 3-5 hashtags. " +
          "Optimise for CTR and search.",
        outputType:      "content",
        priority:        "medium",
        needsApproval:   true,
        approvalTrigger: "approve_content",
        lifecycle:       "execution",
      },
    ],
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
    workItems: [
      {
        title: "Analyse AI/ML sector rotation signals and momentum stocks for Q2 2026",
        description:
          "Scan the top 15 AI/ML stocks (NVDA, MSFT, GOOGL, AMD, PLTR, etc.) for momentum signals. " +
          "Apply relative strength and sector rotation indicators. " +
          "Identify accumulation vs distribution phases with 4-week price action summary.",
        outputType:      "research",
        priority:        "high",
        needsApproval:   false,
        approvalTrigger: "review_research",
        lifecycle:       "discovery",
      },
      {
        title: "Research BTC support and resistance levels for paper trading entry thesis",
        description:
          "Analyse BTC price structure on weekly, daily, and 4H charts. " +
          "Identify key support (S1/S2) and resistance (R1/R2) zones using horizontal levels, " +
          "volume profile, and Fibonacci retracements. Define entry zone, stop-loss, and 2 profit targets.",
        outputType:      "research",
        priority:        "high",
        needsApproval:   true,
        approvalTrigger: "review_research",
        lifecycle:       "validation",
      },
      {
        title: "Design risk-controlled paper trading ruleset: max 5% drawdown per position",
        description:
          "Create a formal paper trading ruleset: position sizing (1-3% risk per trade), " +
          "max open positions (5), daily stop-loss (-2% portfolio), weekly drawdown trigger (-5%), " +
          "and rules for adding to winners and cutting losers. Format as an operational playbook.",
        outputType:      "research",
        priority:        "medium",
        needsApproval:   false,
        approvalTrigger: "review_research",
        lifecycle:       "execution",
      },
      {
        title: "Evaluate DeFi yield farming risk vs reward — top 3 protocols",
        description:
          "Research top 3 DeFi yield farming protocols by TVL (Aave, Curve, Uniswap or equivalents). " +
          "For each: APY, smart contract audit status, impermanent loss risk, liquidity depth, and minimum investment. " +
          "Recommend capital allocation % for a conservative portfolio.",
        outputType:      "research",
        priority:        "medium",
        needsApproval:   true,
        approvalTrigger: "review_research",
        lifecycle:       "validation",
      },
      {
        title: "Build watchlist: 10 AI stocks with strong earnings momentum and low P/E vs peers",
        description:
          "Screen for 10 AI-adjacent stocks with: positive EPS growth >20% YoY, P/E below sector average, " +
          "institutional accumulation signal, and near-term catalyst. " +
          "Document each with fundamental summary and technical setup.",
        outputType:      "research",
        priority:        "medium",
        needsApproval:   false,
        approvalTrigger: "review_research",
        lifecycle:       "discovery",
      },
      {
        title: "Write ETH trade thesis — macro setup and on-chain signals for Q3 2026",
        description:
          "Research ETH fundamentals: staking yields, gas usage trends, L2 ecosystem growth, and on-chain activity. " +
          "Cross-reference with macro environment (Fed rates, DXY). " +
          "Write a complete trade thesis with bull case entry, invalidation, 3-month price target, and risk score 1-10.",
        outputType:      "research",
        priority:        "high",
        needsApproval:   true,
        approvalTrigger: "review_research",
        lifecycle:       "validation",
      },
      {
        title: "Build macro watchlist: 5 leading indicators for crypto market direction",
        description:
          "Identify the 5 most predictive macro indicators: USD strength (DXY), Fed funds rate expectations, " +
          "M2 money supply, global liquidity index, and risk sentiment (VIX). " +
          "Create a weekly monitoring checklist with signal thresholds for bullish/bearish regime.",
        outputType:      "research",
        priority:        "medium",
        needsApproval:   false,
        approvalTrigger: "review_research",
        lifecycle:       "discovery",
      },
      {
        title: "Research options strategy for downside protection on equity portfolio",
        description:
          "Research protective put strategies for an AI/tech sector concentrated equity portfolio. " +
          "Compare: buying puts, put spreads, collar strategy. " +
          "Calculate hedge cost as % of portfolio at 1x, 2x, and 3x expected volatility.",
        outputType:      "research",
        priority:        "low",
        needsApproval:   false,
        approvalTrigger: "review_research",
        lifecycle:       "validation",
      },
      {
        title: "Identify 5 undervalued microcap AI companies — hidden value thesis",
        description:
          "Screen microcap stocks (<€200M market cap) in AI/automation: P/S <5x, gross margin >50%, " +
          "YoY revenue growth >30%, limited analyst coverage. " +
          "Write a 1-page investment thesis per company with bull case, risks, and entry price target.",
        outputType:      "research",
        priority:        "low",
        needsApproval:   true,
        approvalTrigger: "review_research",
        lifecycle:       "discovery",
      },
      {
        title: "Monthly portfolio review: paper trading performance vs benchmarks",
        description:
          "Review last 30 days of paper trading results vs S&P 500, BTC, and ETH. " +
          "Calculate win rate, average R/R, maximum drawdown, and Sharpe ratio equivalent. " +
          "Identify 3 successful trades and 2 failures. Extract lessons and recommend strategy adjustments.",
        outputType:      "research",
        priority:        "medium",
        needsApproval:   false,
        approvalTrigger: "review_research",
        lifecycle:       "validation",
      },
    ],
  },
];

export function getTeamBehavior(slug: string): TeamBehavior | undefined {
  return TEAM_BEHAVIORS.find(b => b.slug === slug);
}
