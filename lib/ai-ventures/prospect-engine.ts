/**
 * AI Ventures Revenue Engine (Sprint 1).
 *
 * Analyzes a Prospect, detects pain points, matches an offer, generates a
 * mini-audit + outreach drafts, estimates deal value, and creates an OUTREACH
 * approval in Decide. Reuses existing models only: Prospect, WorkforceOutput,
 * Approval, BusinessUnit, AI provider. Sends nothing — founder approval gated.
 *
 * Note: without a crawler, website scores are AI/heuristic ESTIMATES from the
 * available company signals, clearly labeled as such in the audit.
 */
import { prisma } from "@/lib/db";
import { isAIEnabled, getAIProvider } from "@/lib/ai/provider";
import { matchOffer, estimateDealValue, getOffer, trackForOffer } from "@/lib/ai-ventures/offers";
import { analyzeWebsite } from "@/lib/ai-ventures/website-analyzer";

interface Analysis {
  websiteScore: number; trustScore: number; conversionScore: number; mobileScore: number;
  speedEstimate: string; ctaQuality: string; painPoints: string[]; opportunities: string[];
}

function clampScore(n: unknown, dflt: number): number {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(1, Math.min(10, Math.round(v))) : dflt;
}

function heuristicAnalysis(p: { website?: string | null; industry?: string | null; painPointHypothesis?: string | null }): Analysis {
  const hasSite = Boolean(p.website);
  const pains: string[] = [];
  if (!hasSite) pains.push("No website / weak online presence");
  else pains.push("Outdated design", "Weak call-to-action", "No lead capture form");
  if (p.painPointHypothesis) pains.push(p.painPointHypothesis);
  return {
    websiteScore: hasSite ? 4 : 2, trustScore: 4, conversionScore: 3, mobileScore: 5,
    speedEstimate: "unknown (estimate)", ctaQuality: "weak",
    painPoints: pains,
    opportunities: ["Modernize site for conversions", "Automate inbound enquiries", "Capture leads automatically"],
  };
}

async function aiAnalysis(p: { companyName: string; website?: string | null; industry?: string | null; painPointHypothesis?: string | null }): Promise<Analysis> {
  const ai = getAIProvider();
  const prompt = `You are auditing a prospect for an AI services agency. Estimate (you cannot crawl the site — infer from the signals) and return ONLY a JSON object:
{"websiteScore":1-10,"trustScore":1-10,"conversionScore":1-10,"mobileScore":1-10,"speedEstimate":"fast|average|slow","ctaQuality":"strong|average|weak","painPoints":["..."],"opportunities":["..."]}
Company: ${p.companyName}
Website: ${p.website ?? "(none)"}
Industry: ${p.industry ?? "(unknown)"}
Known pain hypothesis: ${p.painPointHypothesis ?? "(none)"}
Focus pain points on: outdated design, weak CTAs, missing contact forms, no lead capture, poor navigation, manual/repetitive workflows. Do NOT invent revenue numbers.`;
  try {
    const raw = await ai.generate(prompt);
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return heuristicAnalysis(p);
    const j = JSON.parse(m[0]);
    return {
      websiteScore: clampScore(j.websiteScore, 4), trustScore: clampScore(j.trustScore, 4),
      conversionScore: clampScore(j.conversionScore, 3), mobileScore: clampScore(j.mobileScore, 5),
      speedEstimate: String(j.speedEstimate ?? "unknown"), ctaQuality: String(j.ctaQuality ?? "weak"),
      painPoints: Array.isArray(j.painPoints) ? j.painPoints.map(String).slice(0, 8) : [],
      opportunities: Array.isArray(j.opportunities) ? j.opportunities.map(String).slice(0, 8) : [],
    };
  } catch {
    return heuristicAnalysis(p);
  }
}

function buildAudit(company: string, offer: { name: string; description: string }, a: Analysis, value: { setup: number; monthly: number }): string {
  return `## Mini-Audit — ${company}

### Executive Summary
${company} shows a website/automation score of ${a.websiteScore}/10. There is a clear opportunity to improve conversions and automate manual work via **${offer.name}**. (Scores are estimates pending a full review.)

### Current Problems
${a.painPoints.map((p) => `- ${p}`).join("\n") || "- (none detected)"}

### Business Impact
Weak conversion and manual handling typically cost SMBs lost leads and staff hours every week. Addressing them improves lead capture and response speed.

### Recommended Solution
**${offer.name}** — ${offer.description}

### Estimated Investment
- Setup: ~€${value.setup}
- Monthly: ~€${value.monthly}
(Indicative ranges; final scope confirmed after a short call.)

### Suggested Next Step
A 15-minute call to confirm scope and show a quick before/after.

---
Requires founder approval before any outreach is sent.`;
}


