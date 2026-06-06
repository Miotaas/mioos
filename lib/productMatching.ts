// Deterministic product matching — no AI required

export interface MatchResult {
  productName: string;
  explanation: string;
  demoAngle: string;
  discoveryQuestions: string[];
  likelyObjections: string[];
  pilotStructure: string;
  pricingSuggestion: string;
}

interface ProductRule {
  name: string;
  keywords: string[];
  explanation: string;
  demoAngle: string;
  discoveryQuestions: string[];
  likelyObjections: string[];
  pilotStructure: string;
  pricingSuggestion: string;
}

const PRODUCT_RULES: ProductRule[] = [
  {
    name: "Follow-Up & Action Watchdog",
    keywords: [
      "follow-up", "follow up", "followup", "reminder", "forgot", "forgetting",
      "open action", "pending", "action item", "dropped", "missed email", "no reply",
      "unanswered", "chase", "chasing", "lose track", "losing track",
    ],
    explanation:
      "Their pain is around open actions and follow-ups slipping through. The Watchdog tracks every open loop and surfaces what needs attention before it's too late.",
    demoAngle:
      "Show a live example of 3 open follow-ups being surfaced automatically. Let them feel the relief of nothing being forgotten.",
    discoveryQuestions: [
      "How many open follow-ups do you estimate you have right now?",
      "What happens when a client doesn't reply — how do you track it?",
      "Have you ever lost a deal or damaged a relationship because of a missed follow-up?",
      "What tools do you currently use to track open actions?",
    ],
    likelyObjections: [
      "We already use CRM reminders — address: 'This works across all your tools, not just CRM.'",
      "Our team is small — address: 'Small teams lose the most to dropped follow-ups because there's no safety net.'",
      "It seems complex — address: 'Setup takes one meeting. It runs itself after that.'",
    ],
    pilotStructure:
      "2-week pilot: Connect to their email/CRM. Watchdog surfaces top 10 open follow-ups. They act on them. We measure recovery rate.",
    pricingSuggestion: "€300–600/month depending on volume. Offer first month at €150 during pilot.",
  },
  {
    name: "Deadline & Document Guardian",
    keywords: [
      "contract", "deadline", "document", "renewal", "compliance", "expiry", "expire",
      "legal", "agreement", "certificate", "gdpr", "regulation", "audit", "license",
      "insurance", "subscription", "sla", "terms",
    ],
    explanation:
      "Their pain is around critical documents and deadlines falling through unnoticed. The Guardian monitors all contracts and compliance items and alerts before anything expires or breaches.",
    demoAngle:
      "Show a contract renewal that would have been missed — and how the Guardian flagged it 30 days early, giving time to act.",
    discoveryQuestions: [
      "Have you ever had a contract auto-renew when you wanted to cancel, or expire when you wanted to keep it?",
      "How do you currently track contract renewal dates?",
      "Who owns compliance monitoring in your team?",
      "What's the cost of missing a regulatory deadline for your business?",
    ],
    likelyObjections: [
      "We have a legal team — address: 'The Guardian is the layer between your legal team and chaos. It feeds them alerts they can act on.'",
      "We use calendar reminders — address: 'Calendars don't read documents. The Guardian does.'",
      "Sounds expensive — address: 'One missed contract renewal costs more than a year of the Guardian.'",
    ],
    pilotStructure:
      "2-week pilot: Upload 10–20 key documents. Guardian extracts deadlines and sends daily digest. Measure how many items were previously untracked.",
    pricingSuggestion: "€400–800/month based on document volume. Pilot at €200 flat.",
  },
  {
    name: "Lost Revenue Detector",
    keywords: [
      "revenue", "invoice", "quote", "proposal", "payment", "unpaid", "overdue",
      "missed sale", "lost deal", "price list", "unanswered quote", "stalled",
      "pipeline leak", "money left on table", "forgotten invoice",
    ],
    explanation:
      "Their pain is silent revenue loss — quotes not followed up, invoices unpaid, proposals gone cold. The Detector finds every leaking revenue point and flags it before it's permanently lost.",
    demoAngle:
      "Pull up their last 30 days of quotes. Show which ones have gone cold and estimate the revenue at risk. Real number, real impact.",
    discoveryQuestions: [
      "How many quotes do you send per month, and what's your close rate?",
      "Do you know how many invoices are currently overdue?",
      "What do you do when a proposal goes unanswered for 2 weeks?",
      "Can you estimate what you've lost in the last 6 months to unrecovered proposals?",
    ],
    likelyObjections: [
      "Our sales team tracks this — address: 'The Detector is a second layer. Human attention is inconsistent; this is not.'",
      "We have accounting software — address: 'Accounting shows what happened. The Detector stops it before it does.'",
      "I don't think we lose that much — address: 'Most businesses don't know their real number. Let's find yours.'",
    ],
    pilotStructure:
      "3-week pilot: Connect to invoicing/CRM. Detector surfaces all open revenue at risk. Track recovery over pilot period.",
    pricingSuggestion: "€500–1000/month. Pilot at €250. Position as: if it recovers one deal, it pays for itself.",
  },
  {
    name: "Meeting-to-Execution Agent",
    keywords: [
      "meeting", "call", "notes", "decision", "action items", "minutes", "recap",
      "summary", "follow-up from meeting", "discussed", "agreed", "transcript",
      "zoom", "teams", "agenda", "debrief",
    ],
    explanation:
      "Their pain is that meetings produce decisions and actions that never get tracked. The Meeting-to-Execution Agent converts every meeting into a clean list of decisions, owners, and deadlines — automatically.",
    demoAngle:
      "Take a real meeting notes file or transcript. Show how the agent produces a structured action list in under 60 seconds.",
    discoveryQuestions: [
      "How do you capture action items from meetings today?",
      "How often do things agreed in a meeting not happen because nobody tracked them?",
      "Who writes your meeting minutes, and how long does it take?",
      "How many meetings per week does your team have?",
    ],
    likelyObjections: [
      "We have a note-taker — address: 'The Agent is faster and consistent. Your note-taker can focus on higher-value work.'",
      "We use Notion/Confluence — address: 'The Agent populates those tools. It doesn't replace them, it feeds them.'",
      "AI transcription is inaccurate — address: 'We validate outputs. The goal is 90% automation, not 100%.'",
    ],
    pilotStructure:
      "2-week pilot: Process 5–10 actual meetings. Deliver structured action lists. Measure adoption and task completion rate.",
    pricingSuggestion: "€350–700/month. Pilot free for first 10 meetings, then €175/month.",
  },
  {
    name: "Evidence & Case Builder",
    keywords: [
      "evidence", "claim", "dispute", "conflict", "complaint", "case", "legal",
      "audit trail", "incident", "liability", "documentation", "proof", "record",
      "hr issue", "client complaint", "arbitration", "investigation",
    ],
    explanation:
      "Their pain is around disputes and cases where the right evidence is scattered and hard to retrieve. The Case Builder organizes all evidence into structured, timestamped cases ready for any dispute or audit.",
    demoAngle:
      "Build a demo case from real-looking emails and documents. Show how a previously messy dispute becomes a clean, searchable evidence file.",
    discoveryQuestions: [
      "Have you ever been in a dispute where you struggled to find the right evidence?",
      "How do you currently organize documentation when a client complaint escalates?",
      "What would it cost you if you lost a dispute because evidence was missing?",
      "How many active disputes or complaints do you have at any time?",
    ],
    likelyObjections: [
      "We have lawyers for this — address: 'The Case Builder gives your lawyers clean input instead of chaos. It cuts legal hours.'",
      "We don't have many disputes — address: 'When you do, you'll have one chance to get it right. This makes that chance count.'",
      "Our data is sensitive — address: 'Fully local deployment option. No data leaves your environment.'",
    ],
    pilotStructure:
      "3-week pilot: Take one real or anonymized case. Build it end-to-end. Show time saved vs manual approach.",
    pricingSuggestion: "€600–1200/month. Pilot at €300. Enterprise pricing on request.",
  },
];

