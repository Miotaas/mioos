/**
 * AI Ventures — invoice / revenue loop (Phase B).
 *
 * raiseInvoiceApproval(): founder-gated request to invoice a won prospect.
 * processApprovedInvoices(): on approval, creates a real invoice via the
 * PaymentProvider (Stripe today) and records a RevenueEntry. The webhook
 * (app/api/webhooks/stripe) flips it to closed_won on payment.
 *
 * Reuses existing models only: Approval, WorkforceOutput, RevenueEntry,
 * ExecutionHistory, ActionResult, BusinessUnit, Prospect. Provider-agnostic.
 */
import { prisma } from "@/lib/db";
import { getPaymentProvider } from "@/lib/providers";

interface InvoicePayload {
  prospectId?: string;
  customerEmail: string;
  customerName?: string;
  description: string;
  amountCents: number;
  currency: string;
  revenueEntryId: string;
}

/** Create a founder approval to invoice a prospect. Nothing is charged until approved. */
export async function raiseInvoiceApproval(prospectId: string, opts?: { amountCents?: number }): Promise<{ approvalId: string; revenueEntryId: string } | null> {
  const p = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!p || !p.email) return null;
  const bu = await prisma.businessUnit.findUnique({ where: { slug: "ai-ventures" } }).catch(() => null);
  const amountCents = Math.round(opts?.amountCents ?? (p.estimatedSetupValue ?? 0) * 100);
  if (amountCents <= 0) return null;
  const currency = "EUR";
  const description = `${p.recommendedOffer ?? "AI Ventures service"} — ${p.companyName}`;

  const rev = await prisma.revenueEntry.create({
    data: {
      title: `Invoice: ${p.companyName} — ${p.recommendedOffer ?? "service"}`,
      amount: amountCents / 100, currency, revenueType: "pipeline", serviceType: "service",
      status: "active", businessUnitId: bu?.id ?? null,
    },
  });

  const payload: InvoicePayload = { prospectId, customerEmail: p.email, customerName: p.companyName, description, amountCents, currency, revenueEntryId: rev.id };
  const team = await prisma.workforceTeam.findFirst({ where: { slug: { in: ["automation-revenue", "website-revenue", "sales"] } }, select: { id: true } });
  const output = team ? await prisma.workforceOutput.create({
    data: { teamId: team.id, businessUnitId: bu?.id ?? null, title: `Invoice request: ${p.companyName}`, description, content: JSON.stringify(payload), outputType: "proposal", status: "in_review" },
  }) : null;

  const approval = await prisma.approval.create({
    data: {
      title: `Approve invoice — ${p.companyName} (€${(amountCents / 100).toLocaleString("nl-NL")})`,
      description: `Send a Stripe invoice to ${p.email} for "${description}".`,
      reason: `Prospect won. Invoice ${p.recommendedOffer ?? "service"} at €${amountCents / 100}.`,
      status: "pending", decisionType: "approve_invoice", riskLevel: "high",
      businessUnitId: bu?.id ?? null, relatedOutputId: output?.id ?? null,
    },
  });
  return { approvalId: approval.id, revenueEntryId: rev.id };
}

export interface InvoiceRunSummary { scanned: number; invoiced: number; failed: number; skipped: number; }

export async function processApprovedInvoices(): Promise<InvoiceRunSummary> {
  const s: InvoiceRunSummary = { scanned: 0, invoiced: 0, failed: 0, skipped: 0 };
  const approvals = await prisma.approval.findMany({
    where: { decisionType: "approve_invoice", status: "approved", relatedOutputId: { not: null } },
    take: 10,
  });
  s.scanned = approvals.length;
  const provider = getPaymentProvider();

  for (const approval of approvals) {
    const output = await prisma.workforceOutput.findUnique({ where: { id: approval.relatedOutputId! } });
    if (!output?.content) { s.skipped++; continue; }
    let payload: InvoicePayload;
    try { payload = JSON.parse(output.content) as InvoicePayload; } catch { s.skipped++; continue; }

    // Idempotency claim: only proceed if the RevenueEntry hasn't been invoiced.
    const claim = await prisma.revenueEntry.updateMany({
      where: { id: payload.revenueEntryId, externalRef: null },
      data: { externalRef: `pending:${approval.id}` },
    });
    if (claim.count !== 1) { s.skipped++; continue; }

    const exec = await prisma.executionHistory.create({
      data: { approvalId: approval.id, agentId: "workforce", actionType: "invoice.create", actionPayload: JSON.stringify({ revenueEntryId: payload.revenueEntryId, to: payload.customerEmail, amountCents: payload.amountCents }), status: "pending" },
    });

    try {
      if (!provider.isConfigured()) throw new Error(`${provider.id} not configured — set STRIPE_SECRET_KEY`);
      const inv = await provider.createOneOffInvoice({
        customerEmail: payload.customerEmail, customerName: payload.customerName,
        description: payload.description, amountCents: payload.amountCents, currency: payload.currency,
        metadata: { revenueEntryId: payload.revenueEntryId, approvalId: approval.id },
      });
      await prisma.revenueEntry.update({ where: { id: payload.revenueEntryId }, data: { externalRef: inv.invoiceId, revenueType: "potential" } });
      await prisma.executionHistory.update({ where: { id: exec.id }, data: { status: "executed", executedAt: new Date() } });
      await prisma.actionResult.upsert({
        where: { approvalId: approval.id },
        update: { actionType: "invoice.create", status: "sent", title: `Invoice sent — ${payload.customerName ?? payload.customerEmail}`, description: inv.hostedUrl ?? inv.invoiceId, targetType: "revenue_entry", targetId: payload.revenueEntryId, error: null },
        create: { approvalId: approval.id, actionType: "invoice.create", status: "sent", title: `Invoice sent — ${payload.customerName ?? payload.customerEmail}`, description: inv.hostedUrl ?? inv.invoiceId, targetType: "revenue_entry", targetId: payload.revenueEntryId },
      });
      if (payload.prospectId) await prisma.prospect.updateMany({ where: { id: payload.prospectId }, data: { status: "proposal_sent" } });
      s.invoiced++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invoice failed";
      await prisma.revenueEntry.update({ where: { id: payload.revenueEntryId }, data: { externalRef: null } }).catch(() => {}); // release claim
      await prisma.executionHistory.update({ where: { id: exec.id }, data: { status: "failed", error: message, executedAt: new Date() } });
      await prisma.actionResult.upsert({
        where: { approvalId: approval.id },
        update: { actionType: "invoice.create", status: "failed", title: "Invoice failed", error: message },
        create: { approvalId: approval.id, actionType: "invoice.create", status: "failed", title: "Invoice failed", error: message },
      });
      s.failed++;
    }
  }
  return s;
}

/** Called by the payment webhook when an invoice is paid → recognize revenue. */
export async function markInvoicePaid(invoiceId: string, amountCents?: number): Promise<boolean> {
  const rev = await prisma.revenueEntry.findFirst({ where: { externalRef: invoiceId } });
  if (!rev) return false;
  await prisma.revenueEntry.update({
    where: { id: rev.id },
    data: { status: "closed_won", revenueType: "live", paidAt: new Date(), amount: amountCents != null ? amountCents / 100 : rev.amount },
  });
  return true;
}
