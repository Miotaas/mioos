import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper: date relative to today
function fromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  const shouldReset = process.argv.includes("--reset");
  const existingCount = await prisma.node.count();

  if (existingCount > 0 && !shouldReset) {
    console.log(`⚠️  Database already contains ${existingCount} nodes. Skipping seed to protect your data.`);
    console.log(`   To wipe and re-seed demo data, run: npm run db:reset-seed`);
    return;
  }

  console.log(shouldReset ? "Resetting and re-seeding MioOS..." : "Seeding MioOS (empty database)...");

  // Clear existing data (only when explicitly requested or DB is empty)
  if (shouldReset) {
    await prisma.aIMessage.deleteMany();
    await prisma.aIConversation.deleteMany();
    await prisma.checklistItem.deleteMany();
    await prisma.note.deleteMany();
    await prisma.goal.deleteMany();
    await prisma.task.deleteMany();
    await prisma.edge.deleteMany();
    await prisma.node.deleteMany();
  }

  // Create core nodes
  const michiel = await prisma.node.create({
    data: {
      label: "Michiel",
      type: "person",
      status: "active",
      description: "The operator. Builder, entrepreneur, AI explorer.",
      color: "#6366f1",
      icon: "user",
      posX: 400,
      posY: 300,
    },
  });

  const aion = await prisma.node.create({
    data: {
      label: "AION",
      type: "project",
      status: "active",
      description: "AI-powered autonomous agent system. Core flagship project.",
      content: "Building the next generation of AI agents that can autonomously handle complex workflows.",
      color: "#8b5cf6",
      icon: "brain",
      posX: 700,
      posY: 180,
      priority: "high",
    },
  });

  const aiMail = await prisma.node.create({
    data: {
      label: "AI Mail Copilot",
      type: "project",
      status: "active",
      description: "AI assistant that reads, drafts, and manages email intelligently.",
      content: "Chrome extension + backend that integrates with Gmail to provide AI-powered email assistance.",
      color: "#3b82f6",
      icon: "mail",
      posX: 700,
      posY: 400,
      priority: "high",
    },
  });

  const triply = await prisma.node.create({
    data: {
      label: "Triply",
      type: "project",
      status: "active",
      description: "AI travel planning and booking assistant.",
      content: "Smart travel companion that plans trips, books accommodations, and optimizes itineraries.",
      color: "#06b6d4",
      icon: "map",
      posX: 700,
      posY: 560,
      priority: "medium",
    },
  });

  const sales = await prisma.node.create({
    data: {
      label: "Sales Pipeline",
      type: "workflow",
      status: "active",
      description: "Outreach, leads, and business development pipeline.",
      color: "#f59e0b",
      icon: "trending-up",
      posX: 150,
      posY: 180,
      priority: "high",
    },
  });

  const goals = await prisma.node.create({
    data: {
      label: "2026 Goals",
      type: "goal",
      status: "active",
      description: "Strategic objectives for 2026.",
      color: "#10b981",
      icon: "target",
      posX: 150,
      posY: 440,
      priority: "high",
    },
  });

  const businessIdeas = await prisma.node.create({
    data: {
      label: "Business Ideas",
      type: "idea",
      status: "inbox",
      description: "Raw ideas and concepts to explore.",
      color: "#ec4899",
      icon: "lightbulb",
      posX: 980,
      posY: 300,
      priority: "low",
    },
  });

  const mioos = await prisma.node.create({
    data: {
      label: "MioOS",
      type: "system",
      status: "active",
      description: "Personal AI Operating System — this system.",
      color: "#6366f1",
      icon: "layout-dashboard",
      posX: 400,
      posY: 560,
      priority: "high",
    },
  });

  // Create edges
  await prisma.edge.createMany({
    data: [
      { sourceId: michiel.id, targetId: aion.id, label: "building", type: "default", animated: true },
      { sourceId: michiel.id, targetId: aiMail.id, label: "building", type: "default", animated: true },
      { sourceId: michiel.id, targetId: triply.id, label: "building", type: "default", animated: true },
      { sourceId: michiel.id, targetId: sales.id, label: "owns", type: "default", animated: false },
      { sourceId: michiel.id, targetId: goals.id, label: "pursuing", type: "default", animated: false },
      { sourceId: michiel.id, targetId: mioos.id, label: "uses", type: "reference", animated: true },
      { sourceId: aion.id, targetId: aiMail.id, label: "powers", type: "dependency", animated: true },
      { sourceId: aion.id, targetId: businessIdeas.id, label: "generates", type: "reference", animated: false },
      { sourceId: goals.id, targetId: aion.id, label: "prioritizes", type: "reference", animated: false },
    ],
  });

  // Tasks — dates relative to today so data never feels stale
  await prisma.task.createMany({
    data: [
      {
        title: "Build AION agent orchestration layer",
        description: "Design and implement the core agent coordination system",
        status: "in_progress",
        priority: "urgent",
        nodeId: aion.id,
        dueDate: fromNow(14),
      },
      {
        title: "Write AION technical spec",
        status: "todo",
        priority: "high",
        nodeId: aion.id,
        dueDate: fromNow(7),
      },
      {
        title: "Set up AION demo environment",
        status: "todo",
        priority: "medium",
        nodeId: aion.id,
        dueDate: fromNow(21),
      },
      {
        title: "Build Chrome extension scaffold",
        status: "in_progress",
        priority: "high",
        nodeId: aiMail.id,
        dueDate: fromNow(10),
      },
      {
        title: "Integrate Gmail API",
        status: "todo",
        priority: "high",
        nodeId: aiMail.id,
        dueDate: fromNow(18),
      },
      {
        title: "Design email summary UI",
        status: "todo",
        priority: "medium",
        nodeId: aiMail.id,
        dueDate: fromNow(25),
      },
      {
        title: "Research 20 potential B2B leads",
        status: "todo",
        priority: "high",
        nodeId: sales.id,
        dueDate: fromNow(5),
      },
      {
        title: "Draft cold outreach template",
        status: "in_progress",
        priority: "high",
        nodeId: sales.id,
        dueDate: fromNow(3),
      },
      {
        title: "MioOS Phase 4 — stability pass",
        status: "in_progress",
        priority: "urgent",
        nodeId: mioos.id,
        dueDate: fromNow(2),
      },
    ],
  });

  // Goals — Q/monthly context, dates relative to today
  await prisma.goal.createMany({
    data: [
      {
        title: "Launch AION beta — Q3 2026",
        description: "Get AION to a working beta with at least 5 test users",
        status: "active",
        progress: 25,
        nodeId: aion.id,
        targetDate: fromNow(90),
      },
      {
        title: "Generate €5k MRR — EOY 2026",
        description: "Reach €5,000 monthly recurring revenue across all products",
        status: "active",
        progress: 10,
        nodeId: goals.id,
        targetDate: new Date("2026-12-31"),
      },
      {
        title: "Ship AI Mail Copilot v1 — Q3 2026",
        description: "First public release with Gmail integration and smart drafting",
        status: "active",
        progress: 35,
        nodeId: aiMail.id,
        targetDate: fromNow(60),
      },
      {
        title: "MioOS daily-use stable — June 2026",
        description: "Personal AI OS usable every day without crashes or friction",
        status: "active",
        progress: 75,
        nodeId: mioos.id,
        targetDate: fromNow(30),
      },
      {
        title: "Get first 3 paying customers",
        description: "Validate product-market fit with real revenue",
        status: "active",
        progress: 5,
        nodeId: sales.id,
        targetDate: fromNow(45),
      },
    ],
  });

  // Notes
  await prisma.note.createMany({
    data: [
      {
        title: "AION Architecture Vision",
        content:
          "AION should be a meta-agent that orchestrates specialized sub-agents. Each sub-agent handles a domain (email, calendar, research, coding). The core loop: perceive → plan → act → reflect.\n\nKey decisions:\n- Use streaming for real-time feedback\n- Separate memory layer (vector DB + SQLite)\n- Agent registry with capability manifest",
        nodeId: aion.id,
        tags: JSON.stringify(["architecture", "vision", "ai"]),
      },
      {
        title: "AI Mail Copilot — Positioning",
        content:
          "Positioning: 'Your email, on autopilot.'\n\nTarget: founders and busy professionals who spend 2+ hours/day on email.\n\nDifferentiation: actual action-taking, not just summarizing.\n\nCore value props:\n1. Triage inbox automatically\n2. Draft replies in your style\n3. Flag important emails\n4. Schedule follow-ups",
        nodeId: aiMail.id,
        tags: JSON.stringify(["positioning", "marketing", "strategy"]),
      },
      {
        title: "Ideas Backlog",
        content:
          "1. AI scheduling assistant\n2. Voice-to-task capture\n3. Meeting summary bot\n4. Automated weekly review\n5. Smart contact enrichment\n6. AI-powered CRM for solopreneurs\n7. Daily briefing generator",
        nodeId: businessIdeas.id,
        tags: JSON.stringify(["ideas", "backlog"]),
      },
    ],
  });

  // Checklist items for AION
  await prisma.checklistItem.createMany({
    data: [
      { text: "Define agent communication protocol", completed: true, order: 0, nodeId: aion.id },
      { text: "Set up Redis for agent message queue", completed: false, order: 1, nodeId: aion.id },
      { text: "Build agent registry", completed: false, order: 2, nodeId: aion.id },
      { text: "Implement retry & error handling", completed: false, order: 3, nodeId: aion.id },
      { text: "Write integration tests", completed: false, order: 4, nodeId: aion.id },
    ],
  });

  console.log("✓ Seed complete");
  console.log(`  Created 8 nodes`);
  console.log(`  Created 9 edges`);
  console.log(`  Created 9 tasks (all dates relative to today)`);
  console.log(`  Created 5 goals (all dates relative to today)`);
  console.log(`  Created 3 notes`);
}