async function buildOutreach(company: string, offerName: string, a: Analysis): Promise<{ email: string; linkedin: string; followup: string }> {
  if (isAIEnabled()) {
    try {
      const ai = getAIProvider();
      const raw = await ai.generate(`Write concise B2B outreach for an AI services agency to ${company}. Offer: ${offerName}. Top pain points: ${a.painPoints.slice(0,3).join("; ")}. Return ONLY JSON: {"email":"...","linkedin":"...","followup":"..."}. Each: specific, no fluff, one clear CTA (15-min call). No fake stats.`);
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) { const j = JSON.parse(m[0]); if (j.email) return { email: String(j.email), linkedin: String(j.linkedin ?? ""), followup: String(j.followup ?? "") }; }
    } catch { /* fall through */ }
  }
  const email = `Subject: A quick idea for ${company}\n\nHi ${company} team,\n\nI took a look at how you handle ${a.painPoints[0] ?? "your online presence"} and saw a fast win with ${offerName}. Worth a 15-minute call to show a before/after?\n\nBest,\nMio`;
  return { email, linkedin: `Hi — I help companies like ${company} with ${offerName}. Open to a quick chat?`, followup: `Following up on my note about ${offerName} for ${company} — still happy to show a quick example. 15 minutes this week?` };
}

function priorityScore(a: Analysis, value: { setup: number; monthly: number }): number {
  const need = (10 - a.websiteScore) * 6;       // worse site = more opportunity
  const recurring = Math.min(40, value.monthly / 40); // recurring revenue weighted
  return Math.max(1, Math.min(100, Math.round(need + recurring)));
}

export interface AnalyzeResult { prospectId: string; revenueTrack: string; recommendedOffer: string; setup: number; monthly: number; approvalId: string | null; }

export async function analyzeProspect(prospectId: string): Promise<AnalyzeResult> {
  const p = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!p) throw new Error(`Prospect ${prospectId} not found`);

  // Prefer REAL measured signals from the live site; fall back to AI estimate, then heuristic.
  let a: Analysis;
  const measured = p.website ? await analyzeWebsite(p.website).catch(() => null) : null;
  if (measured) {
    a = measured;
  } else if (isAIEnabled()) {
    a = await aiAnalysis(p);
  } else {
    a = heuristicAnalysis(p);
  }
  // Autonomous contact: if we have no email but the site listed one, use it.
  const resolvedEmail = p.email ?? measured?.contactEmail ?? null;
  const offerId = matchOffer({ industry: p.industry, painPoints: a.painPoints, websiteScore: a.websiteScore });
  const offer = getOffer(offerId)!;
  const track = trackForOffer(offerId); // "website" | "automation"
  const complexity = offerId === "ai-website-refresh" ? 0.3 : 0.55;
  const value = estimateDealValue(offerId, complexity);
  const audit = buildAudit(p.companyName, offer, a, value);
  const drafts = await buildOutreach(p.companyName, offer.name, a);
  const priority = priorityScore(a, value);

  const bu = await prisma.businessUnit.findUnique({ where: { slug: "ai-ventures" } }).catch(() => null);

  await prisma.prospect.update({
    where: { id: prospectId },
    data: {
      websiteScore: a.websiteScore, trustScore: a.trustScore, conversionScore: a.conversionScore,
      mobileScore: a.mobileScore, speedEstimate: a.speedEstimate, ctaQuality: a.ctaQuality,
      painPoints: JSON.stringify(a.painPoints), opportunities: JSON.stringify(a.opportunities),
      recommendedOffer: offer.name, suggestedOffer: offer.name,
      estimatedSetupValue: value.setup, estimatedMonthlyValue: value.monthly,
      auditSummary: audit, outreachDraft: drafts.email, linkedinDraft: drafts.linkedin, followupDraft: drafts.followup,
      priorityScore: priority, businessUnitId: bu?.id ?? null, revenueTrack: track, status: "awaiting_approval",
      ...(resolvedEmail && !p.email ? { email: resolvedEmail } : {}),
    },
  });

  // Carrier output (reused by approval-dispatcher on approval to create the EmailDraft).
  const team = await prisma.workforceTeam.findFirst({ where: { slug: { in: ["sales", "ai-ventures", "development"] } }, select: { id: true } });
  let outputId: string | null = null;
  if (team) {
    const out = await prisma.workforceOutput.create({
      data: {
        teamId: team.id, businessUnitId: bu?.id ?? null,
        title: `[${track === "website" ? "Website" : "Automation"}] Outreach: ${p.companyName} — ${offer.name}`,
        description: `Offer: ${offer.name} · est. €${value.setup} setup / €${value.monthly} mo`,
        content: drafts.email, outputType: "prospect", status: "in_review",
      },
    });
    outputId = out.id;
  }

  // OUTREACH approval → appears in Decide.
  const approval = await prisma.approval.create({
    data: {
      title: `Outreach to ${p.companyName} (${offer.name})`,
      description: `Approve outreach for ${p.companyName}. Estimated value: €${value.setup} setup / €${value.monthly} monthly.`,
      reason: audit.slice(0, 1500),
      status: "pending", decisionType: "approve_outreach", riskLevel: "medium",
      businessUnitId: bu?.id ?? null, relatedOutputId: outputId,
    },
  });

  // Create the sendable draft NOW, with a recipient, so approval -> runtime send actually works.
  // Without a recipient email the outbound executor skips it (that was the send blocker).
  if (resolvedEmail) {
    await prisma.emailDraft.create({
      data: {
        title: `Outreach: ${p.companyName}`,
        subject: `A quick idea for ${p.companyName}`,
        body: drafts.email.replace(/^Subject:.*\n+/, ""),
        recipientName: p.companyName,
        recipientEmail: resolvedEmail,
        status: "draft",
        sourceApprovalId: approval.id,
      },
    });
  }

  return { prospectId, revenueTrack: track, recommendedOffer: offer.name, setup: value.setup, monthly: value.monthly, approvalId: approval.id };
}
