/**
 * SMTP email provider — implements EmailProvider by reusing the existing
 * Nodemailer sender (lib/actions/email-send.ts). Swap this file to add
 * Gmail API / SendGrid without touching any business logic.
 */
import { sendEmail, isSmtpConfigured } from "@/lib/actions/email-send";
import type { EmailProvider, EmailMessage, EmailSendResult } from "./types";

export const smtpEmailProvider: EmailProvider = {
  id: "smtp",
  isConfigured: () => isSmtpConfigured(),
  async send(msg: EmailMessage): Promise<EmailSendResult> {
    const r = await sendEmail({ to: msg.to, subject: msg.subject, text: msg.text, html: msg.html, replyTo: msg.replyTo });
    return { messageId: r.messageId, provider: "smtp" };
  },
};
