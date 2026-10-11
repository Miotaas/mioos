/**
 * Provider registry. Business logic calls getEmailProvider()/getPaymentProvider()
 * and never imports a concrete vendor. Selection can later read env/config.
 */
import type { EmailProvider, PaymentProvider } from "./types";
import { smtpEmailProvider } from "./email";
import { stripePaymentProvider } from "./payment";

export * from "./types";

export function getEmailProvider(): EmailProvider {
  // Only SMTP today; future: choose by process.env.EMAIL_PROVIDER
  return smtpEmailProvider;
}

export function getPaymentProvider(): PaymentProvider {
  // Only Stripe today; future: choose by process.env.PAYMENT_PROVIDER
  return stripePaymentProvider;
}
