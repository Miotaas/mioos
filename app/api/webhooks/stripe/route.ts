import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/providers";
import { markInvoicePaid } from "@/lib/actions/invoice-executor";
import { handleSubscriptionWebhook } from "@/lib/actions/subscription-executor";

export const dynamic = "force-dynamic";

// POST /api/webhooks/stripe — Stripe → MioOS. Signature verified in the provider.
// Handles: invoice.paid, invoice.payment_failed, customer.subscription.created/
// updated/deleted → RevenueEntry status + MRR tracking.
export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");
  const event = await getPaymentProvider().parseWebhook(payload, signature);
  if (!event) return NextResponse.json({ error: "invalid signature" }, { status: 400 });

  let handled = false;
  if (event.subscriptionId) {
    handled = await handleSubscriptionWebhook(event);
  } else if (event.paid && event.invoiceId) {
    handled = await markInvoicePaid(event.invoiceId, event.amountCents);
  }
  return NextResponse.json({ received: true, handled });
}
