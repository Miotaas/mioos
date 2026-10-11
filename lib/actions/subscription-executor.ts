/**
 * AI Ventures — subscription / recurring revenue loop (Phase B+).
 *
 * Turns a won prospect into: setup fee (one-off, on first invoice) + monthly
 * subscription + recurring revenue tracking (MRR). Every money action is
 * founder-gated. Reuses existing models only. Provider-agnostic (PaymentProvider).
 *
 * Sellable as: setup fee, monthly retainer, Mail Co-Pilot plan, automation
 * maintenance, website care plan — each is just a Stripe Price id.
 */
import { prisma } from "@/lib/db";
import { getPaymentProvider } from "@/lib/providers";
import type { WebhookEvent } from "@/lib/providers";

interface SubPayload {
  prospectId?: string;
  customerEmail: string;
  customerName?: string;
  priceId: string;
  monthlyCents: number;
  setupCents: number;
  currency: string;
  subRevenueEntryId: string;
  setupRevenueEntryId?: string;
}

async function aiVenturesBuId(): Promise<string | null> {
  const bu = await prisma.businessUnit.findUnique({ where: { slug: "ai-ventures" } }).catch(() => null);
  return bu?.id ?? null;
}

/** Founder approval to start a subscription (setup fee + monthly). Nothing charged until approved. */
export async function raiseSubscriptionApproval(
  prospectId: string,
  opts: { priceId: string; monthlyCents: number; setupCents?: number; currency?: string },
): Promise<{ approvalId: string; subRevenueEntryId: string } | null> {
  const p = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!p || !p.email || !opts.priceId || opts.monthlyCents <= 0) return null;
  const buId = await aiVenturesBuId();
  const currency = opts.currency ?? "EUR";
  const setupCents = Math.round(opts.setupCents ?? 0);

  const subRev = await prisma.revenueEntry.create({
    data: {
      title: `Subscription: ${p.companyName} — ${p.recommendedOffer ?? "monthly plan"}`,
      amount: opts.monthlyCents / 100, currency, revenueType: "pipeline", serviceType: "service", status: "active",
      businessUnitId: buId, billingType: "subscription", mrrCents: opts.monthlyCents, subscriptionStatus: "incomplete",
    },
  });
  let setupRev: { id: string } | null = null;
  if (setupCents > 0) {
    setupRev = await prisma.revenueEntry.create({
      data: {
        title: `Setup fee: ${p.companyName}`, amount: setupCents / 100, currency, revenueType: "pipeline",
        serviceType: "service", status: "active", businessUnitId: buId, billingType: "one_off",
      },
    });
  }

  const payload: SubPayload = {
    prospectId, customerEmail: p.email, customerName: p.companyName, priceId: opts.priceId,
    monthlyCents: opts.monthlyCents, setupCents, currency, subRevenueEntryId: subRev.id, setupRevenueEntryId: setupRev?.id,
  };
  const team = await prisma.workforceTeam.findFirst({ where: { slug: { in: ["automation-revenue", "website-revenue", "sales"] } }, select: { id: true } });
  const output = team ? await prisma.workforceOutput.create({
    data: { teamId: team.id, businessUnitId: buId, title: `Subscription request: ${p.companyName}`, description: `€${setupCents / 100} setup + €${opts.monthlyCents / 100}/mo`, content: JSON.stringify(payload), outputType: "proposal", status: "in_review" },
  }) : null;

  const approval = await prisma.approval.create({
    data: {
      title: `Approve subscription — ${p.companyName} (€${setupCents / 100} setup + €${opts.monthlyCents / 100}/mo)`,
      description: `Create Stripe customer + subscription for ${p.email}. Setup fee €${setupCents / 100}, then €${opts.monthlyCents / 100}/month.`,
      reason: `Won prospect → recurring plan (${p.recommendedOffer ?? "service"}).`,
      status: "pending", decisionType: "approve_subscription", riskLevel: "high",
      businessUnitId: buId, relatedOutputId: output?.id ?? null,
    },
  });
  return { approvalId: approval.id, subRevenueEntryId: subRev.id };
}

export interface SubRunSummary { scanned: number; started: number; failed: number; skipped: number; }

