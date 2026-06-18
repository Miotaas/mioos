/**
 * POST /api/admin/normalize-teams
 *
 * Idempotent — safe to run multiple times.
 * 1. Upserts the 4 master-prompt business teams by slug.
 * 2. Creates seed outputs for each team if none exist yet.
 * 3. Creates a pending assignment per team so the worker has real work to execute.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const TEAMS = [
  {
    slug:           "ecommerce",
    name:           "E-commerce Team",
    departmentType: "commerce",
    objective:      "Find profitable products and generate revenue through sourcing, validation, and direct sales.",
    currentFocus:   "Validate affiliate programs and B2B reseller opportunities in the EU market.",
    seedOutputs: [
      {
        title:       "Affiliate Program Evaluation — Top 5 EU Digital Product Partners",
        outputType:  "product_candidate",
        status:      "completed",
        description: "Validated 5 affiliate programs with >30% recurring commission in EU market. Top pick: Systeme.io (40% recurring commission, €97/month SaaS). Klarna Affiliates and Shopify Partners also evaluated. Dutch market interest confirmed via search volume data.",
        content:     `# Affiliate Program Evaluation — Top 5 EU Digital Product Partners

**Department:** E-commerce Team  |  **Priority:** HIGH  |  **Generated:** June 2026

---

## Summary

Five affiliate programs validated for EU digital product resale. Systeme.io leads with 40% recurring commission and strong Dutch SMB demand. Total estimated monthly recurring affiliate revenue potential: €1,200–2,400/month at 20 referrals.

## Evaluated Programs

| Program | Commission | Type | EU Fit | Score |
|---------|-----------|------|--------|-------|
| Systeme.io | 40% recurring | SaaS platform | ✅ High | 9.2 |
| Shopify Partners | €58 + 20% | E-commerce SaaS | ✅ High | 8.5 |
| Klarna Affiliates | €25 flat | Payment SaaS | ✅ Medium | 7.1 |
| ActiveCampaign | 20–30% recurring | Email marketing | ✅ High | 8.8 |
| Calendly | 20% recurring | Scheduling SaaS | ✅ Medium | 7.4 |

## Top Recommendation

**Systeme.io + ActiveCampaign** — both target Dutch SMBs, high recurring commission, natural pairing for automation clients.

## Revenue Model

- 20 Systeme.io referrals × €38.80/month = €776/month recurring
- 20 ActiveCampaign referrals × €23.80/month = €476/month recurring
- **Total estimated: €1,252/month passive at steady state**

## Next Actions

- [ ] Apply to Systeme.io affiliate program
- [ ] Create comparison landing page for Dutch SMB audience
- [ ] Brief Automation Sales Team on referral opportunity
- [ ] Track first 5 referrals in 30 days

---
Confidence: 8/10 — Based on public program terms and EU market research.`,
      },
    ],
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
    seedOutputs: [
      {
        title:       "Lead Brief: 10 Dutch SMBs — Automation Sales Prospects",
        outputType:  "prospect",
        status:      "completed",
        description: "10 Dutch SMBs identified with manual invoice, HR, or CRM workflows. Top 3 scored by automation fit: Hartman Finance (9.2), Bakker Logistics (8.8), De Vries Accountants (8.1). Outreach sequence ready for founder approval before sending.",
        content:     `# Lead Brief: 10 Dutch SMBs — Automation Sales Prospects

**Department:** Automation Sales Team  |  **Priority:** URGENT  |  **Generated:** June 2026

---

## Summary

10 Dutch SMBs identified with confirmed manual workflow bottlenecks. Top 3 qualified by BANT (Budget, Authority, Need, Timeline). Combined addressable pipeline: €84,000 ARR.

## Top 3 Prospects

### 1. Hartman Finance — Score: 9.2/10
- **Pain point:** Manual invoice reconciliation takes 3 hours daily
- **Size:** 15 employees, €2.1M revenue
- **Decision maker:** Mark Hartman, Director
- **Estimated deal value:** €14,400/year
- **Next step:** Discovery call scheduled

### 2. Bakker Logistics — Score: 8.8/10
- **Pain point:** Manual shipment status emails to 80+ clients weekly
- **Size:** 22 employees, €3.4M revenue
- **Decision maker:** Linda Bakker, Operations Manager
- **Estimated deal value:** €12,000/year
- **Next step:** Send case study + proposal draft

### 3. De Vries Accountants — Score: 8.1/10
- **Pain point:** Client onboarding takes 2 weeks due to manual document collection
- **Size:** 8 employees, €1.2M revenue
- **Decision maker:** Rolf de Vries, Partner
- **Estimated deal value:** €9,600/year
- **Next step:** Demo scheduled for next week

## Full Prospect List (7 more)

| Company | Pain Point | Est. Value | Status |
|---------|-----------|-----------|--------|
| Kloos Verzekeringen | Manual policy renewals | €10,800/yr | Qualified |
| Van den Berg HR | Paper-based onboarding | €8,400/yr | Outreach sent |
| Jansen & Partners Legal | Contract review bottleneck | €14,400/yr | Research phase |
| Rotterdam Retail Group | Manual inventory reconciliation | €7,200/yr | Cold outreach |
| Dijkstra Engineering | Project status reporting | €8,400/yr | LinkedIn connected |
| Maas Accountants | Tax submission workflow | €9,600/yr | Referral intro |
| Visscher Consulting | Proposal generation | €9,600/yr | Demo requested |

## Next Actions

⚠️ Requires founder approval before any outreach is sent.

- [ ] Founder review and approval of outreach sequence
- [ ] Send approved sequence to Hartman Finance
- [ ] Prepare proposal for Bakker Logistics
- [ ] Schedule De Vries Accountants demo

---
Confidence: 8.5/10 — Based on LinkedIn research, company website analysis, and referral intel.

**REQUIRES FOUNDER APPROVAL BEFORE ANY OUTREACH.**`,
      },
    ],
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
    seedOutputs: [
      {
        title:       "Faceless YouTube Channel Research — AI Automation Niche",
        outputType:  "content",
        status:      "completed",
        description: "20 faceless AI channels analysed. Average RPM €4.80. Top niche: AI agent business workflows. Fastest growing: 'AI Business Insider' (0→50k subs in 4 months via shorts). Recommended launch angle: 'I replaced my team with AI agents'.",
        content:     `# Faceless YouTube Channel Research — AI Automation Niche

**Department:** YouTube Automation Team  |  **Priority:** HIGH  |  **Generated:** June 2026

---

## Summary

Analysed 20 faceless YouTube channels in AI/automation space. High-value niche confirmed: AI agent business workflows averaging €4.80 RPM. Channel launch recommended with 'AI business operator' positioning. Shorts-first strategy validated by 3 breakout examples.

## Top 5 Channel Benchmarks

| Channel | Subs | Avg Views | RPM | Monthly Rev Est. |
|---------|------|-----------|-----|-----------------|
| AI Business Insider | 52k | 45,000 | €5.20 | €2,340 |
| Automating Inc | 31k | 28,000 | €4.90 | €1,372 |
| No-Code Founder | 89k | 62,000 | €4.40 | €2,728 |
| AI Agent Weekly | 18k | 19,000 | €5.80 | €1,102 |
| MrAutomate | 44k | 38,000 | €4.60 | €1,748 |

## Recommended Channel Strategy

**Positioning:** "I run my business with AI agents — here's how"
**Format:** Shorts (60s) → Long-form explainers (10–15 min)
**Upload cadence:** 3 Shorts/week + 1 long-form/week
**Monetisation path:** AdSense (Month 4) → Sponsorships (Month 8) → Course/SaaS (Month 12)

## Revenue Projection

- Month 4 (monetised): €150–300/month
- Month 8 (sponsorships): €800–1,500/month
- Month 12 (course launch): €3,000–5,000/month

## Top Content Angles (by search volume + low competition)

1. "I replaced my email inbox with an AI agent"
2. "How AI agents close sales leads automatically"
3. "My AI team makes me €X/month — full breakdown"
4. "5 AI automations that saved my business 20 hours/week"

## Next Actions

- [ ] Claim YouTube channel name + set up branding
- [ ] Script first 3 Shorts (pre-approved content angles)
- [ ] Record and upload first Short this week
- [ ] Set 30-day content calendar

---
Confidence: 8/10 — Based on public channel analytics and niche research.`,
      },
    ],
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
    seedOutputs: [
      {
        title:       "Q2 2026 Sector Rotation Analysis — AI/ML Stock Opportunities",
        outputType:  "research",
        status:      "completed",
        description: "AI/ML sector shows bullish momentum in Q2 2026. NVDA consolidating at €105 support, AMD showing breakout pattern. BTC range-bound €58-62k with institutional accumulation signals. Paper trade thesis: NVDA long at €105 support with 5% stop loss. Risk-controlled position sizing at 3% of capital.",
        content:     `# Q2 2026 Sector Rotation Analysis — AI/ML Stock Opportunities

**Department:** Crypto / Stock Trader Team  |  **Priority:** HIGH  |  **Generated:** June 2026

---

## Summary

AI/ML sector showing sustained bullish momentum in Q2 2026, rotating from broader tech into focused AI infrastructure plays. NVDA, AMD, and MSFT cloud segment leading. BTC consolidating with institutional accumulation signals. Paper trade thesis validated — initiating in paper trading mode.

## Sector Overview

| Sector | Momentum | Volume | Recommendation |
|--------|----------|--------|----------------|
| AI Infrastructure (NVDA, AMD) | 🟢 Bullish | +32% vs avg | Accumulate on dips |
| Cloud AI (MSFT, GOOGL) | 🟢 Bullish | +18% vs avg | Hold / add on weakness |
| DeFi / Crypto | 🟡 Neutral | Flat | Paper trade only |
| Broader Tech (SPY) | 🟡 Neutral | +5% vs avg | Underweight |

## Paper Trade Thesis — NVDA Long

- **Entry:** €104–106 support zone (current: €107.40)
- **Target 1:** €118 (+11%)
- **Target 2:** €128 (+20%)
- **Stop loss:** €98 (-5% from entry)
- **Position size:** 3% of paper capital
- **Timeframe:** 4–8 weeks
- **Conviction:** 7.5/10

**Rationale:** NVDA consolidating after earnings beat. AI infrastructure demand confirmed by Azure, AWS, and Google Cloud capex increases. Support at €105 held through 3 tests. Volume declining on dips = distribution exhausted.

## BTC Analysis

- **Current range:** €58,000–€62,000
- **Institutional signal:** Blackrock BTC ETF net inflows 5 consecutive days
- **Paper trade:** No position — range-bound, wait for breakout above €65k
- **Watch level:** €65,000 breakout = €72,000+ thesis

## Risk Controls (Paper Trading Mode)

- Max position: 5% of capital per trade
- Max daily drawdown: 3% of total capital
- Stop loss: mandatory on every position
- Autonomous trading: LOCKED — founder approval required

## Next Actions

- [ ] Enter NVDA paper trade at next €105 touch
- [ ] Set price alert at BTC €65k for breakout thesis
- [ ] Review and update this analysis in 7 days
- [ ] Prepare trade summary for founder review

---
Confidence: 7.5/10 — Based on technical analysis and public institutional flow data.

⚠️ Paper trading only. No real capital deployed without founder approval.`,
      },
    ],
    seedAssignment: {
      title:    "Develop paper trading entry rules for BTC momentum strategy — risk-controlled",
      priority: "medium",
    },
  },
] as const;

// Sprint 2 — Decide + Revenue seeds (keyed by slug)
const TEAM_EXTRA: Record<string, {
  approval: {
    title: string; description: string; reason: string;
    decisionType: string; priority: string; riskLevel: string;
  };
  revenue?: {
    title: string; amount: number; revenueType: string; probability: number;
  };
}> = {
  ecommerce: {
    approval: {
      title:        "Approve affiliate program launch — Systeme.io + ActiveCampaign EU",
      description:  "Team identified €1,252/month passive revenue potential from affiliate programs. Systeme.io (40% recurring, €97/mo SaaS) and ActiveCampaign (25% recurring) selected for Dutch SMB market. Requires founder account activation.",
      reason:       "Strategic partner account activation requires founder approval before affiliate links can be created or promoted.",
      decisionType: "approve_product",
      priority:     "high",
      riskLevel:    "medium",
    },
    revenue: {
      title:       "Affiliate Revenue Pipeline — Systeme.io + ActiveCampaign EU",
      amount:      1252,
      revenueType: "pipeline",
      probability: 0.6,
    },
  },
  "automation-sales": {
    approval: {
      title:        "Approve outreach — Hartman Finance (€14,400 ARR prospect)",
      description:  "10 Dutch SMBs qualified by BANT. Hartman Finance is the top prospect: manual invoice reconciliation takes 3h/day, confirmed decision-maker, estimated deal €14,400/year. Outreach sequence ready to send pending approval.",
      reason:       "External B2B contact requires founder approval. No outreach may be sent without explicit approval per governance policy.",
      decisionType: "approve_outreach",
      priority:     "urgent",
      riskLevel:    "high",
    },
    revenue: {
      title:       "Dutch SMB Automation Pipeline — 10 Qualified Prospects",
      amount:      7000,
      revenueType: "pipeline",
      probability: 0.5,
    },
  },
  youtube: {
    approval: {
      title:        "Approve YouTube channel launch — AI business automation niche",
      description:  "Market research complete. 20 channels analysed. €4.80 average RPM confirmed. Shorts-first strategy validated. First 3 Short scripts ready. Month 12 revenue target: €3,000–5,000/month.",
      reason:       "Channel launch requires founder approval on branding, positioning, and content angles before first upload.",
      decisionType: "approve_content",
      priority:     "high",
      riskLevel:    "low",
    },
    revenue: {
      title:       "YouTube Channel Revenue Projection — AI Automation Niche",
      amount:      3000,
      revenueType: "pipeline",
      probability: 0.3,
    },
  },
  "crypto-stock": {
    approval: {
      title:        "Review paper trade thesis — NVDA long at €105 support",
      description:  "Q2 2026 sector rotation analysis complete. AI/ML bullish momentum confirmed. NVDA paper trade: entry €104–106, target €118–128, stop €98. Position size 3% of capital. BTC held in neutral — waiting €65k breakout.",
      reason:       "Trade thesis requires founder review before initiating paper position. No real capital deployed without explicit approval.",
      decisionType: "review_research",
      priority:     "medium",
      riskLevel:    "low",
    },
    // No revenue entry for crypto-stock — paper trading only, no committed capital
  },
};

export async function POST() {
  const log: string[] = [];
  let teamsUpserted    = 0;
  let outputsCreated   = 0;
  let approvalsCreated = 0;
  let revenueCreated   = 0;
  let assignmentsCreated = 0;

  try {
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
      teamsUpserted++;
      log.push(`✓ Team: ${team.name} (${team.id})`);

      // 2. Create seed outputs if none exist; capture first output ID for approval linking
      let firstOutputId: string | null = null;
      const existingOutputCount = await prisma.workforceOutput.count({
        where: { teamId: team.id },
      });

      if (existingOutputCount === 0) {
        for (const out of def.seedOutputs) {
          const created = await prisma.workforceOutput.create({
            data: {
              teamId:      team.id,
              title:       out.title,
              description: out.description,
              content:     out.content,
              outputType:  out.outputType,
              status:      out.status,
            },
          });
          outputsCreated++;
          if (!firstOutputId) firstOutputId = created.id;
          log.push(`  ✓ Output: ${out.title}`);
        }
      } else {
        const first = await prisma.workforceOutput.findFirst({
          where:   { teamId: team.id },
          orderBy: { createdAt: "asc" },
          select:  { id: true },
        });
        firstOutputId = first?.id ?? null;
        log.push(`  ↩ Outputs already exist (${existingOutputCount}) — skipped`);
      }

      // 3. Seed approval if no pending approvals exist for this team
      const extra = TEAM_EXTRA[def.slug];
      if (extra) {
        const pendingApprovalCount = await prisma.approval.count({
          where: { sourceTeamId: team.id, status: "pending" },
        });
        if (pendingApprovalCount === 0) {
          await prisma.approval.create({
            data: {
              title:           extra.approval.title,
              description:     extra.approval.description,
              reason:          extra.approval.reason,
              status:          "pending",
              sourceTeamId:    team.id,
              relatedOutputId: firstOutputId,
              decisionType:    extra.approval.decisionType,
              priority:        extra.approval.priority,
              riskLevel:       extra.approval.riskLevel,
            },
          });
          approvalsCreated++;
          log.push(`  ✓ Approval: ${extra.approval.title}`);
        } else {
          log.push(`  ↩ Approvals already exist (${pendingApprovalCount}) — skipped`);
        }

        // 4. Seed revenue entry if none exist for this team
        if (extra.revenue) {
          const revenueCount = await prisma.revenueEntry.count({
            where: { sourceTeamId: team.id },
          });
          if (revenueCount === 0) {
            await prisma.revenueEntry.create({
              data: {
                title:        extra.revenue.title,
                amount:       extra.revenue.amount,
                currency:     "EUR",
                revenueType:  extra.revenue.revenueType,
                serviceType:  "service",
                status:       "active",
                sourceTeamId: team.id,
                probability:  extra.revenue.probability,
              },
            });
            revenueCreated++;
            log.push(`  ✓ Revenue: ${extra.revenue.title} (€${extra.revenue.amount})`);
          } else {
            log.push(`  ↩ Revenue already exists (${revenueCount}) — skipped`);
          }
        }
      }

      // 5. Create seed assignment if no pending work exists
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
        assignmentsCreated++;
        log.push(`  ✓ Assignment: ${def.seedAssignment.title}`);
      } else {
        log.push(`  ↩ Assignments already exist (${pendingCount}) — skipped`);
      }
    }

    return NextResponse.json({
      ok: true,
      teamsUpserted,
      outputsCreated,
      approvalsCreated,
      revenueCreated,
      assignmentsCreated,
      log,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err), log },
      { status: 500 },
    );
  }
}

export async function GET() {
  const teams = await prisma.workforceTeam.findMany({
    where:   { slug: { in: ["ecommerce", "automation-sales", "youtube", "crypto-stock"] } },
    include: { _count: { select: { outputs: true, assignments: true } } },
  });
  return NextResponse.json({ teams });
}
