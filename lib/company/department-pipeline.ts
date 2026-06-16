/**
 * Department Pipeline — Sequential Autonomous Execution Chain
 *
 * When a team completes an assignment linked to an opportunity,
 * this module advances the opportunity to the next department in the chain.
 *
 * Context accumulation: every new stage receives ALL prior stage outputs,
 * not just the immediately preceding one. So:
 *   Stage 0 (Research) → stored
 *   Stage 1 (Sales)    → receives Research output
 *   Stage 2 (Development) → receives Research + Sales output
 *
 * This ensures every team builds on the full body of prior work.
 */

import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/auditLog";
import { getWorkflowChain, type OpportunityType } from "@/lib/workflow-router";

// Status labels that map pipeline stage index to opportunity status
const STAGE_STATUS_MAP: Record<number, string> = {
  0: "researching",
  1: "validating",
  2: "validating",
  3: "building",
  4: "building",
  5: "marketing",
};

function stageStatus(index: number): string {
  return STAGE_STATUS_MAP[index] ?? "building";
}

/**
 * Called by executor after an assignment completes.
 * Finds the next stage in the opportunity's workflow chain and creates the next assignment.
 */
export async function advanceToNextStage(
  opportunityId: string,
  completedOutput: { id: string; content: string; title: string },
): Promise<{ advanced: boolean; nextDept?: string }> {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    select: {
      id: true, title: true, description: true, opportunityType: true,
      workflowChain: true, currentStageIndex: true, score: true, confidence: true,
      estimatedRevenue: true, projectId: true, goalId: true, status: true,
    },
  });

  if (!opportunity) return { advanced: false };
  if (["rejected", "archived", "live", "revenue_generating"].includes(opportunity.status)) {
    return { advanced: false };
  }

  // Parse the stored workflow chain
  let chain: string[];
  try {
    chain = JSON.parse(opportunity.workflowChain ?? "[]") as string[];
  } catch {
    return { advanced: false };
  }

  if (chain.length === 0) return { advanced: false };

  const nextIndex = opportunity.currentStageIndex + 1;
  if (nextIndex >= chain.length) {
    // Final stage complete — mark opportunity as ready for deployment/live
    await prisma.opportunity.update({
      where: { id: opportunityId },
      data: {
        status:       "approved",
        currentStage: "pipeline_complete",
      },
    });
    console.log(`[pipeline] Opportunity "${opportunity.title}" pipeline complete`);
    return { advanced: false };
  }

  const nextDeptType = chain[nextIndex];

  // Find an active team for this department
  const nextTeam = await prisma.workforceTeam.findFirst({
    where: { departmentType: nextDeptType, status: "active" },
  });
  if (!nextTeam) {
    console.warn(`[pipeline] No active team for department "${nextDeptType}" — skipping stage ${nextIndex}`);
    return { advanced: false };
  }

  // Accumulate ALL prior stage outputs for this opportunity (ordered oldest → newest).
  // Every new stage receives the full body of prior work, not just the last stage.
  // Budget: up to 1200 chars per prior output so the total context stays usable.
  const priorOutputsRaw = await prisma.workforceOutput.findMany({
    where:   { opportunityId: opportunityId, content: { not: null } },
    orderBy: { createdAt: "asc" },
    select:  { title: true, content: true, outputType: true },
  });
  const priorOutputs = priorOutputsRaw.map(o => ({ ...o, content: o.content ?? "" }));

  const assignment = await prisma.assignment.create({
    data: {
      title:         buildNextStageTitle(nextDeptType, opportunity.title, nextIndex),
      description:   buildNextStageDescription(nextDeptType, opportunity, priorOutputs, chain),
      teamId:        nextTeam.id,
      priority:      opportunity.score >= 7 ? "high" : "medium",
      status:        "pending",
      opportunityId: opportunityId,
      projectId:     opportunity.projectId ?? null,
      goalId:        opportunity.goalId ?? null,
    },
  });

  await prisma.runtimeQueue.create({
    data: {
      teamId:       nextTeam.id,
      assignmentId: assignment.id,
      title:        assignment.title,
      description:  assignment.description?.slice(0, 500) ?? "",
      priority:     assignment.priority,
      source:       "pipeline",
      status:       "queued",
    },
  });

  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      currentStageIndex: nextIndex,
      currentStage:      nextDeptType,
      status:            stageStatus(nextIndex),
    },
  });

  await auditLog("opportunity", opportunityId, "pipeline_advanced", {
    fromStage:    chain[nextIndex - 1],
    toStage:      nextDeptType,
    stageIndex:   nextIndex,
    assignmentId: assignment.id,
  });

  console.log(`[pipeline] "${opportunity.title}" → stage ${nextIndex}: ${nextDeptType} (assignment: ${assignment.id.slice(0, 8)})`);

  return { advanced: true, nextDept: nextDeptType };
}

