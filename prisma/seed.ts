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

async function seedWorkforcePhase2() {
  const existingTeams = await prisma.workforceTeam.count();
  if (existingTeams > 0) {
    console.log(`⚠️  Workforce already seeded (${existingTeams} teams). Skipping.`);
    return;
  }

  console.log("Seeding Phase 2 — Workforce backbone...");

  // ── Workforce Teams ──────────────────────────────────────────────
  const executive = await prisma.workforceTeam.create({
    data: {
      name: "Executive Team",
      slug: "executive",
      departmentType: "executive",
      objective: "Strategic oversight, goal tracking, coordination across all departments",
      status: "active",
      currentFocus: "Q2 2026 revenue targets and MioOS launch preparation",
    },
  });

  const research = await prisma.workforceTeam.create({
    data: {
      name: "Research Team",
      slug: "research",
      departmentType: "research",
      objective: "Deep market research, competitive analysis, opportunity intelligence",
      status: "active",
      currentFocus: "AI productivity tools market sizing and top 20 competitors",
    },
  });

  const commerce = await prisma.workforceTeam.create({
    data: {
      name: "Commerce Team",
      slug: "commerce",
      departmentType: "commerce",
      objective: "Product validation, pricing strategy, go-to-market execution",
      status: "active",
      currentFocus: "Validating Mail Co-Pilot pricing model for Dutch SMB market",
    },
  });

  const sales = await prisma.workforceTeam.create({
    data: {
      name: "Sales Team",
      slug: "sales",
      departmentType: "sales",
      objective: "Lead discovery, prospect qualification, pipeline management",
      status: "active",
      currentFocus: "Qualifying top 5 inbound leads from LinkedIn outreach",
    },
  });

  const marketing = await prisma.workforceTeam.create({
    data: {
      name: "Marketing Team",
      slug: "marketing",
      departmentType: "marketing",
      objective: "Brand positioning, campaigns, ad strategy, creative direction",
      status: "active",
      currentFocus: "Drafting LinkedIn thought leadership campaign for AION launch",
    },
  });

  const content = await prisma.workforceTeam.create({
    data: {
      name: "Content Team",
      slug: "content",
      departmentType: "content",
      objective: "Articles, blog posts, social content, email newsletters",
      status: "active",
      currentFocus: "3-part email sequence for Mail Co-Pilot waitlist",
    },
  });

  const operations = await prisma.workforceTeam.create({
    data: {
      name: "Operations Team",
      slug: "operations",
      departmentType: "operations",
      objective: "Process design, automation, workflow efficiency, internal systems",
      status: "active",
      currentFocus: "Automating weekly business review report generation",
    },
  });

  const support = await prisma.workforceTeam.create({
    data: {
      name: "Support Team",
      slug: "support",
      departmentType: "support",
      objective: "Customer insights, FAQ optimization, knowledge base maintenance",
      status: "active",
      currentFocus: "Building FAQ from Hartman Finance pilot feedback",
    },
  });

  const development = await prisma.workforceTeam.create({
    data: {
      name: "Development Team",
      slug: "development",
      departmentType: "development",
      objective: "MVPs, internal tools, integrations, production deployments",
      status: "active",
      currentFocus: "MioOS Phase 2 backend infrastructure",
    },
  });

  // ── Projects ─────────────────────────────────────────────────────
  const aionProject = await prisma.project.create({
    data: {
      name: "AION",
      slug: "aion",
      description: "AI inference and execution infrastructure. The engine powering autonomous agent workflows.",
      status: "active",
      priority: "high",
      nextAction: "Complete orchestration layer spec and begin prototype",
      revenueImpact: 50000,
    },
  });

  const miOosProject = await prisma.project.create({
    data: {
      name: "MioOS",
      slug: "mioos",
      description: "Personal AI Command Center. The founder operating system.",
      status: "active",
      priority: "urgent",
      nextAction: "Deploy Phase 2 backend to VPS after testing",
      revenueImpact: 0,
    },
  });

  const mailCopilotProject = await prisma.project.create({
    data: {
      name: "Mail Co-Pilot",
      slug: "mail-copilot",
      description: "AI email assistant for Gmail — triages, drafts, and acts on email.",
      status: "active",
      priority: "high",
      nextAction: "Finish Chrome extension Gmail API integration",
      blocker: "Gmail OAuth verification takes 2–4 weeks",
      revenueImpact: 36000,
    },
  });

  await prisma.project.create({
    data: {
      name: "AI Offerte Assistant",
      slug: "ai-offerte-assistant",
      description: "Automated quote generation for Dutch SMBs. Reads RFPs and produces formatted proposals.",
      status: "active",
      priority: "medium",
      nextAction: "Define target industry vertical and build first template",
      revenueImpact: 24000,
    },
  });

  // ── Goals — Business ────────────────────────────────────────────
  const firstCustomerGoal = await prisma.goal.create({
    data: {
      title: "First paying customer",
      description: "Close the first recurring revenue contract for any product.",
      status: "active",
      progress: 30,
      goalType: "business",
      target: 1,
      targetDate: fromNow(60),
      notes: "Hartman Finance pilot is most advanced. Kloos Verzekeringen already won. Focus on closing Bakker demo.",
    },
  });

  await prisma.goalMilestone.createMany({
    data: [
      { goalId: firstCustomerGoal.id, title: "First demo scheduled", completed: true, order: 0 },
      { goalId: firstCustomerGoal.id, title: "First pilot started", completed: true, order: 1 },
      { goalId: firstCustomerGoal.id, title: "First contract signed", completed: false, order: 2 },
      { goalId: firstCustomerGoal.id, title: "First invoice paid", completed: false, order: 3 },
    ],
  });

  const mrrGoal = await prisma.goal.create({
    data: {
      title: "€5,000 MRR",
      description: "Reach €5,000 monthly recurring revenue across all products.",
      status: "active",
      progress: 8,
      goalType: "business",
      target: 5000,
      targetDate: new Date("2026-12-31"),
      notes: "Current MRR: €400 (Kloos Verzekeringen). Pipeline: €1,800/mo if Hartman + Bakker close.",
    },
  });

  await prisma.goalMilestone.createMany({
    data: [
      { goalId: mrrGoal.id, title: "€500 MRR",   completed: true,  order: 0, targetDate: fromNow(-30) },
      { goalId: mrrGoal.id, title: "€1,000 MRR",  completed: false, order: 1, targetDate: fromNow(30)  },
      { goalId: mrrGoal.id, title: "€2,500 MRR",  completed: false, order: 2, targetDate: fromNow(90)  },
      { goalId: mrrGoal.id, title: "€5,000 MRR",  completed: false, order: 3, targetDate: fromNow(180) },
    ],
  });

  // ── Goals — Personal ────────────────────────────────────────────
  const gymGoal = await prisma.goal.create({
    data: {
      title: "Gym 4x per week",
      description: "Consistent training schedule — strength + conditioning.",
      status: "active",
      progress: 60,
      goalType: "personal",
      notes: "Currently averaging 3x. Need to add one morning session on Fridays.",
    },
  });

  await prisma.goalMilestone.createMany({
    data: [
      { goalId: gymGoal.id, title: "Join gym", completed: true, order: 0 },
      { goalId: gymGoal.id, title: "3x/week for 4 weeks straight", completed: true, order: 1 },
      { goalId: gymGoal.id, title: "4x/week for 4 weeks straight", completed: false, order: 2 },
      { goalId: gymGoal.id, title: "Maintain for 3 months", completed: false, order: 3 },
    ],
  });

  const japanGoal = await prisma.goal.create({
    data: {
      title: "Japan trip",
      description: "2–3 week trip to Tokyo, Kyoto, Osaka. Target: autumn 2026.",
      status: "active",
      progress: 20,
      goalType: "personal",
      target: 4000,
      notes: "Budget: ~€4,000. Need to book flights 3 months in advance for best prices.",
    },
  });

  await prisma.goalMilestone.createMany({
    data: [
      { goalId: japanGoal.id, title: "Set budget", completed: true, order: 0 },
      { goalId: japanGoal.id, title: "Choose dates (Oct–Nov 2026)", completed: false, order: 1 },
      { goalId: japanGoal.id, title: "Book flights", completed: false, order: 2 },
      { goalId: japanGoal.id, title: "Book accommodation", completed: false, order: 3 },
      { goalId: japanGoal.id, title: "Itinerary planned", completed: false, order: 4 },
    ],
  });

  await prisma.goal.create({
    data: {
      title: "Read 12 books",
      description: "One book per month — mix of business, philosophy, and fiction.",
      status: "active",
      progress: 42,
      goalType: "personal",
      target: 12,
      notes: "Currently at book 5 of 12. Reading: The Almanack of Naval Ravikant.",
    },
  });

  await prisma.goal.create({
    data: {
      title: "Save €5,000",
      description: "Personal savings buffer. Emergency fund + future investments.",
      status: "active",
      progress: 35,
      goalType: "personal",
      target: 5000,
      notes: "€1,750 saved so far. Automated €300/month transfer active.",
    },
  });

  // ── Revenue Entries ──────────────────────────────────────────────
  await prisma.revenueEntry.createMany({
    data: [
      {
        title: "Kloos Verzekeringen — Case Builder",
        amount: 1000,
        currency: "EUR",
        revenueType: "live",
        serviceType: "service",
        status: "active",
        projectId: null,
        sourceTeamId: sales.id,
        probability: 100,
      },
      {
        title: "Hartman Finance — Revenue Detector pilot",
        amount: 700,
        currency: "EUR",
        revenueType: "pipeline",
        serviceType: "service",
        status: "active",
        sourceTeamId: sales.id,
        probability: 75,
        expectedCloseDate: fromNow(18),
      },
      {
        title: "Bakker & Partners — Document Guardian",
        amount: 600,
        currency: "EUR",
        revenueType: "pipeline",
        serviceType: "service",
        status: "active",
        sourceTeamId: sales.id,
        probability: 50,
        expectedCloseDate: fromNow(30),
      },
      {
        title: "Mail Co-Pilot — early access batch",
        amount: 4800,
        currency: "EUR",
        revenueType: "potential",
        serviceType: "product",
        status: "active",
        projectId: mailCopilotProject.id,
        sourceTeamId: commerce.id,
        probability: 30,
        expectedCloseDate: fromNow(90),
      },
      {
        title: "AI Offerte Assistant — productized service",
        amount: 2400,
        currency: "EUR",
        revenueType: "potential",
        serviceType: "service",
        status: "active",
        sourceTeamId: commerce.id,
        probability: 20,
        expectedCloseDate: fromNow(120),
      },
    ],
  });

  // ── Workforce Outputs ────────────────────────────────────────────
  const researchOutput = await prisma.workforceOutput.create({
    data: {
      teamId: research.id,
      title: "AI email productivity market — size and top players",
      description: "TAM €2.3B. Fastest growing segment: AI-native email clients targeting SMBs. Top competitors: Superhuman, Shortwave, SaneBox. Key gap: actionable automation vs. just summarization.",
      outputType: "research",
      status: "completed",
      projectId: mailCopilotProject.id,
    },
  });

  await prisma.workforceOutput.create({
    data: {
      teamId: commerce.id,
      title: "Mail Co-Pilot pricing validation — Dutch SMB segment",
      description: "Price sensitivity research across 12 conversations. Sweet spot: €49–79/month per user. Annual plans at 20% discount well-received. Enterprise tier at €199/mo for 5 seats viable.",
      outputType: "product_candidate",
      status: "approved",
      projectId: mailCopilotProject.id,
    },
  });

  await prisma.workforceOutput.create({
    data: {
      teamId: sales.id,
      title: "12 qualified prospects — AI document management vertical",
      description: "Screened 60 companies, qualified 12 as strong fits. All 12 have 10–50 employees, handle contracts regularly, and expressed pain around deadline tracking.",
      outputType: "prospect",
      status: "completed",
    },
  });

  await prisma.workforceOutput.create({
    data: {
      teamId: marketing.id,
      title: "LinkedIn thought leadership series — AI for founders",
      description: "5-post series targeting Dutch-speaking founders. Theme: AI as leverage for solo operators. Estimated reach: 8,000–12,000 impressions based on account size.",
      outputType: "campaign",
      status: "approved",
    },
  });

  await prisma.workforceOutput.create({
    data: {
      teamId: content.id,
      title: "Mail Co-Pilot waitlist email sequence (3 emails)",
      description: "Welcome email, value demonstration email, and urgency email for 200+ waitlist subscribers. Optimized for demo booking CTA.",
      outputType: "content",
      status: "draft",
      projectId: mailCopilotProject.id,
    },
  });

  await prisma.workforceOutput.create({
    data: {
      teamId: development.id,
      title: "MioOS Phase 2 — backend database schema and API routes",
      description: "7 new Prisma models: WorkforceTeam, WorkforceOutput, TeamHandoff, Approval, RevenueEntry, Project, GoalMilestone. All API routes implemented and seeded.",
      outputType: "tool",
      status: "completed",
      projectId: miOosProject.id,
    },
  });

  await prisma.workforceOutput.create({
    data: {
      teamId: operations.id,
      title: "Weekly business review automation spec",
      description: "Automated weekly digest: revenue snapshot, lead pipeline, goal progress, team activity. Runs every Sunday 20:00. Delivered to founder inbox.",
      outputType: "automation",
      status: "draft",
    },
  });

  await prisma.workforceOutput.create({
    data: {
      teamId: support.id,
      title: "Hartman Finance pilot FAQ — top 8 questions",
      description: "Credit note handling, invoice sync frequency, false positive management, API rate limits. All documented for future client onboarding.",
      outputType: "support_insight",
      status: "completed",
    },
  });

  // ── Team Handoffs ────────────────────────────────────────────────
  await prisma.teamHandoff.create({
    data: {
      fromTeamId: research.id,
      toTeamId: commerce.id,
      title: "Mail Co-Pilot market research → pricing validation",
      description: "Research confirmed large TAM and competitor gap. Commerce team to validate pricing model with 10 target customers before launch.",
      status: "completed",
      relatedOutputId: researchOutput.id,
      projectId: mailCopilotProject.id,
      priority: "high",
    },
  });

  await prisma.teamHandoff.create({
    data: {
      fromTeamId: sales.id,
      toTeamId: marketing.id,
      title: "Qualified prospects → outreach campaign",
      description: "12 qualified prospects identified in document management vertical. Marketing team to create targeted LinkedIn outreach sequence.",
      status: "accepted",
      priority: "high",
    },
  });

  await prisma.teamHandoff.create({
    data: {
      fromTeamId: commerce.id,
      toTeamId: development.id,
      title: "Mail Co-Pilot pricing validated → build early access checkout",
      description: "Pricing validated at €49–79/month. Development team to build Stripe checkout and early access landing page.",
      status: "pending",
      projectId: mailCopilotProject.id,
      priority: "medium",
    },
  });

  await prisma.teamHandoff.create({
    data: {
      fromTeamId: content.id,
      toTeamId: executive.id,
      title: "Waitlist email sequence ready for review",
      description: "3-email sequence drafted. Requires founder review before sending to 200+ waitlist subscribers.",
      status: "pending",
      projectId: mailCopilotProject.id,
      priority: "medium",
    },
  });

  // ── Approvals ────────────────────────────────────────────────────
  await prisma.approval.create({
    data: {
      title: "Send Mail Co-Pilot waitlist email sequence",
      description: "Marketing has drafted a 3-email sequence for the 200+ person waitlist. Email 1: welcome. Email 2: value demo. Email 3: urgency + CTA to book a demo.",
      reason: "This is outbound communication to real contacts. Requires founder approval before sending.",
      status: "pending",
      sourceTeamId: content.id,
      projectId: mailCopilotProject.id,
      priority: "high",
      decisionType: "approve_outreach",
    },
  });

  await prisma.approval.create({
    data: {
      title: "Launch LinkedIn thought leadership campaign",
      description: "5-post series targeting Dutch founders on the theme of AI as leverage. Posts are drafted and scheduled for Mon/Wed/Fri over 2 weeks.",
      reason: "Content goes public on your personal LinkedIn profile. Review required before publishing.",
      status: "pending",
      sourceTeamId: marketing.id,
      priority: "medium",
      decisionType: "approve_content",
    },
  });

  await prisma.approval.create({
    data: {
      title: "Propose €600/month contract to Bakker & Partners",
      description: "Following a successful demo, Sales recommends sending a formal proposal at €600/month for the Document Guardian product.",
      reason: "Sending a commercial proposal to a prospect requires founder sign-off.",
      status: "pending",
      sourceTeamId: sales.id,
      priority: "urgent",
      decisionType: "approve_proposal",
    },
  });

  await prisma.approval.create({
    data: {
      title: "Research brief: AION competitive landscape",
      description: "Research team has completed a review of AI agent orchestration platforms. 14 competitors mapped. Key gaps identified for AION positioning.",
      reason: "Strategic research output — needs founder review to confirm alignment with AION direction.",
      status: "approved",
      sourceTeamId: research.id,
      projectId: aionProject.id,
      priority: "medium",
      decisionType: "review_research",
      approvedAt: fromNow(-3),
    },
  });

  console.log("✓ Phase 2 Workforce seed complete");
  console.log("  9 workforce teams created");
  console.log("  4 projects created (AION, MioOS, Mail Co-Pilot, Offerte Assistant)");
  console.log("  7 goals created (2 business + 5 personal) with milestones");
  console.log("  5 revenue entries created");
  console.log("  8 workforce outputs created");
  console.log("  4 team handoffs created");
  console.log("  4 approvals created (3 pending, 1 approved)");
}

