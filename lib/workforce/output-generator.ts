import { getAIProvider, isAIEnabled } from "@/lib/ai/provider";
import { getDepartmentPrompt, STRUCTURED_OUTPUT_INSTRUCTIONS, ARTIFACT_PROMPT_ADDITIONS } from "@/lib/ai/prompts";

export type TeamDepartmentType =
  | "research" | "sales" | "marketing" | "content" | "operations"
  | "development" | "commerce" | "support" | "executive"
  | "lead_generation" | "outreach" | "ads" | "writing"
  | "strategy" | "project_management" | "custom"
  | "digital_commerce" | "fulfillment" | "engineering" | "dev" | "ceo";

export type OutputType =
  | "research" | "product_candidate" | "prospect" | "campaign"
  | "content" | "automation" | "tool" | "mvp"
  | "support_insight" | "process_improvement" | "revenue_opportunity"
  | "approval_request" | "briefing_note";

// Maps team departmentType to the best WorkforceOutput outputType
export function resolveOutputType(departmentType: string): OutputType {
  const map: Record<string, OutputType> = {
    research:           "research",
    sales:              "prospect",
    lead_generation:    "prospect",
    outreach:           "prospect",
    marketing:          "campaign",
    ads:                "campaign",
    content:            "content",
    writing:            "content",
    operations:         "process_improvement",
    strategy:           "process_improvement",
    project_management: "process_improvement",
    custom:             "process_improvement",
    development:        "tool",
    engineering:        "tool",
    dev:                "tool",
    mvp:                "mvp",
    commerce:           "product_candidate",
    digital_commerce:   "product_candidate",
    fulfillment:        "automation",
    support:            "support_insight",
    executive:          "briefing_note",
    ceo:                "briefing_note",
  };
  return map[departmentType.toLowerCase()] ?? "process_improvement";
}

// System prompt for internal MioOS analysis requests.
const INTERNAL_ANALYSIS_SYSTEM_PROMPT = `You are the Executive Intelligence layer inside MioOS, an Autonomous Company Operating System.
The founder has submitted an internal analysis request. You have been provided with live data pulled directly from the MioOS database.
Your job is to analyze the provided context and answer the founder's question using ONLY the data given.
Do NOT generate generic market research. Do NOT invent data or use placeholder values.
Be specific: name actual projects, cite actual blockers, quote actual progress numbers and revenue figures from the context.
Your output must be directly useful for the founder to make decisions right now.`;

interface GenerateOptions {
  title: string;
  description: string | null;
  departmentType: string;
  teamName: string;
  priority: string;
  memoryContext?: string;    // past team outputs, feedback, and decisions
  internalContext?: string;  // live MioOS data for internal requests
}

export async function generateOutputContent(opts: GenerateOptions): Promise<string> {
  const { title, description, departmentType, teamName, priority, memoryContext, internalContext } = opts;
  const outputType = resolveOutputType(departmentType);
  const now = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  if (isAIEnabled()) {
    const ai = getAIProvider();

    let systemPrompt: string;
    let userPrompt: string;

    if (internalContext) {
      // Internal request: analyze live MioOS data, not external market
      systemPrompt = INTERNAL_ANALYSIS_SYSTEM_PROMPT;
      userPrompt = buildInternalAnalysisPrompt(title, description, internalContext);
    } else {
      // External request: standard department prompt + artifact-type additions
      systemPrompt = getDepartmentPrompt(departmentType);
      const basePrompt = buildAIPrompt(title, description, outputType, priority);
      const memoryNote = memoryContext ? `\n\n## Context from Previous Work\n${memoryContext}` : "";
      const artifactNote = ARTIFACT_PROMPT_ADDITIONS[departmentType.toLowerCase()] ?? "";
      userPrompt = basePrompt + memoryNote + artifactNote + STRUCTURED_OUTPUT_INSTRUCTIONS;
    }

    try {
      const aiContent = await ai.generate(userPrompt, systemPrompt);
      return wrapAIOutput(aiContent, title, teamName, priority, now);
    } catch {
      // Fall through to template on AI error
    }
  }

  return buildTemplate(title, description, outputType, teamName, priority, now);
}

