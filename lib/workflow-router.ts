export type OpportunityType =
  | "automation_service"
  | "ecommerce_product"
  | "saas_product"
  | "content_business"
  | "internal_tool";

export interface WorkflowStep {
  departmentType: string;
  title: string;
  description: string;
  requiresApprovalNote?: string;
}

const AUTOMATION_SERVICE_KEYWORDS = [
  "automation", "automate", "workflow", "crm", "inbox", "admin", "scheduling",
  "invoice", "quote", "booking", "followup", "follow-up", "reminder",
  "logistics", "dispatch", "customer support", "ticketing", "email automation",
  "small business", "smb", "service business",
];

const ECOMMERCE_KEYWORDS = [
  "dropship", "e-commerce", "ecommerce", "product", "niche", "amazon", "shopify",
  "supplier", "alibaba", "trending", "print on demand", "physical product",
  "online store", "marketplace", "amazon fba", "retail",
];

const SAAS_KEYWORDS = [
  "saas", "software", "subscription", "app", "platform", "tool", "dashboard",
  "api", "integration", "plugin", "extension", "b2b software",
];

const CONTENT_KEYWORDS = [
  "youtube", "newsletter", "blog", "podcast", "course", "content", "audience",
  "social media", "creator", "educational", "media brand",
];

function countKeywords(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.filter(kw => lower.includes(kw)).length;
}

export function classifyOpportunityType(title: string, description?: string | null): OpportunityType {
  const text = `${title} ${description ?? ""}`;
  const scores: Record<OpportunityType, number> = {
    automation_service: countKeywords(text, AUTOMATION_SERVICE_KEYWORDS),
    ecommerce_product:  countKeywords(text, ECOMMERCE_KEYWORDS),
    saas_product:       countKeywords(text, SAAS_KEYWORDS),
    content_business:   countKeywords(text, CONTENT_KEYWORDS),
    internal_tool:      0,
  };

  const best = (Object.entries(scores) as [OpportunityType, number][])
    .sort((a, b) => b[1] - a[1])[0];

  return best[1] > 0 ? best[0] : "automation_service";
}