function buildNextStageTitle(dept: string, opportunityTitle: string, stageIndex: number): string {
  const stageLabel = stageIndex === 1 ? "Validate" : stageIndex <= 2 ? "Analyse" : "Execute";
  const deptLabels: Record<string, string> = {
    sales:      `Qualify prospects for`,
    marketing:  `Build campaign for`,
    content:    `Create assets for`,
    development:`Build demo/plan for`,
    operations: `Prepare delivery for`,
    support:    `Prepare support docs for`,
    commerce:   `Validate economics of`,
    research:   `Deep research on`,
    executive:  `Strategic review of`,
  };
  const prefix = deptLabels[dept] ?? `${stageLabel}: ${dept} stage for`;
  return `${prefix}: ${opportunityTitle}`.slice(0, 180);
}

// Per-department instructions that reference prior stages explicitly.
// Key: `dept:opportunityType` or just `dept` as fallback.
const STAGE_INSTRUCTIONS: Record<string, string> = {
  // automation_service chain: research → sales → development
  "sales:automation_service": [
    `You are receiving validated research from the Research Team above.`,
    `Use their findings — the identified niche, ICP, pain points, and market signals — to:`,
    `1. Refine the ICP into a precise target profile (industry, company size, role, tech stack)`,
    `2. Build a prospect list of 8-10 specific company types with contact roles and fit scores`,
    `3. Craft a personalized outreach strategy using the exact pain points the research identified`,
    `4. Write a discovery call script that leads with the research-validated problem`,
    `5. Draft a pilot proposal outline showing what a first engagement would look like`,
    `6. Estimate revenue potential for a single client and for a portfolio of 5 clients`,
    `\nIMPORTANT: Do NOT contact anyone. This is preparation only. Outreach requires founder approval.`,
  ].join("\n"),

  "development:automation_service": [
    `You are receiving research from the Research Team and a qualified prospect list from the Sales Team above.`,
    `Use the research (niche, problem, market) and sales output (ICP, prospect profiles, pilot proposal) to:`,
    `1. Design the automation workflow: trigger → conditions → actions → output for the validated use case`,
    `2. Specify the technical architecture: tools, integrations, data flows, APIs involved`,
    `3. Write a demo script — exactly what the founder would show in a 15-minute pilot demo`,
    `4. Estimate implementation effort: hours per component, total hours for a full build`,
    `5. Identify the fastest path to a working prototype that could be shown to the first prospect`,
    `6. List technical risks, dependencies, and what must be true for this to work at scale`,
    `7. Draft a pilot delivery plan: what gets built, in what order, at what cost`,
  ].join("\n"),

  // ecommerce_product chain: research → commerce → marketing → content → development
  "commerce:ecommerce_product": [
    `You are receiving market research from the Research Team above.`,
    `Use their findings — validated demand, target audience, and competitor landscape — to:`,
    `1. Research specific suppliers (AliExpress, CJDropshipping, Spocket, or alternatives)`,
    `2. Build a margin calculation table: supplier cost + shipping + platform fees vs. selling price`,
    `3. Validate demand with concrete signals: Google Trends, Amazon BSR, social volume`,
    `4. Analyse the top 3-5 competitors: price, reviews, differentiation, weaknesses`,
    `5. Assess fulfilment and shipping risks for the target market`,
    `6. Give a clear GO / NO-GO recommendation with the primary reason`,
    `\nDo NOT place orders or contact suppliers. Preparation only.`,
  ].join("\n"),

  "marketing:ecommerce_product": [
    `You are receiving market research and product validation from prior stages above.`,
    `Use the validated niche, product economics, and customer profile to:`,
    `1. Define 3 distinct ad angles targeting the pain points the research identified`,
    `2. Write 2 scroll-stopping hooks per angle (first 30 words of an ad)`,
    `3. Define the target audience for paid social: demographics, interests, behaviors`,
    `4. Propose a campaign structure: cold → warm → retargeting with budget allocation`,
    `5. Estimate realistic first-test ad budget and expected CPL/ROAS range`,
    `\nAll campaigns require founder approval before launch.`,
  ].join("\n"),

  "content:ecommerce_product": [
    `You are receiving research, product validation, and marketing angles from prior stages above.`,
    `Use the validated product and marketing positioning to write actual content — not briefs:`,
    `1. Product title (2 options) and subtitle`,
    `2. Benefit-led product description (200-300 words)`,
    `3. 5 bullet points highlighting key benefits using the pain points identified in research`,
    `4. 3 social captions ready to post (Instagram, TikTok, Facebook)`,
    `5. Email announcement: subject line + 100-word body`,
    `\nAll content requires founder review before publishing.`,
  ].join("\n"),

  "development:ecommerce_product": [
    `You are receiving research, validation, marketing, and content outputs from all prior stages above.`,
    `Use all of them to plan the technical launch infrastructure:`,
    `1. Landing page structure: sections, copy hierarchy, social proof placement, CTA`,
    `2. Technical requirements: platform (Shopify/custom), theme, apps needed`,
    `3. Tracking setup: FB Pixel, GA4, TikTok Pixel — exact event mapping`,
    `4. Conversion optimisation: checkout flow, upsell logic, email capture`,
    `5. Launch checklist: every step required before traffic is sent`,
    `6. Estimate build time and any recurring subscription costs`,
    `\nDeployment requires founder approval before going live.`,
  ].join("\n"),

  // saas_product chain: research → development → marketing
  "development:saas_product": [
    `You are receiving SaaS market research from the Research Team above.`,
    `Use their validated problem, market gap, and competitor analysis to:`,
    `1. Define the single core feature that tests the hypothesis — what is the MVP?`,
    `2. List what is in scope vs. explicitly out of scope for v1`,
    `3. Recommend the tech stack with justification (framework, database, auth, hosting)`,
    `4. Estimate build effort: hours per component for a solo developer`,
    `5. Define 3 acceptance criteria for "ready to test with first users"`,
    `6. Identify the fastest path to a demo that could be shown to a prospect`,
    `\nBuild approval needed before significant development investment starts.`,
  ].join("\n"),

  "marketing:saas_product": [
    `You are receiving market research and an MVP specification from prior stages above.`,
    `Use the validated market gap and the defined MVP to build the go-to-market plan:`,
    `1. Positioning statement: who it's for, what it does, why it's different`,
    `2. Unique value proposition grounded in the research-identified pain points`,
    `3. Best launch channel for this specific audience (ProductHunt, LinkedIn, Reddit, etc.)`,
    `4. Pre-launch waitlist strategy: where to post, what to offer, what to measure`,
    `5. Landing page headline and 3 key benefit statements aligned with the MVP scope`,
    `6. 30-day launch content plan: topics, formats, cadence`,
  ].join("\n"),

  // content_business chain: research → content → marketing
  "content:content_business": [
    `You are receiving content niche research from the Research Team above.`,
    `Use their validated audience size, monetisation potential, and identified content gaps to:`,
    `1. Define the content angle that fills the gap the research identified`,
    `2. Write 10 specific content ideas with titles and hooks — not generic topics`,
    `3. Plan a 4-week content calendar: format, topic, platform per week`,
    `4. Draft the first piece of content in full (script, article, or newsletter edition)`,
    `5. Define the content voice and brand positioning in 3 sentences`,
    `\nAll content requires founder review before publishing.`,
  ].join("\n"),

  "marketing:content_business": [
    `You are receiving research and drafted content from prior stages above.`,
    `Use the validated niche and existing content to build the distribution strategy:`,
    `1. Primary growth channel and the specific tactics to grow it`,
    `2. 3 cross-promotion or collaboration opportunities with specific creators or communities`,
    `3. Audience seeding plan: which forums, subreddits, or groups to seed first`,
    `4. 30/60/90-day audience growth targets with the metric (subscribers, followers, opens)`,
    `5. Lead capture mechanism: newsletter opt-in, community, or resource download`,
  ].join("\n"),

  // internal_tool chain: operations → development
  "development:internal_tool": [
    `You are receiving a process audit and requirements from the Operations Team above.`,
    `Use their documented inefficiencies, time estimates, and minimum viable automation to:`,
    `1. Design the technical solution: script, Zapier, Make, n8n, or custom tool`,
    `2. Specify the exact implementation: tool config, triggers, data mappings, error handling`,
    `3. Build or configure the automation — produce a working specification ready to execute`,
    `4. Write usage and maintenance documentation`,
    `5. Report expected time saved per week and any edge cases to monitor`,
  ].join("\n"),

  // Generic fallbacks per department (used if no type-specific instruction exists)
  "sales": `Use the prior stage outputs above to build a qualified prospect list and outreach strategy. Be specific — name actual company types, pain points, and outreach angles grounded in the research above.`,
  "marketing": `Use the prior stage outputs above to design a campaign. Every positioning decision must be traceable to something the prior stages uncovered. No generic messaging.`,
  "content": `Use the prior stage outputs above to write actual content — not briefs. The product descriptions, social posts, and copy must reflect the specific opportunity, niche, and customer identified earlier.`,
  "development": `Use the prior stage outputs above to produce a technical specification. The architecture and demo concept must be grounded in the niche, ICP, and requirements the prior stages identified.`,
  "operations": `Document the current process, map inefficiencies, and define the minimum viable improvement based on the prior stage context above.`,
  "commerce": `Use the prior stage outputs to validate product economics with specific supplier research, margin calculations, and demand evidence.`,
  "research": `Produce deep-dive market intelligence that the next stage (Sales or Development) can immediately act on. Be specific — name niches, companies, and pricing benchmarks.`,
  "executive": `Review the prior stage outputs and the full opportunity context above. Assess portfolio position, recommend resource allocation, and identify any decisions that need founder attention.`,
};

