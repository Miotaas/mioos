/**
 * Provider registry. Business logic calls getEmailProvider()/getPaymentProvider()
 * and never imports a concrete vendor. Selection can later read env/config.
 */
import type { EmailProvider, PaymentProvider } from "./types";
import { smtpEmailProvider } from "./email";
import { stripePaymentProvider } from "./payment";

export * from "./types";

// ── Test seam (Phase 0 item 1) ───────────────────────────────────────
// Lets the Vitest harness inject a fake email provider. It is inert in
// production: the override starts null and can only be set under Vitest.
let emailProviderOverride: EmailProvider | null = null;

function assertTestEnvironment(fn: string): void {
  if (process.env.VITEST !== "true" || process.env.NODE_ENV === "production") {
    throw new Error(`[providers] ${fn} is test-only and cannot be used outside the Vitest harness`);
  }
}

/** Test-only: replace the email provider. Pass null to restore the real one. */
export function setEmailProviderForTesting(provider: EmailProvider | null): void {
  assertTestEnvironment("setEmailProviderForTesting");
  emailProviderOverride = provider;
}

export function getEmailProvider(): EmailProvider {
  // Only SMTP today; future: choose by process.env.EMAIL_PROVIDER
  return emailProviderOverride ?? smtpEmailProvider;
}

export function getPaymentProvider(): PaymentProvider {
  // Only Stripe today; future: choose by process.env.PAYMENT_PROVIDER
  return stripePaymentProvider;
}
