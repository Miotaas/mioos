/**
 * Phase 0 item 1 — pinning tests for processOutboundEmail (lib/actions/executor.ts).
 *
 * These pin the approval gate and the send-once claim as they behave today.
 * They must not be weakened to make them pass: a failure here is a
 * production defect, not a test problem.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { processOutboundEmail } from "@/lib/actions/executor";
import { setEmailProviderForTesting } from "@/lib/providers";
import { FakeEmailProvider } from "../fakes/fake-email-provider";

type ApprovalStatus = "pending" | "approved" | "rejected" | "auto_approved";

async function seedOutreach(status: ApprovalStatus, recipientEmail: string) {
  const approval = await prisma.approval.create({
    data: {
      title: `Outreach to ${recipientEmail}`,
      status,
      decisionType: "approve_outreach",
      approvedAt: status === "approved" ? new Date() : null,
    },
  });
  const draft = await prisma.emailDraft.create({
    data: {
      title: `Draft for ${recipientEmail}`,
      subject: "Your website lead flow",
      body: "Hello — test body.",
      recipientEmail,
      status: "draft",
      sourceApprovalId: approval.id,
    },
  });
  return { approval, draft };
}

async function resetTables() {
  await prisma.actionResult.deleteMany();
  await prisma.executionHistory.deleteMany();
  await prisma.emailDraft.deleteMany();
  await prisma.approval.deleteMany();
}

describe("processOutboundEmail — approval gate", () => {
  let email: FakeEmailProvider;

  beforeEach(async () => {
    await resetTables();
    email = new FakeEmailProvider();
    setEmailProviderForTesting(email);
  });

  it("sends a draft whose approval is approved", async () => {
    const { approval, draft } = await seedOutreach("approved", "approved@example.test");

    const summary = await processOutboundEmail();

    expect(summary.sent).toBe(1);
    expect(email.sends).toHaveLength(1);
    expect(email.sends[0]).toMatchObject({
      to: "approved@example.test",
      subject: "Your website lead flow",
      text: "Hello — test body.",
    });
    expect((await prisma.emailDraft.findUniqueOrThrow({ where: { id: draft.id } })).status).toBe("sent");
    const result = await prisma.actionResult.findUniqueOrThrow({ where: { approvalId: approval.id } });
    expect(result.status).toBe("sent");
    const history = await prisma.executionHistory.findMany({ where: { approvalId: approval.id } });
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe("executed");
  });

  it.each<ApprovalStatus>(["pending", "rejected", "auto_approved"])(
    "does not send a draft whose approval is %s",
    async (status) => {
      const { approval, draft } = await seedOutreach(status, `${status}@example.test`);

      const summary = await processOutboundEmail();

      expect(summary.sent).toBe(0);
      expect(summary.skipped).toBe(1);
      expect(email.sends).toHaveLength(0);
      expect((await prisma.emailDraft.findUniqueOrThrow({ where: { id: draft.id } })).status).toBe("draft");
      expect(await prisma.executionHistory.count({ where: { approvalId: approval.id } })).toBe(0);
      expect(await prisma.actionResult.count({ where: { approvalId: approval.id } })).toBe(0);
    },
  );

  it("sends only the approved draft when approved and unapproved drafts are mixed", async () => {
    await seedOutreach("pending", "pending-mix@example.test");
    await seedOutreach("approved", "approved-mix@example.test");
    await seedOutreach("rejected", "rejected-mix@example.test");
    await seedOutreach("auto_approved", "auto-mix@example.test");

    await processOutboundEmail();

    expect(email.sends.map((s) => s.to)).toEqual(["approved-mix@example.test"]);
  });
});

describe("processOutboundEmail — send-once under concurrency", () => {
  it("two concurrent invocations send each approved draft exactly once", async () => {
    await resetTables();
    // A small send delay makes the two invocations interleave: both read the
    // same candidate drafts before either has finished sending.
    const email = new FakeEmailProvider({ sendDelayMs: 20 });
    setEmailProviderForTesting(email);

    const recipients = Array.from({ length: 5 }, (_, i) => `concurrent-${i}@example.test`);
    const seeded = [];
    for (const r of recipients) seeded.push(await seedOutreach("approved", r));

    const [a, b] = await Promise.all([processOutboundEmail(), processOutboundEmail()]);

    // Exactly one real send per draft.
    for (const r of recipients) {
      expect(email.sendsTo(r), `sends to ${r}`).toHaveLength(1);
    }
    expect(email.sends).toHaveLength(recipients.length);
    expect(a.sent + b.sent).toBe(recipients.length);

    // Exactly one execution attempt and one result per approval; every draft ends sent.
    for (const { approval, draft } of seeded) {
      expect(await prisma.executionHistory.count({ where: { approvalId: approval.id } })).toBe(1);
      expect(await prisma.actionResult.count({ where: { approvalId: approval.id } })).toBe(1);
      expect((await prisma.emailDraft.findUniqueOrThrow({ where: { id: draft.id } })).status).toBe("sent");
    }
  });
});