function buildInternalAnalysisPrompt(
  title: string,
  description: string | null,
  internalContext: string,
): string {
  const desc = description && description !== title ? `\n\nFounder's full request: "${description}"` : "";
  return `## Founder Request\n"${title}"${desc}\n\n${internalContext}\n\n---\n\nBased ONLY on the MioOS data above, answer the founder's request.\n\nIf the request asks for risks, list the 3 biggest risks with:\n- Why it matters (business impact)\n- Evidence from the data above (specific names, numbers, status)\n- Recommended next action\n\nIf the request asks for priorities, derive them from blockers, stalled goals, overdue tasks, and pending approvals in the data.\n\nStructure your response as:\n\n## Summary\n[2-3 sentence answer]\n\n## Analysis\n[Detailed findings based on the data]\n\n## Recommendations\n[3-5 numbered, specific, actionable recommendations]\n\n## Next Actions\n[3-5 checkbox items using "- [ ] " format]\n\n---\nConfidence: [X/10] — [one sentence on data completeness]`;
}

function wrapAIOutput(content: string, title: string, teamName: string, priority: string, date: string): string {
  const header = `# ${title}\n\n**Department:** ${teamName}  |  **Priority:** ${priority.toUpperCase()}  |  **Generated:** ${date}\n\n---\n\n`;
  return header + content;
}

function buildAIPrompt(
  title: string,
  description: string | null,
  outputType: OutputType,
  priority: string,
): string {
  const desc = description ? `\nContext: ${description}` : "";
  const templates: Record<OutputType, string> = {
    research:            `Produce a research report for: "${title}"${desc}\n\nCover: Key Findings, Market Overview, Key Players, Opportunities, Risks.`,
    prospect:            `Create a prospect brief for: "${title}"${desc}\n\nCover: Target Profile, Top 5 Prospects with fit scores, Outreach Strategy, Qualification Criteria.`,
    campaign:            `Create a campaign brief for: "${title}"${desc}\n\nCover: Campaign Goal, Target Audience, Channels, Key Message, Budget Estimate, Success Metrics.`,
    content:             `Produce a content brief for: "${title}"${desc}\n\nCover: Content Type, Target Audience, Key Message, Outline, SEO Considerations, Call-to-Action.`,
    process_improvement: `Document a process improvement for: "${title}"${desc}\n\nCover: Current State, Problem Statement, Proposed Solution, Implementation Steps, Expected Impact.`,
    tool:                `Create a technical specification for: "${title}"${desc}\n\nCover: Objective, Requirements, Technical Approach, Implementation Plan, Acceptance Criteria.`,
    mvp:                 `Create an MVP plan for: "${title}"${desc}\n\nCover: Hypothesis, Core Features, Success Metrics, Build Timeline, Launch Criteria.`,
    product_candidate:   `Validate this product opportunity: "${title}"${desc}\n\nCover: Problem, Solution, Market Size, Competition, Revenue Model, Risks, Recommendation.`,
    support_insight:     `Document this support insight: "${title}"${desc}\n\nCover: Issue Summary, Root Cause, Customer Impact, Resolution, Prevention Steps.`,
    briefing_note:       `Write an executive briefing for: "${title}"${desc}\n\nCover: Situation Summary, Key Points, Decisions Required.`,
    automation:          `Design an automation workflow for: "${title}"${desc}\n\nCover: Trigger, Steps, Conditions, Expected Output, Implementation Notes.`,
    revenue_opportunity: `Evaluate this revenue opportunity: "${title}"${desc}\n\nCover: Opportunity Summary, Revenue Potential, Required Investment, Timeline, Risk Assessment.`,
    approval_request:    `Create an approval request for: "${title}"${desc}\n\nCover: Request Summary, Justification, Options Considered, Recommended Action, Impact if Approved.`,
  };
  return (templates[outputType] ?? templates.process_improvement) + `\n\nPriority: ${priority}. Be specific and actionable.`;
}

