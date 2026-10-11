/**
 * Provider interface layer.
 *
 * Business logic depends on these interfaces, never on a concrete vendor.
 * That is how the AI Ventures operating model is reused by Content, E-commerce
 * and Capital later: swap the provider implementation, keep the workflow.
 *
 * Implemented now: EmailProvider (SMTP), PaymentProvider (Stripe).
 * Declared for later: Ads / Social / Commerce / Calendar — so workflows can be
 * written against them today without changing when the vendor is plugged in.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}
export interface EmailSendResult { messageId: string; provider: string; }

export interface EmailProvider {
  readonly id: string;
  isConfigured(): boolean;
  send(msg: EmailMessage): Promise<EmailSendResult>;
}

export interface CustomerRequest { email: string; name?: string; metadata?: Record<string, string>; }
export interface CustomerResult { customerId: string; provider: string; }

export interface OneOffInvoiceRequest {
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  description: string;
  amountCents: number;
  currency?: string;              // default EUR
  metadata?: Record<string, string>;
}
export interface InvoiceResult { invoiceId: string; hostedUrl?: string; status: string; provider: string; }

export interface SubscriptionRequest {
  customerId: string;
  priceId: string;                // Stripe Price id (created manually in dashboard)
  setupFeeCents?: number;         // one-off setup fee added to the first invoice
  currency?: string;              // default EUR
  metadata?: Record<string, string>;
}
export interface SubscriptionResult { subscriptionId: string; invoiceId?: string; status: string; provider: string; }

export interface PaymentStatus { status: string; paid: boolean; }

export interface WebhookEvent {
  type: string;
  invoiceId?: string;
  subscriptionId?: string;
  customerId?: string;
  status?: string;                // subscription/invoice status
  paid?: boolean;
  amountCents?: number;
  raw?: unknown;
}

export interface PaymentProvider {
  readonly id: string;
  isConfigured(): boolean;
  createCustomer(req: CustomerRequest): Promise<CustomerResult>;
  createOneOffInvoice(req: OneOffInvoiceRequest): Promise<InvoiceResult>;
  createSubscription(req: SubscriptionRequest): Promise<SubscriptionResult>;
  cancelSubscription(subscriptionId: string): Promise<{ status: string }>;
  getPaymentStatus(kind: "invoice" | "subscription", id: string): Promise<PaymentStatus>;
  /** Verify + parse an incoming webhook. Returns null if signature invalid. */
  parseWebhook(payload: string, signature: string | null): Promise<WebhookEvent | null>;
}

// ── Declared-for-later provider interfaces (no implementation yet) ──────
export interface AdsProvider      { readonly id: string; isConfigured(): boolean; }   // Meta Ads, Google Ads
export interface SocialProvider   { readonly id: string; isConfigured(): boolean; }   // LinkedIn, YouTube, TikTok, IG
export interface CommerceProvider { readonly id: string; isConfigured(): boolean; }   // Shopify, POD
export interface CalendarProvider { readonly id: string; isConfigured(): boolean; }   // Cal.com, Google Calendar
