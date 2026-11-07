/**
 * Fake EmailProvider for tests. Records every send and never touches the
 * network. Inject it with setEmailProviderForTesting(fake).
 */
import type { EmailMessage, EmailProvider, EmailSendResult } from "@/lib/providers";

export interface RecordedSend extends EmailMessage {
  messageId: string;
}

export interface FakeEmailProviderOptions {
  /** Report the provider as configured (default true). */
  configured?: boolean;
  /** Delay before each send resolves, to let concurrent callers interleave. */
  sendDelayMs?: number;
}

export class FakeEmailProvider implements EmailProvider {
  readonly id = "fake-email";
  readonly sends: RecordedSend[] = [];
  private readonly configured: boolean;
  private readonly sendDelayMs: number;

  constructor(options: FakeEmailProviderOptions = {}) {
    this.configured = options.configured ?? true;
    this.sendDelayMs = options.sendDelayMs ?? 0;
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async send(msg: EmailMessage): Promise<EmailSendResult> {
    if (this.sendDelayMs > 0) await new Promise((r) => setTimeout(r, this.sendDelayMs));
    const messageId = `<fake-${this.sends.length + 1}@test.invalid>`;
    this.sends.push({ ...msg, messageId });
    return { messageId, provider: this.id };
  }

  sendsTo(address: string): RecordedSend[] {
    return this.sends.filter((s) => s.to === address);
  }
}