function getStageInstruction(dept: string, opportunityType: string): string {
  // Try type-specific instruction first, then generic department fallback
  return STAGE_INSTRUCTIONS[`${dept}:${opportunityType}`]
    ?? STAGE_INSTRUCTIONS[dept]
    ?? `Complete your department's responsibilities for this opportunity using the prior stage outputs above as your primary input. Produce a concrete, immediately actionable artifact.`;
}

function buildNextStageDescription(
  dept: string,
  opportunity: {
    title: string; description?: string | null; opportunityType: string;
    score: number; confidence: number; estimatedRevenue?: number | null;
  },
  priorOutputs: Array<{ title: string; content: string; outputType: string }>,
  chain: string[],
): string {
  // Budget: 1200 chars per prior output so total context stays manageable.
  // With 3 prior stages that's ~3600 chars of accumulated context.
  const charBudgetPerOutput = Math.max(600, Math.floor(3600 / Math.max(priorOutputs.length, 1)));

  const oppContext = [
    `Opportunity: "${opportunity.title}"`,
    opportunity.description ? `Context: ${opportunity.description.slice(0, 200)}` : "",
    `Type: ${opportunity.opportunityType} | Score: ${opportunity.score}/10 | Confidence: ${opportunity.confidence}/10`,
    opportunity.estimatedRevenue ? `Estimated Revenue: €${opportunity.estimatedRevenue.toLocaleString()}/month` : "",
  ].filter(Boolean).join("\n");

  const chainDisplay = chain.join(" → ");

  const priorOutputSection = priorOutputs.length > 0
    ? [
        `## Prior Stage Outputs (read before doing your assignment)`,
        `Pipeline: ${chainDisplay}`,
        ``,
        ...priorOutputs.flatMap((o, i) => {
          const stageLabel = chain[i] ?? o.outputType;
          return [
            `### Stage ${i + 1}: ${stageLabel.toUpperCase()} — "${o.title}"`,
            o.content.slice(0, charBudgetPerOutput),
            o.content.length > charBudgetPerOutput ? `\n[...output continues — ${o.content.length - charBudgetPerOutput} chars truncated]` : "",
            ``,
          ];
        }),
        `---`,
      ].join("\n")
    : "";

  const instruction = getStageInstruction(dept, opportunity.opportunityType);

  return [
    `## Opportunity Context`,
    oppContext,
    ``,
    priorOutputSection,
    `## Your Assignment`,
    instruction,
  ].filter(Boolean).join("\n");
}