export function matchProduct(painPoint: string): MatchResult | null {
  if (!painPoint || painPoint.trim().length < 3) return null;

  const lower = painPoint.toLowerCase();
  let bestRule: ProductRule | null = null;
  let bestScore = 0;

  for (const rule of PRODUCT_RULES) {
    const score = rule.keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }

  if (!bestRule) return null;

  return {
    productName: bestRule.name,
    explanation: bestRule.explanation,
    demoAngle: bestRule.demoAngle,
    discoveryQuestions: bestRule.discoveryQuestions,
    likelyObjections: bestRule.likelyObjections,
    pilotStructure: bestRule.pilotStructure,
    pricingSuggestion: bestRule.pricingSuggestion,
  };
}

export function getProductNameById(products: { id: string; name: string }[], id: string | null | undefined): string {
  if (!id) return "—";
  return products.find((p) => p.id === id)?.name ?? "—";
}

export const LEAD_STATUSES = [
  "new", "researched", "contacted", "replied",
  "discovery_scheduled", "demo_scheduled", "demo_done",
  "proposal_sent", "pilot_offered", "pilot_active",
  "won", "lost", "archived",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  researched: "Researched",
  contacted: "Contacted",
  replied: "Replied",
  discovery_scheduled: "Discovery",
  demo_scheduled: "Demo Sched.",
  demo_done: "Demo Done",
  proposal_sent: "Proposal Sent",
  pilot_offered: "Pilot Offered",
  pilot_active: "Pilot Active",
  won: "Won",
  lost: "Lost",
  archived: "Archived",
};

export const PIPELINE_STAGES: { id: LeadStatus; label: string; color: string }[] = [
  { id: "new", label: "New", color: "#6366f1" },
  { id: "researched", label: "Researched", color: "#8b5cf6" },
  { id: "contacted", label: "Contacted", color: "#3b82f6" },
  { id: "replied", label: "Replied", color: "#06b6d4" },
  { id: "discovery_scheduled", label: "Discovery", color: "#f59e0b" },
  { id: "demo_scheduled", label: "Demo", color: "#f97316" },
  { id: "demo_done", label: "Demo Done", color: "#ec4899" },
  { id: "proposal_sent", label: "Proposal", color: "#a855f7" },
  { id: "pilot_offered", label: "Pilot Offered", color: "#10b981" },
  { id: "pilot_active", label: "Pilot Active", color: "#22c55e" },
  { id: "won", label: "Won", color: "#10b981" },
  { id: "lost", label: "Lost", color: "#ef4444" },
];
