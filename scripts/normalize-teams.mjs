/**
 * Normalize the 4 master-prompt business teams in the database.
 * Run with: node scripts/normalize-teams.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEAMS = [
  {
    slug:           "ecommerce",
    name:           "E-commerce Team",
    departmentType: "commerce",
    objective:      "Find profitable products and generate revenue through sourcing, validation, and direct sales.",
    currentFocus:   "Validate affiliate programs and B2B reseller opportunities in the EU market.",
    seedOutput: {
      title:       "Affiliate Program Evaluation — Top 5 EU Digital Product Partners",
      outputType:  "product_candidate",
      status:      "completed",
      description: "Validated 5 affiliate programs with >30% recurring commission in EU market. Top pick: Systeme.io (40% recurring, €97/month SaaS). Klarna Affiliates and ActiveCampaign also evaluated. Dutch market interest confirmed.",
      content:     "# Affiliate Program Evaluation\n\n**Team:** E-commerce Team\n\n## Summary\n\nFive affiliate programs validated. Systeme.io leads with 40% recurring commission. Estimated €1,252/month passive at 20 referrals.\n\n## Top Picks\n\n1. **Systeme.io** — 40% recurring, €97/mo SaaS, score: 9.2\n2. **ActiveCampaign** — 20-30% recurring, email/CRM, score: 8.8\n3. **Shopify Partners** — €58 flat + 20%, score: 8.5\n\n## Next Actions\n- [ ] Apply to Systeme.io affiliate program\n- [ ] Create Dutch comparison landing page\n- [ ] Brief Automation Sales Team on referral opportunity\n\n---\nConfidence: 8/10",
    },
    seedAssignment: {
      title:    "Validate B2B SaaS reseller opportunity — Mail Co-Pilot EU distribution",
      priority: "high",
    },
  },
  {
    slug:           "automation-sales",
    name:           "Automation Sales Team",
    departmentType: "sales",
    objective:      "Acquire B2B clients by identifying operational inefficiencies and designing automation solutions.",
    currentFocus:   "Qualify Dutch SMBs with manual workflows and convert to automation service clients.",
    seedOutput: {
      title:       "Lead Brief: 10 Dutch SMBs — Automation Sales Prospects",
      outputType:  "prospect",
      status:      "completed",
      description: "10 Dutch SMBs identified with manual invoice, HR, or CRM workflows. Top 3: Hartman Finance (9.2), Bakker Logistics (8.8), De Vries Accountants (8.1). Combined pipeline: €84,000 ARR. Requires founder approval before outreach.",
      content:     "# Lead Brief: 10 Dutch SMBs\n\n**Team:** Automation Sales Team\n\n## Summary\n\n10 prospects qualified by BANT. Combined addressable pipeline: €84,000 ARR.\n\n## Top 3 Prospects\n\n1. **Hartman Finance** — Manual invoice reconciliation (3h/day). Score: 9.2. Value: €14,400/yr\n2. **Bakker Logistics** — Manual client status emails (80+ weekly). Score: 8.8. Value: €12,000/yr\n3. **De Vries Accountants** — Manual document collection onboarding. Score: 8.1. Value: €9,600/yr\n\n## Next Actions\n⚠️ Requires founder approval before outreach.\n- [ ] Founder review of outreach sequence\n- [ ] Send approved sequence to Hartman Finance\n- [ ] Prepare proposal for Bakker Logistics\n\n---\nConfidence: 8.5/10 — Requires founder approval before any outreach.",
    },
    seedAssignment: {
      title:    "Design automation proposal for Dutch accounting firm — invoice-to-CRM workflow",
      priority: "urgent",
    },
  },
  {
    slug:           "youtube",
    name:           "YouTube Automation Team",
    departmentType: "content",
    objective:      "Build and scale faceless YouTube channels to generate advertising and sponsorship revenue.",
    currentFocus:   "Research and develop content for AI automation and business channels.",
    seedOutput: {
      title:       "Faceless YouTube Channel Research — AI Automation Niche",
      outputType:  "content",
      status:      "completed",
      description: "20 faceless AI channels analysed. Average RPM €4.80. Top niche: AI agent business workflows. 'AI Business Insider' hit 50k subs in 4 months via Shorts. Recommended: launch with 'I run my business with AI agents' positioning.",
      content:     "# Faceless YouTube Channel Research — AI Automation Niche\n\n**Team:** YouTube Automation Team\n\n## Summary\n\n20 faceless AI channels analysed. €4.80 average RPM. Shorts-first strategy validated.\n\n## Top 5 Benchmarks\n\n| Channel | Subs | Est. Monthly Rev |\n|---------|------|------------------|\n| AI Business Insider | 52k | €2,340 |\n| No-Code Founder | 89k | €2,728 |\n| Automating Inc | 31k | €1,372 |\n| AI Agent Weekly | 18k | €1,102 |\n| MrAutomate | 44k | €1,748 |\n\n## Strategy\n\n**Positioning:** 'I run my business with AI agents — here's how'\n**Format:** 3 Shorts/week + 1 long-form/week\n**Month 12 target:** €3,000–5,000/month\n\n## Next Actions\n- [ ] Claim channel name + branding\n- [ ] Script first 3 Shorts\n- [ ] Set 30-day content calendar\n\n---\nConfidence: 8/10",
    },
    seedAssignment: {
      title:    "Script 3 YouTube Shorts: How AI agents run my business autonomously",
      priority: "high",
    },
  },
  {
    slug:           "crypto-stock",
    name:           "Crypto / Stock Trader Team",
    departmentType: "research",
    objective:      "Grow capital through systematic research, validated trade proposals, and disciplined risk-controlled execution.",
    currentFocus:   "Develop paper trading strategy with sector rotation signals for Q2 2026.",
    seedOutput: {
      title:       "Q2 2026 Sector Rotation Analysis — AI/ML Stock Opportunities",
      outputType:  "research",
      status:      "completed",
      description: "AI/ML sector bullish momentum confirmed Q2 2026. NVDA consolidating €105 support, AMD breakout pattern forming. BTC range-bound €58-62k with institutional accumulation. Paper trade thesis: NVDA long at €105, 5% stop. Risk-controlled at 3% position size.",
      content:     "# Q2 2026 Sector Rotation Analysis — AI/ML\n\n**Team:** Crypto / Stock Trader Team\n\n## Summary\n\nAI/ML sector bullish. NVDA, AMD, MSFT cloud leading. BTC consolidating with institutional signals. Paper trading initiated.\n\n## Key Analysis\n\n| Asset | Signal | Recommendation |\n|-------|--------|----------------|\n| NVDA | 🟢 Bullish | Long at €105 support |\n| AMD | 🟢 Bullish | Breakout pattern |\n| MSFT | 🟢 Bullish | Hold cloud exposure |\n| BTC | 🟡 Neutral | Wait for €65k breakout |\n\n## Paper Trade Thesis — NVDA\n\n- Entry: €104–106 | Target: €118–128 | Stop: €98\n- Position: 3% of capital\n- Conviction: 7.5/10\n\n⚠️ Paper trading only. No real capital without founder approval.\n\n---\nConfidence: 7.5/10",
    },
    seedAssignment: {
      title:    "Develop paper trading entry rules for BTC momentum strategy",
      priority: "medium",
    },
  },
];

async function main() {
  console.log("Normalizing master-prompt business teams...\n");

  for (const def of TEAMS) {
    // 1. Upsert team
    const team = await prisma.workforceTeam.upsert({
      where:  { slug: def.slug },
      create: {
        name:           def.name,
        slug:           def.slug,
        departmentType: def.departmentType,
        objective:      def.objective,
        currentFocus:   def.currentFocus,
        status:         "active",
      },
      update: {
        name:         def.name,
        objective:    def.objective,
        currentFocus: def.currentFocus,
        status:       "active",
      },
    });
    console.log(`✓ Team: ${team.name} (${team.id})`);

    // 2. Seed output if none exist
    const outputCount = await prisma.workforceOutput.count({ where: { teamId: team.id } });
    if (outputCount === 0) {
      await prisma.workforceOutput.create({
        data: {
          teamId:      team.id,
          title:       def.seedOutput.title,
          description: def.seedOutput.description,
          content:     def.seedOutput.content,
          outputType:  def.seedOutput.outputType,
          status:      def.seedOutput.status,
        },
      });
      console.log(`  ✓ Output: ${def.seedOutput.title}`);
    } else {
      console.log(`  ↩ Outputs exist (${outputCount}) — skipped`);
    }

    // 3. Seed assignment if none pending
    const pendingCount = await prisma.assignment.count({
      where: { teamId: team.id, status: { in: ["pending", "active"] } },
    });
    if (pendingCount === 0) {
      await prisma.assignment.create({
        data: {
          title:    def.seedAssignment.title,
          teamId:   team.id,
          status:   "pending",
          priority: def.seedAssignment.priority,
        },
      });
      console.log(`  ✓ Assignment: ${def.seedAssignment.title}`);
    } else {
      console.log(`  ↩ Assignments exist (${pendingCount}) — skipped`);
    }
  }

  console.log("\nDone.");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