async function seedBusinessOS() {
  const existingProducts = await prisma.product.count();
  if (existingProducts > 0) {
    console.log(`⚠️  Business OS already seeded (${existingProducts} products). Skipping.`);
    return;
  }

  console.log("Seeding Business OS data...");

  // ── Products ─────────────────────────────────────────────────────────────
  const watchdog = await prisma.product.create({
    data: {
      name: "Follow-Up & Action Watchdog",
      shortDescription: "Never let a follow-up or open action fall through the cracks again.",
      targetCustomers: "Sales teams, consultancies, account managers, solopreneurs",
      painPoints: "Open follow-ups forgotten, deals lost to silence, no system to track pending replies",
      coreFeatures: JSON.stringify([
        "Scans email and CRM for open threads",
        "Surfaces follow-ups that need attention daily",
        "Sends alerts before deadlines slip",
        "Tracks action items across conversations",
        "Weekly digest of open loops",
      ]),
      demoAngle: "Show 3 real open follow-ups surfaced automatically. Let them feel the relief of nothing being forgotten.",
      pricingRange: "€300–600/month",
      implementationComplexity: "medium",
      status: "demo-ready",
    },
  });

  const guardian = await prisma.product.create({
    data: {
      name: "Deadline & Document Guardian",
      shortDescription: "Monitor every contract, renewal, and compliance deadline — automatically.",
      targetCustomers: "Legal teams, finance departments, compliance officers, operations managers",
      painPoints: "Contracts auto-renewing unexpectedly, missed compliance deadlines, documents buried in folders",
      coreFeatures: JSON.stringify([
        "Reads and extracts deadlines from documents",
        "Sends alerts 30/14/7 days before expiry",
        "Contract renewal tracking dashboard",
        "Compliance calendar with audit trail",
        "Integrates with Google Drive, SharePoint",
      ]),
      demoAngle: "Show a contract renewal that would have been missed — flagged 30 days early, with one-click action.",
      pricingRange: "€400–800/month",
      implementationComplexity: "medium",
      status: "demo-ready",
    },
  });

  const revenueDetector = await prisma.product.create({
    data: {
      name: "Lost Revenue Detector",
      shortDescription: "Find every stalled quote, unpaid invoice, and forgotten proposal — before the money is gone.",
      targetCustomers: "SMB owners, sales directors, freelancers, B2B companies with long sales cycles",
      painPoints: "Quotes going cold, invoices unpaid for weeks, proposals never followed up",
      coreFeatures: JSON.stringify([
        "Connects to invoicing and CRM systems",
        "Flags all open revenue at risk",
        "Calculates total revenue exposure",
        "Sends daily recovery digest",
        "Tracks quote-to-close conversion",
      ]),
      demoAngle: "Pull up their last 30 days of quotes. Show which ones have gone cold and estimate the revenue at risk.",
      pricingRange: "€500–1,000/month",
      implementationComplexity: "medium",
      status: "demo-ready",
    },
  });

  const meetingAgent = await prisma.product.create({
    data: {
      name: "Meeting-to-Execution Agent",
      shortDescription: "Every meeting becomes a clean list of decisions, owners, and deadlines — automatically.",
      targetCustomers: "Operations teams, project managers, management consultants, executive assistants",
      painPoints: "Meeting actions never tracked, decisions forgotten, note-taking is slow and inconsistent",
      coreFeatures: JSON.stringify([
        "Converts meeting notes or transcripts into actions",
        "Assigns owners and deadlines automatically",
        "Integrates with Notion, Confluence, Asana",
        "Weekly execution report per team",
        "Follow-up reminders for action owners",
      ]),
      demoAngle: "Take a real meeting notes file. Show how the agent produces a structured action list in under 60 seconds.",
      pricingRange: "€350–700/month",
      implementationComplexity: "low",
      status: "pilot-ready",
    },
  });

  const caseBuilder = await prisma.product.create({
    data: {
      name: "Evidence & Case Builder",
      shortDescription: "Organize evidence, disputes, and case documentation into structured, retrievable files.",
      targetCustomers: "Legal professionals, HR departments, insurers, compliance teams, property managers",
      painPoints: "Evidence scattered across emails and folders, disputes hard to document, audit trails missing",
      coreFeatures: JSON.stringify([
        "Structured case files with timeline view",
        "Evidence tagging, linking, and search",
        "Chronological audit trail generation",
        "Export to PDF for legal submission",
        "Fully local deployment option",
      ]),
      demoAngle: "Build a demo case from real-looking emails and documents. Show how a messy dispute becomes a clean, searchable file.",
      pricingRange: "€600–1,200/month",
      implementationComplexity: "high",
      status: "building",
    },
  });

  // ── Leads ─────────────────────────────────────────────────────────────────
  const lead1 = await prisma.lead.create({
    data: {
      companyName: "Bakker & Partners Advocaten",
      contactName: "Martijn Bakker",
      email: "m.bakker@bakkerpartners.nl",
      industry: "Legal",
      companySize: "15–30 people",
      painPoint: "Contracts and deadlines are tracked in spreadsheets. Last year we missed a renewal deadline that cost us €8k. We need something automated.",
      recommendedProductId: guardian.id,
      leadSource: "referral",
      status: "demo_scheduled",
      priority: "high",
      estimatedValue: 7200,
      nextAction: "Send Zoom link for demo on Tuesday",
      nextActionDate: fromNow(2),
      demoAngle: "Show a contract renewal that would have been missed — flagged 30 days early, with one-click action.",
      discoveryQuestions: "How many contracts do you manage?\nWho owns renewal tracking today?\nWhat happened with the missed renewal last year?",
      likelyObjections: "We already use a legal matter system — address: Guardian adds a monitoring layer on top.\nLooks complex — address: Setup is one 2-hour session.",
      pilotStructure: "2-week pilot: Upload 20 contracts. Guardian extracts deadlines. Measure how many were previously untracked.",
      pricingSuggestion: "€600/month. Offer €300 for first month pilot.",
      proposalStatus: "not_started",
      pilotStatus: "not_started",
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      companyName: "Veldhuis Techniek BV",
      contactName: "Sandra Veldhuis",
      email: "s.veldhuis@veldhuistechniek.nl",
      industry: "Manufacturing / B2B Sales",
      companySize: "20–50 people",
      painPoint: "We send 40–60 quotes per month and our close rate dropped. I think we're not following up properly. Things fall through the cracks.",
      recommendedProductId: watchdog.id,
      leadSource: "linkedin",
      status: "contacted",
      priority: "high",
      estimatedValue: 5400,
      nextAction: "Follow up on intro email — no reply after 4 days",
      nextActionDate: fromNow(-1),
      demoAngle: "Show 3 real open follow-ups surfaced automatically. Let them feel the relief of nothing being forgotten.",
      proposalStatus: "not_started",
      pilotStatus: "not_started",
    },
  });

  const lead3 = await prisma.lead.create({
    data: {
      companyName: "Rensen & Co Consultancy",
      contactName: "Thomas Rensen",
      email: "thomas@rensenco.nl",
      industry: "Management Consulting",
      companySize: "5–15 people",
      painPoint: "After every client meeting we spend 30 minutes writing up notes and action items. Half the time things still get missed. We need a better way.",
      recommendedProductId: meetingAgent.id,
      leadSource: "cold_outreach",
      status: "replied",
      priority: "medium",
      estimatedValue: 4200,
      nextAction: "Schedule discovery call",
      nextActionDate: fromNow(4),
      proposalStatus: "not_started",
      pilotStatus: "not_started",
    },
  });

  const lead4 = await prisma.lead.create({
    data: {
      companyName: "De Groot Makelaardij",
      contactName: "Leen de Groot",
      email: "leen@degroot-makelaardij.nl",
      industry: "Real Estate",
      companySize: "8–20 people",
      painPoint: "We had a tenant dispute last year where we couldn't find half the evidence. Emails were everywhere. It nearly went to court.",
      recommendedProductId: caseBuilder.id,
      leadSource: "event",
      status: "discovery_scheduled",
      priority: "medium",
      estimatedValue: 9600,
      nextAction: "Prepare discovery call questions",
      nextActionDate: fromNow(1),
      proposalStatus: "not_started",
      pilotStatus: "not_started",
    },
  });

  const lead5 = await prisma.lead.create({
    data: {
      companyName: "Hartman Finance",
      contactName: "Joris Hartman",
      email: "j.hartman@hartmanfinance.nl",
      industry: "Financial Services",
      companySize: "10–25 people",
      painPoint: "We have €40k in unpaid invoices older than 60 days. We send reminders manually but it's inconsistent. Revenue is leaking.",
      recommendedProductId: revenueDetector.id,
      leadSource: "referral",
      status: "pilot_active",
      priority: "urgent",
      estimatedValue: 8400,
      nextAction: "Check pilot results — week 2 review call",
      nextActionDate: fromNow(3),
      proposalStatus: "sent",
      proposalAmount: 8400,
      monthlyPrice: 700,
      setupFee: 1000,
      pilotStatus: "active",
      pilotStartDate: fromNow(-14),
      pilotEndDate: fromNow(14),
      pilotSuccessCriteria: "Recover at least €5k in overdue invoices during pilot period",
      pilotNotes: "Joris is happy with setup. First 2 invoices already recovered (€3.2k). Strong momentum.",
      decisionDeadline: fromNow(18),
    },
  });

  const lead6 = await prisma.lead.create({
    data: {
      companyName: "Kloos Verzekeringen",
      contactName: "Eva Kloos",
      email: "e.kloos@kloosverzekeringen.nl",
      industry: "Insurance",
      companySize: "30–80 people",
      painPoint: "We handle 50+ client complaints per year. Evidence collection and case documentation is a nightmare.",
      recommendedProductId: caseBuilder.id,
      leadSource: "partner",
      status: "won",
      priority: "high",
      estimatedValue: 12000,
      nextAction: "Onboarding kick-off call",
      nextActionDate: fromNow(5),
      proposalStatus: "accepted",
      proposalAmount: 12000,
      monthlyPrice: 1000,
      setupFee: 1500,
      pilotStatus: "converted",
      pilotStartDate: fromNow(-30),
      pilotEndDate: fromNow(-2),
    },
  });

  // ── Onboarding items for won/pilot leads ──────────────────────────────────
  await prisma.onboardingItem.createMany({
    data: [
      { leadId: lead6.id, text: "Collect company details", completed: true, order: 0 },
      { leadId: lead6.id, text: "Confirm selected AI product", completed: true, order: 1 },
      { leadId: lead6.id, text: "Confirm use case — complaint documentation", completed: true, order: 2 },
      { leadId: lead6.id, text: "Collect sample data", completed: true, order: 3 },
      { leadId: lead6.id, text: "Configure demo/workflow", completed: false, order: 4 },
      { leadId: lead6.id, text: "Run internal test", completed: false, order: 5 },
      { leadId: lead6.id, text: "Schedule client walkthrough", completed: false, order: 6 },
      { leadId: lead6.id, text: "Client approval", completed: false, order: 7 },
      { leadId: lead6.id, text: "Go live", completed: false, order: 8 },
      { leadId: lead6.id, text: "First week check-in", completed: false, order: 9 },
      { leadId: lead6.id, text: "Collect feedback", completed: false, order: 10 },
      { leadId: lead6.id, text: "Identify upsell opportunity", completed: false, order: 11 },
    ],
  });

  // ── Deployment ────────────────────────────────────────────────────────────
  const deployment1 = await prisma.deployment.create({
    data: {
      leadId: lead5.id,
      productId: revenueDetector.id,
      status: "testing",
      environment: "pilot",
      monthlyPrice: 700,
      setupStatus: "API connected to Exact Online",
      lastCheckIn: fromNow(-7),
      nextCheckIn: fromNow(3),
      issuesCount: 1,
      notes: "Invoice sync working. One false positive on a credit note — investigating.",
    },
  });

  // ── Support Issue ─────────────────────────────────────────────────────────
  await prisma.supportIssue.create({
    data: {
      leadId: lead5.id,
      productId: revenueDetector.id,
      deploymentId: deployment1.id,
      title: "Credit note incorrectly flagged as overdue invoice",
      description: "The system is picking up credit notes as unpaid invoices. Affects Hartman Finance pilot. Need to filter credit note document types.",
      severity: "medium",
      status: "in_progress",
    },
  });

  // ── Upsell Opportunity ────────────────────────────────────────────────────
  await prisma.upsellOpportunity.create({
    data: {
      leadId: lead6.id,
      currentProductId: caseBuilder.id,
      suggestedProductId: guardian.id,
      reason: "Kloos also manages 200+ insurance policies with renewal dates. The Guardian would add immediate value on top of Case Builder.",
      status: "identified",
      estimatedValue: 9600,
      nextActionDate: fromNow(30),
    },
  });

  console.log("✓ Business OS seed complete");
  console.log("  5 products created");
  console.log("  6 sample leads created");
  console.log("  12 onboarding items for Kloos Verzekeringen");
  console.log("  1 deployment (Hartman Finance pilot)");
  console.log("  1 support issue");
  console.log("  1 upsell opportunity");
}