export async function processApprovedSubscriptions(): Promise<SubRunSummary> {
  const s: SubRunSummary = { scanned: 0, started: 0, failed: 0, skipped: 0 };
  const approvals = await prisma.approval.findMany({ where: { decisionType: "approve_subscription", status: "approved", relatedOutputId: { not: null } }, take: 10 });
  s.scanned = approvals.length;
  const provider = getPaymentProvider();

  for (const approval of approvals) {
    const output = await prisma.workforceOutput.findUnique({ where: { id: approval.relatedOutputId! } });
    if (!output?.content) { s.skipped++; continue; }
    let payload: SubPayload;
    try { payload = JSON.parse(output.content) as SubPayload; } catch { s.skipped++; continue; }

    // Idempotency claim: only proceed if the subscription row has no Stripe subscription yet.
    const claim = await prisma.revenueEntry.updateMany({ where: { id: payload.subRevenueEntryId, stripeSubscriptionId: null }, data: { stripeSubscriptionId: `pending:${approval.id}` } });
    if (claim.count !== 1) { s.skipped++; continue; }

    const exec = await prisma.executionHistory.create({ data: { approvalId: approval.id, agentId: "workforce", actionType: "subscription.create", actionPayload: JSON.stringify({ subRevenueEntryId: payload.subRevenueEntryId, to: payload.customerEmail, priceId: payload.priceId }), status: "pending" } });

    try {
      if (!provider.isConfigured()) throw new Error("Payment provider not configured — set STRIPE_SECRET_KEY");
      // 1. Customer (approval-gated)
      const customer = await provider.createCustomer({ email: payload.customerEmail, name: payload.customerName, metadata: { mioos: "ai-ventures" } });
      // 2. Subscription with setup fee on first invoice (approval-gated)
      const sub = await provider.createSubscription({ customerId: customer.customerId, priceId: payload.priceId, setupFeeCents: payload.setupCents, currency: payload.currency, metadata: { revenueEntryId: payload.subRevenueEntryId, approvalId: approval.id } });

      await prisma.revenueEntry.update({ where: { id: payload.subRevenueEntryId }, data: { stripeCustomerId: customer.customerId, stripeSubscriptionId: sub.subscriptionId, externalRef: sub.invoiceId ?? null, subscriptionStatus: sub.status, revenueType: "potential" } });
      if (payload.setupRevenueEntryId) await prisma.revenueEntry.update({ where: { id: payload.setupRevenueEntryId }, data: { stripeCustomerId: customer.customerId, stripeSubscriptionId: sub.subscriptionId, externalRef: sub.invoiceId ?? null, revenueType: "potential" } });

      await prisma.executionHistory.update({ where: { id: exec.id }, data: { status: "executed", executedAt: new Date() } });
      await prisma.actionResult.upsert({
        where: { approvalId: approval.id },
        update: { actionType: "subscription.create", status: "sent", title: `Subscription started — ${payload.customerName ?? payload.customerEmail}`, description: `sub ${sub.subscriptionId} · invoice ${sub.invoiceId ?? "?"}`, targetType: "revenue_entry", targetId: payload.subRevenueEntryId, error: null },
        create: { approvalId: approval.id, actionType: "subscription.create", status: "sent", title: `Subscription started — ${payload.customerName ?? payload.customerEmail}`, description: `sub ${sub.subscriptionId}`, targetType: "revenue_entry", targetId: payload.subRevenueEntryId },
      });
      if (payload.prospectId) await prisma.prospect.updateMany({ where: { id: payload.prospectId }, data: { status: "won" } });
      s.started++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Subscription failed";
      await prisma.revenueEntry.update({ where: { id: payload.subRevenueEntryId }, data: { stripeSubscriptionId: null } }).catch(() => {}); // release claim
      await prisma.executionHistory.update({ where: { id: exec.id }, data: { status: "failed", error: message, executedAt: new Date() } });
      await prisma.actionResult.upsert({ where: { approvalId: approval.id }, update: { actionType: "subscription.create", status: "failed", title: "Subscription failed", error: message }, create: { approvalId: approval.id, actionType: "subscription.create", status: "failed", title: "Subscription failed", error: message } });
      s.failed++;
    }
  }
  return s;
}