/**
 * Creates the initial pipeline for an opportunity.
 * Called by opportunity-engine instead of creating all assignments upfront.
 * Stores the full chain and creates only stage-0 assignment.
 */
export async function startOpportunityPipeline(
  opportunityId: string,
): Promise<{ assignmentsCreated: number; chain: string[] }> {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    select: {
      id: true, title: true, description: true, opportunityType: true,
      score: true, confidence: true, estimatedRevenue: true,
      projectId: true, goalId: true, workflowRoutedAt: true,
    },
  });

  if (!opportunity || opportunity.workflowRoutedAt) return { assignmentsCreated: 0, chain: [] };

  const type = opportunity.opportunityType as OpportunityType;
  const steps = getWorkflowChain(type, {
    title:       opportunity.title,
    description: opportunity.description,
  });

  if (steps.length === 0) return { assignmentsCreated: 0, chain: [] };

  const chainDepts = steps.map(s => s.departmentType);
  const firstStep  = steps[0];

  const firstTeam = await prisma.workforceTeam.findFirst({
    where: { departmentType: firstStep.departmentType, status: "active" },
  });

  if (!firstTeam) return { assignmentsCreated: 0, chain: chainDepts };

  const assignment = await prisma.assignment.create({
    data: {
      title:         firstStep.title.slice(0, 180),
      description:   firstStep.description,
      teamId:        firstTeam.id,
      priority:      opportunity.score >= 7 ? "high" : "medium",
      status:        "pending",
      opportunityId: opportunityId,
      projectId:     opportunity.projectId ?? null,
      goalId:        opportunity.goalId ?? null,
    },
  });

  await prisma.runtimeQueue.create({
    data: {
      teamId:       firstTeam.id,
      assignmentId: assignment.id,
      title:        firstStep.title.slice(0, 180),
      description:  firstStep.description.slice(0, 500),
      priority:     opportunity.score >= 7 ? "high" : "medium",
      source:       "opportunity",
      status:       "queued",
    },
  });

  // Store full chain in opportunity for sequential advancement
  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      workflowChain:     JSON.stringify(chainDepts),
      currentStageIndex: 0,
      currentStage:      firstStep.departmentType,
      status:            "researching",
      workflowRoutedAt:  new Date(),
    },
  });

  return { assignmentsCreated: 1, chain: chainDepts };
}