function buildTemplate(
  title: string,
  description: string | null,
  outputType: OutputType,
  teamName: string,
  priority: string,
  date: string,
): string {
  const desc = description ? `\n**Brief:** ${description}\n` : "";
  const header = `# ${templateTitle(outputType)}: ${title}\n\n**Department:** ${teamName}  |  **Priority:** ${priority.toUpperCase()}  |  **Generated:** ${date}${desc}\n\n---\n\n`;

  let main: string;

  switch (outputType) {
    case "research":
      main = `## Summary\n\nResearch has been queued for "${title}". Initial findings will be populated once data sources are reviewed. This report covers market signals, competitive context, and strategic relevance.\n\n## Main Content\n\n### Key Findings\n\n1. Topic "${title}" has been registered for research.\n2. Market signals and relevant data points will be surfaced here.\n3. Cross-reference with existing knowledge base is in progress.\n\n### Market Overview\n\nPending data collection. Research scope includes market size, growth trajectory, and key players.\n\n### Risks\n\n- Data freshness: confirm all findings are from the last 12 months\n- Confirmation bias: validate assumptions with multiple sources\n\n## Recommendations\n\n1. Validate this research priority with the executive team\n2. Identify 2–3 authoritative data sources to pull from\n3. Cross-reference findings with current business goals\n4. Share completed report with Sales for qualification\n\n## Next Actions\n\n- [ ] Review research scope with team\n- [ ] Pull primary data sources\n- [ ] Draft initial findings summary\n- [ ] Schedule review call with executive\n\n---\nConfidence: 3/10 — Template output; AI provider not configured for this instance.`;
      break;

    case "prospect":
      main = `## Summary\n\nProspect qualification has been initiated for "${title}". This brief covers target profile criteria, initial prospect candidates, and outreach strategy pending founder approval.\n\n## Main Content\n\n### Target Profile\n\n- **ICP:** Based on assignment context\n- **Company Size:** TBD based on qualification\n- **Pain Point:** ${description ?? "To be qualified in discovery call"}\n- **Buying Signal:** Engagement with relevant content or events\n\n### Prospect Candidates\n\n| Company | Contact | Fit Score | Pain Point | Next Step |\n|---------|---------|-----------|------------|-----------|\n| — | — | — | TBD | Research |\n\n### Outreach Strategy\n\n1. Initial contact via LinkedIn connection request\n2. Email follow-up within 24h with value proposition\n3. Discovery call to qualify budget, authority, need, timeline\n\n## Recommendations\n\n1. Define ICP criteria before sourcing prospects\n2. Limit initial outreach to 5–10 well-qualified leads\n3. Personalize each touchpoint based on company context\n4. Set a 2-week follow-up cadence\n\n## Next Actions\n\n- [ ] Define ICP criteria with founder\n- [ ] Source top 10 prospect candidates\n- [ ] Prepare personalized outreach templates\n- [ ] Get founder approval before any outreach\n\n---\nConfidence: 3/10 — Template output; AI provider not configured for this instance.\n\n**Requires founder approval before any outreach.**`;
      break;

    case "campaign":
      main = `## Summary\n\nCampaign brief initiated for "${title}". This document outlines the campaign goal, target audience, channel strategy, and success metrics. Requires founder approval before launch.\n\n## Main Content\n\n### Campaign Goal\n\nDrive awareness and qualified leads for ${title}.\n\n### Target Audience\n\n${description ?? "To be defined based on ICP and qualification criteria."}\n\n### Channel Strategy\n\n- [ ] LinkedIn organic + paid\n- [ ] Email newsletter\n- [ ] Content marketing (blog/SEO)\n- [ ] Referral/partnership\n\n### Key Message\n\nTo be developed in collaboration with Content Team.\n\n### Budget Estimate\n\nTBD — requires founder approval before any spend.\n\n## Recommendations\n\n1. Start with one channel to test before scaling\n2. Define success metrics before launch (CTR, CPL, conversion rate)\n3. Create 3 ad variations for A/B testing\n4. Set a 2-week review checkpoint\n\n## Next Actions\n\n- [ ] Define campaign goal and KPIs with founder\n- [ ] Select primary channel for first test\n- [ ] Brief Content Team on messaging\n- [ ] Get founder approval before launch\n\n---\nConfidence: 3/10 — Template output; AI provider not configured for this instance.\n\n**Requires founder approval before campaign launch.**`;
      break;

    case "content":
      main = `## Summary\n\nContent brief drafted for "${title}". Outlines the content type, target audience, messaging framework, and publishing plan. Requires review before publication.\n\n## Main Content\n\n### Content Type\n\nArticle / Post / Newsletter (TBD)\n\n### Target Audience\n\n${description ?? "Business decision-makers and founders in the target market."}\n\n### Outline\n\n1. Introduction — hook and context (why this matters now)\n2. Core insight or argument\n3. Supporting examples or data points\n4. Practical takeaways\n5. Call-to-action\n\n### SEO Considerations\n\n- Primary keyword: [to be defined]\n- Secondary keywords: [to be defined]\n- Target word count: 1,000–1,500 words\n\n## Recommendations\n\n1. Lead with a contrarian angle or surprising insight\n2. Include at least one original data point or case study\n3. End with a clear, low-friction CTA\n4. Repurpose across LinkedIn and email after publishing\n\n## Next Actions\n\n- [ ] Define target keyword and audience\n- [ ] Write first draft\n- [ ] Founder review\n- [ ] Schedule for publishing\n\n---\nConfidence: 3/10 — Template output; AI provider not configured for this instance.\n\n**Requires founder approval before publishing.**`;
      break;

    case "tool":
    case "automation":
      main = `## Summary\n\nTechnical specification drafted for "${title}". Covers the objective, requirements, technical approach, and implementation plan.\n\n## Main Content\n\n### Objective\n\n${description ?? title}\n\n### Requirements\n\n- Functional: [to be specified]\n- Non-functional: fast, reliable, maintainable\n- Integrations: [to be specified]\n\n### Technical Approach\n\n1. Define inputs and outputs\n2. Select appropriate technology stack\n3. Design data model\n4. Implement core logic\n5. Add error handling and logging\n\n### Acceptance Criteria\n\n- [ ] All functional requirements met\n- [ ] Error cases handled gracefully\n- [ ] Documentation complete\n\n## Recommendations\n\n1. Start with the simplest version that solves the core problem\n2. Build in observability from day one (logs, metrics)\n3. Write a test for each critical path\n4. Ship iteratively — don't wait for perfection\n\n## Next Actions\n\n- [ ] Confirm requirements with founder\n- [ ] Set up project repository\n- [ ] Build MVP version\n- [ ] Schedule demo and review\n\n---\nConfidence: 3/10 — Template output; AI provider not configured for this instance.`;
      break;

    case "mvp":
      main = `## Summary\n\nMVP plan drafted for "${title}". Defines the core hypothesis, minimum feature set, success criteria, and launch plan.\n\n## Main Content\n\n### Hypothesis\n\n${description ?? `"${title}" solves a real problem that customers will pay for.`}\n\n### Core Features (MVP Scope)\n\n1. [Feature 1 — must-have]\n2. [Feature 2 — must-have]\n3. [Feature 3 — must-have]\n\n### Out of Scope (v1)\n\n- Nice-to-have features deferred to v2\n\n### Success Metrics\n\n- Acquisition: [X] sign-ups in first 30 days\n- Activation: [Y]% complete core workflow\n- Revenue: [Z] paying customers by day 60\n\n## Recommendations\n\n1. Interview 5 potential customers before writing a single line of code\n2. Build the smallest version that tests the core hypothesis\n3. Set a hard deadline — ship in 4–6 weeks\n4. Define "success" before launch so you can be honest about results\n\n## Next Actions\n\n- [ ] Customer discovery interviews (5 minimum)\n- [ ] Define MVP feature set\n- [ ] Build and ship MVP\n- [ ] Gather feedback from first users\n\n---\nConfidence: 3/10 — Template output; AI provider not configured for this instance.`;
      break;

    case "product_candidate":
      main = `## Summary\n\nProduct opportunity validation initiated for "${title}". This report covers problem definition, solution concept, market sizing, and initial recommendation.\n\n## Main Content\n\n### Problem\n\n${description ?? "Market problem to be validated through customer interviews and research."}\n\n### Solution Concept\n\n${title} — addressing the problem with a targeted solution.\n\n### Market Size\n\n- Total Addressable Market (TAM): TBD\n- Serviceable Addressable Market (SAM): TBD\n- Initial Target Segment: TBD\n\n### Competition\n\n| Competitor | Strengths | Weaknesses | Pricing |\n|------------|-----------|------------|--------|\n| — | — | — | — |\n\n### Revenue Model\n\nSubscription / One-time / Service — TBD based on validation\n\n## Recommendations\n\n1. Validate problem exists with 5–10 prospect interviews\n2. Test willingness to pay before building\n3. Identify one unique advantage over existing solutions\n4. Build MVP only after problem and payment are validated\n\n## Next Actions\n\n- [ ] Conduct 5 customer discovery interviews\n- [ ] Research top 3 competitors\n- [ ] Define pricing model\n- [ ] Present validation results to founder\n\n---\nConfidence: 3/10 — Template output; AI provider not configured for this instance.`;
      break;

    case "support_insight":
      main = `## Summary\n\nSupport insight documented for "${title}". Covers issue context, root cause analysis, customer impact, and resolution strategy.\n\n## Main Content\n\n### Issue Summary\n\n${title}\n\n### Context\n\n${description ?? "No additional context provided."}\n\n### Root Cause\n\nPending investigation. Common causes to evaluate:\n- Process gap\n- Missing documentation\n- Product limitation\n- Communication breakdown\n\n### Customer Impact\n\nImpact level: [Low / Medium / High] — TBD based on frequency and severity.\n\n### Resolution Steps\n\n1. Investigate root cause\n2. Document findings and impact\n3. Apply immediate fix or workaround\n4. Update knowledge base and FAQ\n\n## Recommendations\n\n1. Add this issue to the FAQ to reduce repeat tickets\n2. Investigate if the root cause is systemic\n3. Consider a proactive outreach to affected customers\n4. Track recurrence rate for 30 days after resolution\n\n## Next Actions\n\n- [ ] Investigate and confirm root cause\n- [ ] Apply fix or workaround\n- [ ] Update customer-facing documentation\n- [ ] Add to knowledge base\n\n---\nConfidence: 3/10 — Template output; AI provider not configured for this instance.`;
      break;

    case "briefing_note":
      main = `## Summary\n\n${description ?? title} — executive briefing prepared for founder review.\n\n## Main Content\n\n### Situation\n\n${description ?? title}\n\n### Key Points\n\n- Status update requires review\n- Decisions pending from previous cycle\n- Strategic focus items identified\n\n### Business Impact\n\nImpact assessment pending founder review.\n\n## Recommendations\n\n1. Review all pending approvals before end of day\n2. Prioritize items with revenue impact\n3. Delegate where possible to reduce bottlenecks\n\n## Next Actions\n\n- [ ] Review and acknowledge this briefing\n- [ ] Action any pending decisions\n- [ ] Update relevant team members\n- [ ] Schedule follow-up if needed\n\n---\nConfidence: 3/10 — Template output; AI provider not configured for this instance.`;
      break;

    case "process_improvement":
    default:
      main = `## Summary\n\nProcess improvement documented for "${title}". Covers current state, problem statement, proposed solution, and implementation steps.\n\n## Main Content\n\n### Current State\n\n${description ?? "Current process to be documented and analyzed."}\n\n### Problem Statement\n\nInefficiency or gap identified in "${title}" that is creating friction, cost, or delay.\n\n### Proposed Solution\n\nImprovement to be designed and validated.\n\n### Implementation Steps\n\n1. Document current process in detail\n2. Identify all friction points and root causes\n3. Design improved process\n4. Test with a small scope\n5. Roll out and monitor\n\n## Recommendations\n\n1. Quantify the current cost of the problem before designing a solution\n2. Get buy-in from all affected team members\n3. Start with the smallest change that creates measurable improvement\n4. Monitor results for 30 days after implementation\n\n## Next Actions\n\n- [ ] Document current process\n- [ ] Identify and prioritize pain points\n- [ ] Design improved process\n- [ ] Pilot and measure results\n\n---\nConfidence: 3/10 — Template output; AI provider not configured for this instance.`;
      break;
  }

  return header + main;
}

function templateTitle(t: OutputType): string {
  const titles: Record<OutputType, string> = {
    research:            "Research Report",
    prospect:            "Prospect Brief",
    campaign:            "Campaign Brief",
    content:             "Content Brief",
    process_improvement: "Process Brief",
    tool:                "Technical Spec",
    mvp:                 "MVP Brief",
    product_candidate:   "Product Validation",
    support_insight:     "Support Insight",
    briefing_note:       "Executive Briefing",
    automation:          "Automation Spec",
    revenue_opportunity: "Revenue Analysis",
    approval_request:    "Approval Request",
  };
  return titles[t] ?? "Output";
}