/** Founder approval to cancel a subscription. */
export async function raiseCancelApproval(subRevenueEntryId: string): Promise<{ approvalId: string } | null> {
  const rev = await prisma.revenueEntry.findUnique({ where: { id: subRevenueEntryId } });
  if (!rev?.stripeSubscriptionId) return null;
  const buId = await aiVenturesBuId();
  const team = await prisma.workforceTeam.findFirst({ where: { slug: { in: ["automation-revenue", "sales"] } }, select: { id: true } });
  const output = team ? await prisma.workforceOutput.create({ data: { teamId: team.id, businessUnitId: buId, title: `Cancel subscription: ${rev.title}`, content: JSON.stringify({ subRevenueEntryId, subscriptionId: rev.stripeSubscriptionId }), outputType: "proposal", status: "in_review" } }) : null;
  const approval = await prisma.approval.create({ data: { title: `Approve cancel — ${rev.title}`, description: `Cancel Stripe subscription ${rev.stripeSubscriptionId}. MRR will drop by €${(rev.mrrCents ?? 0) / 100}/mo.`, status: "pending", decisionType: "approve_subscription_cancel", riskLevel: "high", businessUnitId: buId, relatedOutputId: output?.id ?? null } });
  return { approvalId: approval.id };
}

export async function processApprovedCancellations(): Promise<{ scanned: number; canceled: number; failed: number }> {
  const out = { scanned: 0, canceled: 0, failed: 0 };
  const approvals = await prisma.approval.findMany({ where: { decisionType: "approve_subscription_cancel", status: "approved", relatedOutputId: { not: null } }, take: 10 });
  out.scanned = approvals.length;
  const provider = getPaymentProvider();
  for (const approval of approvals) {
    const output = await prisma.workforceOutput.findUnique({ where: { id: approval.relatedOutputId! } });
    if (!output?.content) continue;
    let payload: { subRevenueEntryId: string; subscriptionId: string };
    try { payload = JSON.parse(output.content); } catch { continue; }
    const rev = await prisma.revenueEntry.findUnique({ where: { id: payload.subRevenueEntryId } });
    if (!rev || rev.subscriptionStatus === "canceled") continue; // idempotent
    try {
      await provider.cancelSubscription(payload.subscriptionId);
      await prisma.revenueEntry.update({ where: { id: payload.subRevenueEntryId }, data: { subscriptionStatus: "canceled" } });
      await prisma.actionResult.upsert({ where: { approvalId: approval.id }, update: { actionType: "subscription.cancel", status: "sent", title: "Subscription canceled", targetType: "revenue_entry", targetId: payload.subRevenueEntryId, error: null }, create: { approvalId: approval.id, actionType: "subscription.cancel", status: "sent", title: "Subscription canceled", targetType: "revenue_entry", targetId: payload.subRevenueEntryId } });
      out.canceled++;
    } catch { out.failed++; }
  }
  return out;
}

/** Apply a Stripe subscription/invoice webhook to revenue tracking. */
export async function handleSubscriptionWebhook(event: WebhookEvent): Promise<boolean> {
  const subId = event.subscriptionId;
  if (!subId) return false;
  if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
    await prisma.revenueEntry.updateMany({ where: { stripeSubscriptionId: subId, billingType: "one_off" }, data: { status: "closed_won", revenueType: "live", paidAt: new Date() } });
    await prisma.revenueEntry.updateMany({ where: { stripeSubscriptionId: subId, billingType: "subscription" }, data: { subscriptionStatus: "active", revenueType: "live", status: "closed_won", paidAt: new Date() } });
    return true;
  }
  if (event.type === "invoice.payment_failed") {
    await prisma.revenueEntry.updateMany({ where: { stripeSubscriptionId: subId, billingType: "subscription" }, data: { subscriptionStatus: "past_due" } });
    return true;
  }
  if (event.type.startsWith("customer.subscription.")) {
    const status = event.status ?? "active";
    await prisma.revenueEntry.updateMany({ where: { stripeSubscriptionId: subId, billingType: "subscription" }, data: { subscriptionStatus: status, ...(status === "active" ? { revenueType: "live" } : {}) } });
    return true;
  }
  return false;
}

/** Monthly recurring revenue = sum of active subscription rows' mrrCents. */
export async function getMRR(businessUnitSlug = "ai-ventures"): Promise<{ mrrCents: number; activeSubscriptions: number }> {
  const bu = await prisma.businessUnit.findUnique({ where: { slug: businessUnitSlug } }).catch(() => null);
  const rows = await prisma.revenueEntry.findMany({ where: { billingType: "subscription", subscriptionStatus: "active", ...(bu ? { businessUnitId: bu.id } : {}) }, select: { mrrCents: true } });
  return { mrrCents: rows.reduce((sum, r) => sum + (r.mrrCents ?? 0), 0), activeSubscriptions: rows.length };
}
