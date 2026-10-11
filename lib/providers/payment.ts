/**
 * Stripe payment provider — implements PaymentProvider via Stripe REST (no SDK).
 * Supports one-off invoices AND subscriptions (setup fee + monthly).
 * Reused by any unit that needs to invoice/charge/subscribe.
 *
 * Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 * Monthly prices are created manually in the Stripe dashboard; pass the Price id.
 */
import crypto from "node:crypto";
import type {
  PaymentProvider, CustomerRequest, CustomerResult, OneOffInvoiceRequest,
  InvoiceResult, SubscriptionRequest, SubscriptionResult, PaymentStatus, WebhookEvent,
} from "./types";

const API = "https://api.stripe.com/v1";
function secretKey(): string | undefined { return process.env.STRIPE_SECRET_KEY; }

function form(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) p.append(k, String(v));
  return p.toString();
}

async function stripe<T = Record<string, unknown>>(
  path: string, opts?: { method?: string; params?: Record<string, string | number | undefined> },
): Promise<T> {
  const key = secretKey();
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  const method = opts?.method ?? "POST";
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: opts?.params && method !== "GET" ? form(opts.params) : undefined,
  });
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`Stripe ${path} ${res.status}: ${data?.error?.message ?? "error"}`);
  return data;
}

function meta(prefix: string, metadata?: Record<string, string>): Record<string, string> {
  return metadata ? Object.fromEntries(Object.entries(metadata).map(([k, v]) => [`${prefix}[${k}]`, v])) : {};
}

export const stripePaymentProvider: PaymentProvider = {
  id: "stripe",
  isConfigured: () => Boolean(secretKey()),

  async createCustomer(req: CustomerRequest): Promise<CustomerResult> {
    const c = await stripe<{ id: string }>("/customers", { params: { email: req.email, name: req.name, ...meta("metadata", req.metadata) } });
    return { customerId: c.id, provider: "stripe" };
  },

  async createOneOffInvoice(req: OneOffInvoiceRequest): Promise<InvoiceResult> {
    const currency = (req.currency ?? "EUR").toLowerCase();
    let customerId = req.customerId;
    if (!customerId) {
      const c = await stripe<{ id: string }>("/customers", { params: { email: req.customerEmail, name: req.customerName } });
      customerId = c.id;
    }
    await stripe("/invoiceitems", { params: { customer: customerId, amount: Math.round(req.amountCents), currency, description: req.description } });
    const invoice = await stripe<{ id: string }>("/invoices", { params: { customer: customerId, collection_method: "send_invoice", days_until_due: 14, auto_advance: "true", ...meta("metadata", req.metadata) } });
    const finalized = await stripe<{ id: string; hosted_invoice_url?: string; status: string }>(`/invoices/${invoice.id}/finalize`);
    return { invoiceId: finalized.id, hostedUrl: finalized.hosted_invoice_url, status: finalized.status, provider: "stripe" };
  },

  async createSubscription(req: SubscriptionRequest): Promise<SubscriptionResult> {
    const currency = (req.currency ?? "EUR").toLowerCase();
    const params: Record<string, string | number | undefined> = {
      customer: req.customerId,
      "items[0][price]": req.priceId,
      collection_method: "send_invoice",
      days_until_due: 14,
      ...meta("metadata", req.metadata),
    };
    if (req.setupFeeCents && req.setupFeeCents > 0) {
      params["add_invoice_items[0][price_data][currency]"] = currency;
      params["add_invoice_items[0][price_data][unit_amount]"] = Math.round(req.setupFeeCents);
      params["add_invoice_items[0][price_data][product_data][name]"] = "One-time setup fee";
    }
    const sub = await stripe<{ id: string; status: string; latest_invoice?: string }>("/subscriptions", { params });
    // Finalize + send the first invoice so it goes out immediately.
    let invoiceId = sub.latest_invoice;
    if (invoiceId) {
      try { const fin = await stripe<{ id: string }>(`/invoices/${invoiceId}/finalize`); invoiceId = fin.id; } catch { /* may already be finalized */ }
    }
    return { subscriptionId: sub.id, invoiceId, status: sub.status, provider: "stripe" };
  },

  async cancelSubscription(subscriptionId: string): Promise<{ status: string }> {
    const s = await stripe<{ status: string }>(`/subscriptions/${subscriptionId}`, { method: "DELETE" });
    return { status: s.status };
  },

  async getPaymentStatus(kind: "invoice" | "subscription", id: string): Promise<PaymentStatus> {
    const path = kind === "invoice" ? `/invoices/${id}` : `/subscriptions/${id}`;
    const r = await stripe<{ status: string }>(path, { method: "GET" });
    return { status: r.status, paid: r.status === "paid" || r.status === "active" };
  },

  async parseWebhook(payload: string, signature: string | null): Promise<WebhookEvent | null> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret || !signature) return null;
    const parts = Object.fromEntries(signature.split(",").map((kv) => kv.split("=")) as [string, string][]);
    const t = parts["t"]; const v1 = parts["v1"];
    if (!t || !v1) return null;
    const expected = crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
    if (expected.length !== v1.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1))) return null;

    let event: { type?: string; data?: { object?: Record<string, unknown> } };
    try { event = JSON.parse(payload); } catch { return null; }
    const type = event.type ?? "unknown";
    const obj = (event.data?.object ?? {}) as Record<string, unknown>;

    if (type === "invoice.paid" || type === "invoice.payment_succeeded")
      return { type, invoiceId: obj.id as string, subscriptionId: obj.subscription as string | undefined, customerId: obj.customer as string | undefined, paid: true, amountCents: obj.amount_paid as number | undefined, raw: event };
    if (type === "invoice.payment_failed")
      return { type, invoiceId: obj.id as string, subscriptionId: obj.subscription as string | undefined, customerId: obj.customer as string | undefined, paid: false, status: "past_due", raw: event };
    if (type === "customer.subscription.created" || type === "customer.subscription.updated" || type === "customer.subscription.deleted")
      return { type, subscriptionId: obj.id as string, customerId: obj.customer as string | undefined, status: (type === "customer.subscription.deleted" ? "canceled" : (obj.status as string | undefined)), raw: event };

    return { type, raw: event };
  },
};