export function getWorkflowChain(
  type: OpportunityType,
  opportunity: { title: string; description?: string | null },
): WorkflowStep[] {
  const t = opportunity.title;
  const d = opportunity.description ?? "";

  switch (type) {
    case "automation_service":
      return [
        {
          departmentType: "research",
          title: `Validate automation service opportunity: ${t}`,
          description: [
            `Automation service opportunity identified: "${t}".`,
            d ? `Context: ${d.slice(0, 200)}` : "",
            ``,
            `Your task — validate this opportunity before Sales or Development does any work:`,
            `1. Define the exact problem being automated. What manual process exists? Who does it? How often?`,
            `2. Identify the 2-3 most viable niches or industries where this automation is most needed`,
            `3. Define the ideal customer profile (ICP): industry, company size, role, existing tech stack`,
            `4. Quantify the value: how much time or money does this automation save per customer per month?`,
            `5. Identify 5 specific companies or company types that match the ICP — use real examples`,
            `6. Research 3-5 existing solutions or competitors. What do they charge? What do they miss?`,
            `7. Estimate revenue potential: what could a single client pay per month? What is a realistic first-year revenue target?`,
            `8. Rate confidence (1-10) and list the 3 biggest risks to this opportunity`,
            ``,
            `Output format: market validation report. Sales and Development will use this directly.`,
            `Be specific — name actual niches, actual company types, actual pain points with dollar/hour values.`,
          ].filter(Boolean).join("\n"),
        },
        {
          departmentType: "sales",
          title: `Qualify automation prospects: ${t}`,
          description: [
            `Automation service opportunity: "${t}".`,
            ``,
            `IMPORTANT: The Research Team has completed a market validation for this opportunity.`,
            `Their output will be provided to you as context. Read it first, then complete your assignment.`,
            ``,
            `Your task — use the research output to:`,
            `1. Refine the ICP into a precise target profile using what research discovered`,
            `2. Build a prospect list of 8-10 specific company types with contact roles and fit scores`,
            `3. Craft an outreach strategy using the exact pain points and value the research quantified`,
            `4. Write a discovery call script that leads with the research-validated problem statement`,
            `5. Draft a pilot proposal outline showing what a first engagement looks like and at what price`,
            `6. Estimate revenue potential for 1 client and for a portfolio of 5 clients`,
            ``,
            `IMPORTANT: Do NOT contact anyone. Preparation only. All outreach requires founder approval.`,
          ].filter(Boolean).join("\n"),
          requiresApprovalNote: "Outreach requires founder approval before sending.",
        },
        {
          departmentType: "development",
          title: `Design automation system and pilot plan: ${t}`,
          description: [
            `Automation service opportunity: "${t}".`,
            ``,
            `IMPORTANT: The Research Team and Sales Team have already done their work for this opportunity.`,
            `Their outputs (market validation + prospect list + pilot proposal) will be provided as context.`,
            `Read both outputs before starting your assignment.`,
            ``,
            `Your task — use the research AND sales outputs to:`,
            `1. Design the automation workflow for the ICP the research and sales teams identified`,
            `   Format: trigger → conditions → actions → output`,
            `2. Specify the technical architecture: tools, APIs, integrations, data flows`,
            `   Ground your choices in the tech stack the research identified for the ICP`,
            `3. Write a demo script — exactly what the founder shows in a 15-minute pilot demo`,
            `   Reference the specific pain points and company types the sales team identified`,
            `4. Estimate implementation effort: hours per component, total hours for a full client build`,
            `5. Define the fastest path to a working prototype suitable for the first prospect`,
            `6. Draft a pilot delivery plan: what gets built, in what order, at what cost`,
            `7. List technical risks and what must be true for this to work at scale`,
            ``,
            `This is a planning document — no code needs to be written yet.`,
          ].filter(Boolean).join("\n"),
        },
      ];

    case "ecommerce_product":
      return [
        {
          departmentType: "research",
          title: `Validate e-commerce market opportunity: ${t}`,
          description: [
            `E-commerce opportunity identified: "${t}".`,
            d ? `Context: ${d.slice(0, 200)}` : "",
            ``,
            `Your task — validate this product opportunity before Commerce, Marketing, or Development do any work:`,
            `1. Define the target customer: demographics, interests, where they shop, what they pay`,
            `2. Validate real demand: Google Trends trajectory, Reddit/TikTok interest, Amazon search volume`,
            `3. Identify the 2-3 most specific sub-niches with the best demand/competition ratio`,
            `4. Research top 5 competitors: price points, review counts, positioning, key weaknesses`,
            `5. Estimate realistic market size and a first-year revenue target`,
            `6. Identify the primary customer pain point this product solves`,
            `7. Flag any regulatory, safety, or import risks for this product category`,
            `8. Rate confidence (1-10) and give a GO / NO-GO recommendation`,
            ``,
            `Output: market research report. Commerce and Marketing will use this directly.`,
            `Be specific — name actual sub-niches, actual competitors, actual price points.`,
          ].filter(Boolean).join("\n"),
        },
        {
          departmentType: "commerce",
          title: `Validate product economics: ${t}`,
          description: [
            `E-commerce opportunity: "${t}".`,
            ``,
            `IMPORTANT: The Research Team has validated the market for this opportunity.`,
            `Their output will be provided as context. Use their niche selection and competitor analysis.`,
            ``,
            `Your task:`,
            `1. Research specific suppliers for the niche the research team identified`,
            `2. Build a margin table: supplier cost + shipping + platform fees vs. selling price`,
            `3. Compare at least 3 suppliers with pros/cons`,
            `4. Assess fulfilment and shipping risks for the target market`,
            `5. Give a clear GO / NO-GO recommendation with the primary reason`,
            `\nDo NOT place orders or contact suppliers. Preparation only.`,
          ].filter(Boolean).join("\n"),
          requiresApprovalNote: "Product testing, orders, and ad spend require founder approval.",
        },
        {
          departmentType: "marketing",
          title: `Create ad angles for: ${t}`,
          description: [
            `E-commerce product opportunity: "${t}".`,
            `\nYour task:`,
            `1. Identify 3 distinct ad angles (emotional triggers, use cases, audiences)`,
            `2. Write 2 ad hooks per angle (first line of an ad that stops the scroll)`,
            `3. Define target audience for paid social (demographics, interests, behaviors)`,
            `4. Suggest campaign structure (cold, warm, retargeting)`,
            `5. Estimate realistic ad budget range for a first test`,
            `\nAll campaigns require founder approval before launch.`,
          ].filter(Boolean).join("\n"),
          requiresApprovalNote: "Campaigns require founder approval before launch.",
        },
        {
          departmentType: "content",
          title: `Write product copy for: ${t}`,
          description: [
            `E-commerce product: "${t}".`,
            `\nYour task:`,
            `1. Write a compelling product title and subtitle`,
            `2. Write a product description (benefit-led, 150-300 words)`,
            `3. Create 5 bullet points highlighting key benefits`,
            `4. Write 3 social media captions (one per platform: Instagram, TikTok, Facebook)`,
            `5. Draft a short email announcement (subject line + 100-word body)`,
            `\nAll content requires founder review before publishing.`,
          ].filter(Boolean).join("\n"),
          requiresApprovalNote: "Content requires founder approval before publishing.",
        },
        {
          departmentType: "development",
          title: `Plan product landing page: ${t}`,
          description: [
            `E-commerce product: "${t}".`,
            `\nYour task:`,
            `1. Define landing page sections (hero, problem, solution, social proof, CTA)`,
            `2. List technical requirements (Shopify theme, custom page, tracking pixels)`,
            `3. Specify conversion tracking setup (FB Pixel, GA4, TikTok Pixel)`,
            `4. Estimate build time and any required tools or subscriptions`,
            `5. Define launch checklist (before any traffic is sent)`,
            `\nDeployment requires founder approval before going live.`,
          ].filter(Boolean).join("\n"),
          requiresApprovalNote: "Deployment requires founder approval before going live.",
        },
      ];

    case "saas_product":
      return [
        {
          departmentType: "research",
          title: `Validate SaaS market for: ${t}`,
          description: [
            `SaaS opportunity identified: "${t}".`,
            d ? `Context: ${d.slice(0, 200)}` : "",
            `\nYour task:`,
            `1. Define the core problem and who experiences it`,
            `2. Estimate market size (TAM, SAM, SOM)`,
            `3. Identify 5 direct competitors with pricing and positioning`,
            `4. Find what's missing or underserved in current solutions`,
            `5. Identify 5 potential early customers to interview`,
            `6. Give a GO / NO-GO recommendation with revenue potential estimate`,
          ].filter(Boolean).join("\n"),
        },
        {
          departmentType: "development",
          title: `Define MVP scope for: ${t}`,
          description: [
            `SaaS product: "${t}".`,
            `\nYour task:`,
            `1. Define the ONE core feature that tests the hypothesis`,
            `2. List what is in scope vs. out of scope for v1`,
            `3. Estimate build effort (days/weeks) for a solo developer`,
            `4. Recommend tech stack (framework, database, auth, hosting)`,
            `5. Define 3 acceptance criteria for "ready to test with first users"`,
          ].filter(Boolean).join("\n"),
          requiresApprovalNote: "Build approval needed before significant development starts.",
        },
        {
          departmentType: "marketing",
          title: `Create launch strategy for: ${t}`,
          description: [
            `SaaS product: "${t}".`,
            `\nYour task:`,
            `1. Define positioning statement and unique value proposition`,
            `2. Identify the best launch channel (ProductHunt, LinkedIn, Reddit, etc.)`,
            `3. Plan a pre-launch waitlist strategy`,
            `4. Write landing page headline and 3 key benefit statements`,
            `5. Outline a 30-day launch content plan`,
          ].filter(Boolean).join("\n"),
        },
      ];

    case "content_business":
      return [
        {
          departmentType: "research",
          title: `Research content niche for: ${t}`,
          description: [
            `Content/audience business opportunity: "${t}".`,
            d ? `Context: ${d.slice(0, 200)}` : "",
            `\nYour task:`,
            `1. Validate audience size and engagement (YouTube subscribers, subreddit size, etc.)`,
            `2. Identify top 5 creators/publishers in this niche`,
            `3. Find underserved angles or content gaps`,
            `4. Estimate monetization potential (sponsors, products, courses, affiliate)`,
            `5. Recommend a content format and posting cadence for traction`,
          ].filter(Boolean).join("\n"),
        },
        {
          departmentType: "content",
          title: `Create content plan for: ${t}`,
          description: [
            `Content business: "${t}".`,
            `\nYour task:`,
            `1. Write 10 content ideas with titles and angles`,
            `2. Plan a content calendar for the first 4 weeks`,
            `3. Draft the first piece of content (script, article, or newsletter)`,
            `4. Define the content voice and brand positioning`,
            `5. Identify content repurposing opportunities across platforms`,
          ].filter(Boolean).join("\n"),
          requiresApprovalNote: "Content requires founder review before publishing.",
        },
        {
          departmentType: "marketing",
          title: `Build distribution strategy for: ${t}`,
          description: [
            `Content business: "${t}".`,
            `\nYour task:`,
            `1. Define the primary distribution channel and growth strategy`,
            `2. Identify 3 collaboration or cross-promotion opportunities`,
            `3. Plan initial audience seeding (communities, forums, networks)`,
            `4. Set 30/60/90 day audience growth targets`,
            `5. Design a lead capture mechanism (newsletter opt-in, community, etc.)`,
          ].filter(Boolean).join("\n"),
        },
      ];

    case "internal_tool":
      return [
        {
          departmentType: "operations",
          title: `Document inefficiency for: ${t}`,
          description: [
            `Internal tool/automation opportunity: "${t}".`,
            d ? `Context: ${d.slice(0, 200)}` : "",
            `\nYour task:`,
            `1. Map the current manual process step-by-step`,
            `2. Identify where time is wasted or errors occur`,
            `3. Estimate time saved per week if automated`,
            `4. Define the minimum viable automation (what to build first)`,
            `5. List any existing tools that could solve this without custom code`,
          ].filter(Boolean).join("\n"),
        },
        {
          departmentType: "development",
          title: `Build internal tool: ${t}`,
          description: [
            `Internal automation: "${t}".`,
            `\nYour task:`,
            `1. Design the technical solution (scripts, Zapier, Make, custom tool)`,
            `2. Build or configure the automation`,
            `3. Test with a real workflow`,
            `4. Document how to use and maintain it`,
            `5. Report time saved and any edge cases discovered`,
          ].filter(Boolean).join("\n"),
          requiresApprovalNote: "Significant builds require founder approval if external cost is involved.",
        },
      ];
  }
}

export function workflowTypeLabel(type: OpportunityType): string {
  const labels: Record<OpportunityType, string> = {
    automation_service: "Automation Service",
    ecommerce_product:  "E-commerce Product",
    saas_product:       "SaaS Product",
    content_business:   "Content Business",
    internal_tool:      "Internal Tool",
  };
  return labels[type] ?? type;
}