async function seedAutomationRules() {
  const existing = await prisma.automationRule.count();
  if (existing > 0) {
    console.log(`⚠️  Automation rules already seeded (${existing} rules). Skipping.`);
    return;
  }
  console.log("Seeding automation rules...");

  const rules = [
    {
      name: "Research → Sales Handoff",
      trigger: "assignment_completed",
      condition: JSON.stringify({ departmentType: "research" }),
      action: "create_handoff",
      actionConfig: JSON.stringify({
        toTeamType:  "sales",
        title:       "Qualify leads from: {title}",
        description: "Research team has completed '{title}'. Sales team to review findings and build outreach list.",
        priority:    "medium",
      }),
      active: true,
    },
    {
      name: "Sales Outreach → Founder Approval",
      trigger: "assignment_completed",
      condition: JSON.stringify({ departmentType: "sales" }),
      action: "create_approval",
      actionConfig: JSON.stringify({
        title:        "Approve outreach: {title}",
        description:  "Sales team has prepared outreach for '{title}'. Review before sending.",
        priority:     "high",
        decisionType: "approve_outreach",
      }),
      active: true,
    },
    {
      name: "Marketing Campaign → Founder Approval",
      trigger: "assignment_completed",
      condition: JSON.stringify({ departmentType: "marketing" }),
      action: "create_approval",
      actionConfig: JSON.stringify({
        title:        "Approve campaign: {title}",
        description:  "Marketing team has prepared a campaign for '{title}'. Review before launch.",
        priority:     "high",
        decisionType: "approve_campaign",
      }),
      active: true,
    },
    {
      name: "Content → Founder Approval",
      trigger: "assignment_completed",
      condition: JSON.stringify({ departmentType: "content" }),
      action: "create_approval",
      actionConfig: JSON.stringify({
        title:        "Approve content: {title}",
        description:  "Content team has prepared '{title}'. Review before publishing.",
        priority:     "medium",
        decisionType: "approve_content",
      }),
      active: true,
    },
    {
      name: "Development → Operations Handoff",
      trigger: "assignment_completed",
      condition: JSON.stringify({ departmentType: "development" }),
      action: "create_handoff",
      actionConfig: JSON.stringify({
        toTeamType:  "operations",
        title:       "Deploy and monitor: {title}",
        description: "Development has completed '{title}'. Operations to handle deployment and monitoring.",
        priority:    "medium",
      }),
      active: true,
    },
    {
      name: "Commerce Validation → Founder Approval",
      trigger: "assignment_completed",
      condition: JSON.stringify({ departmentType: "commerce" }),
      action: "create_approval",
      actionConfig: JSON.stringify({
        title:        "Review product opportunity: {title}",
        description:  "Commerce team has validated '{title}'. Review findings before proceeding.",
        priority:     "medium",
        decisionType: "approve_product",
      }),
      active: true,
    },
  ];

  for (const rule of rules) {
    await prisma.automationRule.create({ data: rule });
  }

  console.log(`✓ ${rules.length} automation rules seeded`);
}


