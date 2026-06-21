/**
 * Phase A — SMTP email sender (Nodemailer).
 *
 * The single place in MioOS that performs the real-world side effect of
 * sending an email. Pure transport: callers (the action executor) own the
 * approval gate, idempotency and logging. Fails loudly when unconfigured —
 * never silently "succeeds".
 *
 * Required env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 * (SMTP_FROM falls back to SMTP_USER if omitted).
 */
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  messageId: string;
  accepted: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string | null | undefined): email is string {
  return typeof email === "string" && EMAIL_RE.test(email.trim());
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    (process.env.SMTP_FROM || process.env.SMTP_USER),
  );
}

let transport: Transporter | null = null;

function getTransport(): Transporter {
  if (transport) return transport;
  const port = Number(process.env.SMTP_PORT);
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // implicit TLS on 465; STARTTLS on 587/25
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    pool: true,
    maxConnections: 2,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 25_000,
  });
  return transport;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!isSmtpConfigured()) {
    throw new Error("SMTP not configured — set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM");
  }
  const to = input.to?.trim();
  if (!isValidEmail(to)) throw new Error(`Invalid recipient email: "${input.to ?? ""}"`);
  if (!input.subject?.trim()) throw new Error("Email subject is required");
  if (!input.text?.trim() && !input.html?.trim()) throw new Error("Email body is required");

  const from = (process.env.SMTP_FROM || process.env.SMTP_USER) as string;

  const info = await getTransport().sendMail({
    from,
    to,
    subject: input.subject.trim(),
    text: input.text,
    html: input.html,
    replyTo: input.replyTo?.trim() || undefined,
  });

  const accepted = Array.isArray(info.accepted) ? info.accepted.map((a) => String(a)) : [];
  if (accepted.length === 0) {
    throw new Error(`SMTP server did not accept recipient ${to}`);
  }
  return { messageId: info.messageId, accepted };
}