async function seedAgentOS() {
  const existingAgents = await prisma.agent.count();
  if (existingAgents > 0) {
    console.log(`⚠️  Agent OS already seeded (${existingAgents} agents). Skipping.`);
    return;
  }

  console.log("Seeding Agent OS...");

  const dailyStrategyAgent = await prisma.agent.create({
    data: {
      name: "Daily Strategy Agent",
      slug: "daily-strategy-agent",
      description: "Every morning analyses MioOS state and produces today's priorities, revenue risks, blocked projects, and recommended focus order.",
      status: "active",
      agentType: "strategy",
      requiresApproval: true,
      scheduleEnabled: true,
      systemPrompt: `You are the Daily Strategy Agent inside MioOS — a private Business Operating System.

Your job: every morning, analyse the full state of the business and produce a clear strategic briefing.

INPUT you will receive:
- Open tasks (with status, priority, due dates)
- Active goals (with progress percentages)
- Active projects
- Recent notes and captures
- Active leads (with status, estimated value, overdue follow-ups)
- Deployments (with check-in dates)
- Support issues (with severity)

OUTPUT you must produce (strict JSON, no explanation outside the JSON):
{
  "summary": "2–3 sentence executive summary of today's business state",
  "recommendations": [
    "Priority 1: ...",
    "Priority 2: ...",
    "Priority 3: ..."
  ],
  "insights": [
    "Revenue risk: ...",
    "Blocked: ...",
    "Pipeline: ..."
  ],
  "proposedActions": []
}

RULES:
- This agent produces ONLY recommendations. proposedActions must always be an empty array [].
- Be direct and honest. No padding.
- Surface real risks — overdue tasks, silent leads, low-progress goals, stale deployments.
- Recommended focus order should be prioritised by business impact, not urgency theatre.`,
      prompt: `Analyse the current state of MioOS. Produce today's strategic briefing.

Focus on:
1. What demands immediate attention today
2. Revenue risks and pipeline health
3. Projects or goals that are blocked or stalling
4. Recommended focus order for maximum business impact

This agent produces recommendations only. No proposed actions.`,
    },
  });

  // Create daily schedule at 08:00
  const tomorrow8am = new Date();
  tomorrow8am.setDate(tomorrow8am.getDate() + 1);
  tomorrow8am.setHours(8, 0, 0, 0);

  await prisma.agentSchedule.create({
    data: {
      agentId: dailyStrategyAgent.id,
      enabled: true,
      frequency: "daily",
      timeOfDay: "08:00",
      nextRunAt: tomorrow8am,
    },
  });

  console.log("✓ Agent OS seed complete");
  console.log("  1 agent created: Daily Strategy Agent");
  console.log("  1 schedule created: daily at 08:00");
}