async function seedWorkflowTemplates() {
  const existing = await prisma.workflowTemplate.count();
  if (existing > 0) {
    console.log(`⚠️  Workflow templates already seeded (${existing} templates). Skipping.`);
    return;
  }

  const templates = [
    {
      name: "Market Validation",
      slug: "market-validation",
      description: "Validate a market opportunity before building",
      category: "validation",
      steps: JSON.stringify([
        { department: "research",  title: "Market Research & Analysis" },
        { department: "commerce",  title: "Product Opportunity Validation", dependsOn: ["research"] },
        { department: "sales",     title: "Prospect & Demand Discovery",   dependsOn: ["research"] },
        { department: "executive", title: "Go/No-Go Decision Brief",       dependsOn: ["commerce", "sales"] },
      ]),
    },
    {
      name: "Product Launch",
      slug: "product-launch",
      description: "Full launch sequence from research to campaign",
      category: "launch",
      steps: JSON.stringify([
        { department: "research",    title: "Competitive Landscape Research" },
        { department: "development", title: "MVP Technical Specification",  dependsOn: ["research"] },
        { department: "marketing",   title: "Launch Campaign Brief",        dependsOn: ["research"] },
        { department: "content",     title: "Launch Content Creation",      dependsOn: ["marketing"] },
        { department: "sales",       title: "Launch Outreach Plan",         dependsOn: ["marketing"] },
      ]),
    },
    {
      name: "Lead Generation Sprint",
      slug: "lead-generation-sprint",
      description: "Research, qualify, and prepare outreach for new leads",
      category: "sales",
      steps: JSON.stringify([
        { department: "research", title: "ICP & Market Research" },
        { department: "sales",    title: "Prospect List & Qualification",   dependsOn: ["research"] },
        { department: "content",  title: "Outreach Copy & Sequences",      dependsOn: ["sales"] },
      ]),
    },
    {
      name: "Weekly Executive Briefing",
      slug: "weekly-executive-briefing",
      description: "Compile weekly situation report for founder review",
      category: "general",
      steps: JSON.stringify([
        { department: "operations", title: "Operational Status Summary" },
        { department: "sales",      title: "Pipeline & Revenue Update" },
        { department: "executive",  title: "Weekly Executive Briefing",    dependsOn: ["operations", "sales"] },
      ]),
    },
  ];

  for (const t of templates) {
    await prisma.workflowTemplate.create({ data: t });
  }

  console.log(`  ${templates.length} workflow templates seeded`);
}
main()
  .then(() => seedBusinessOS())
  .then(() => seedAgentOS())
  .then(() => seedTools())
  .then(() => seedWorkforcePhase2())
  .then(() => seedAutomationRules())
  .then(() => seedWorkflowTemplates())
  .catch(console.error)
  .finally(() => prisma.$disconnect());