async function seedTools() {
  const existingTools = await prisma.tool.count();
  if (existingTools > 0) {
    console.log(`⚠️  Tools already seeded (${existingTools} tools). Skipping.`);
    return;
  }

  console.log("Seeding Agent Tools registry...");

  const tools = [
    { name: "Create Task",    slug: "create-task",    description: "Creates a new task in MioOS Tasks.", requiresApproval: true },
    { name: "Create Goal",    slug: "create-goal",    description: "Creates a new goal with target date and progress tracking.", requiresApproval: true },
    { name: "Create Note",    slug: "create-note",    description: "Creates a new note in MioOS Notes.", requiresApproval: true },
    { name: "Create Lead",    slug: "create-lead",    description: "Creates a new lead entry in the CRM.", requiresApproval: true },
    { name: "Create Project", slug: "create-project", description: "Creates a new project node in the Brain Graph.", requiresApproval: true },
    { name: "Draft Email",    slug: "draft-email",    description: "Drafts an outreach or follow-up email for review.", requiresApproval: true },
    { name: "Research",       slug: "research",       description: "Performs research on a topic and returns a structured summary.", requiresApproval: false },
  ];

  await prisma.tool.createMany({ data: tools.map((t) => ({ ...t, enabled: true })) });

  console.log("✓ Tools seed complete");
  console.log(`  ${tools.length} tools created in registry`);
}

main()
  .then(() => seedBusinessOS())
  .then(() => seedAgentOS())
  .then(() => seedTools())
  .catch(console.error)
  .finally(() => prisma.$disconnect());
