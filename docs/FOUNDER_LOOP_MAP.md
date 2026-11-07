# Mio Solutions — Founder Loop Map

> **Status: rewritten 2026-10-18 to comply with Constitution v1.1.**
> The earlier version of this file proposed migrating outreach, follow-up, invoice and subscription approvals to auto-approval once a track record existed. That plan is **void**. It conflicted with:
> - Constitution §5: an approval for an action type that has an executor is never auto-approved;
> - §6.2: external actions require approval;
> - §6.3: financial actions are locked.
>
> Do not restore it, cite it or build toward it. See "Deprecated: the auto-approval removal mechanism" below.
>
> Source of truth for the loop itself: `docs/FIRST_REVENUE_LOOP.md`. Execution priority: `docs/FOUNDER_DECISIONS.md` FD-001.

This file classifies every founder step in the Mio Solutions sales loop by its Constitution autonomy class. It also records what the code does today.

## Classes

| Class | Meaning | Can it become autonomous? |
|---|---|---|
| **Internal** (§6.1) | Research, analysis, scoring, drafting, classification, accounting | Already autonomous for an operational unit, within budget |
| **External** (§6.2) | Anything that reaches a third party | **Approval required.** Limited autonomy only through an explicit founder configuration (connector mode `autonomous_limited`, §9), scoped and budgeted, after all of §19. Never through approval triage. Never derived automatically from a track record. |
| **Financial** (§6.3) | Starting subscriptions, refunds, pricing or billing changes, moving money | **Locked.** Explicit founder approval every time. |
| **Founder-only** | Judgment, legal, secrets, the human close | Never automated |

## The loop

| # | Step | Class | Approval | Code today (see `docs/ARCHITECTURE_REALITY_AUDIT.md`) |
|---|---|---|---|---|
| 1 | Discover prospects | Internal | No | Real (web search → `Prospect`). Search spend is unbudgeted; §19 item 10 is open. |
| 2 | Obtain contact email | Internal | No | Harvested from the prospect's site. Paid enrichment would be a new credential and waits for §19. |
| 3 | Website / process audit | Internal | No | Real (`website-analyzer`). Template fallback must not advance (§11). |
| 4 | Offer selection and price recommendation | Internal | No | Rule-based matcher. Bands differ from `FIRST_REVENUE_LOOP.md` §2.2. |
| 5 | Draft outreach | Internal | No | Real. No opt-out yet; §19 item 11 is open. |
| 6 | Approve outreach | **External** | **Yes, per message** | Founder approves in Decide. Approval is not yet bound to a payload; §19 item 6 is open. |
| 7 | Send outreach | External (executes the approved payload) | Approval from #6 | Sends only on `approved`. Emergency Stop, connector mode and send cap are not yet enforced; §19 items 2, 7 and 11 are open. |
| 8 | Detect replies | Internal (read) | No | IMAP, last 24 h, at most 30 messages, no bounce handling. Not yet §12.1-compliant. |
| 9 | Draft follow-ups | Internal | No | Auto-drafted after 3 days, max 2. The approval is created with `riskLevel: "low"`, which makes it a triage auto-approval candidate; §19 item 5 is open. |
| 9b | Send follow-ups | **External** | **Yes, per message** | Founder approves. Must stop on reply, opt-out, bounce or lost, and when detection is unavailable. |
| 10 | Propose or book a meeting | **External** | **Yes** | Not implemented. |
| 11 | Sales conversation / close | Founder-only | — | Founder. MioOS may prepare and qualify internally. |
| 12 | Set price and deal terms | Internal recommendation; sending is external | Yes, when sent | MioOS recommends within founder-set bands. Bands are founder decisions. |
| 13 | Create and send invoice | **External** (§6.2 creating invoices) | **Yes, per invoice** | The executor exists. Nothing raises invoice approvals, and Stripe calls have no idempotency keys; §19 item 9 is open. |
| 14 | Start subscription | **Financial — locked** | **Yes, per subscription** | The executor exists. It is not idempotent and creates a new customer on every retry. |
| 15 | Pricing change, cancellation, refund | **Financial — locked** | **Yes** | Cancellation executor exists. No refunds. |
| 16 | Record payment | Internal | No | The webhook route exists but `middleware.ts` blocks it. No event de-duplication. |
| 17 | Recurring revenue / MRR | Internal (accounting) | No | **Not working.** The webhook is unreachable, and each monthly payment overwrites one row instead of recording each period; §19 item 13 is open. |
| 18 | Onboard customer | Drafts internal; sends external | Yes, per message | Not implemented. |
| 19 | Deliver the service | Build internal; go-live external | Yes, go-live (§6.2 live website change) | Not implemented. See `FIRST_REVENUE_LOOP.md` stage 14. |
| 20 | Deploy, credentials, Stripe setup | Founder-only | — | Founder, permanently. |

## Reducing founder load — what is allowed

Founder load is reduced by making each approval cheaper, not by removing approvals:

- **One clear decision per payload in Decide.** Each decision shows what is requested, why, the impact if approved, the impact if rejected, and the exact payload.
- **No noise approvals.** Surface a decision only when there is something concrete to authorize (§15, audit P-11).
- **Better drafts.** Learning (`FIRST_REVENUE_LOOP.md` stage 17) improves drafts, so the founder edits and rejects less.
- **Batch review in the UI.** Several separate approvals can be reviewed on one screen. Each still binds one payload.
- **Explicit limited external autonomy, later.** Only for a single external action type, through connector mode `autonomous_limited`, configured by the founder, with scope and budget caps, after all of §19. This is a founder configuration act, not something MioOS earns or unlocks itself.

Financial actions never take that last path. They remain locked.

## Deprecated: the auto-approval removal mechanism

The earlier version of this file described these four things. **All four are void.**

1. Raising the autonomy level per `decisionType` so that `approval-triage` auto-approves outreach, follow-ups, invoices and subscriptions "within limits".
2. Treating an accrued track record (sends, replies, paid invoices) as a trigger for removing an approval gate.
3. The "order to remove the founder": follow-up send, then invoice and subscription auto-approve, then outreach auto-approve.
4. Classifying invoice and subscription creation as "Autonomous (done, gated)" and MRR tracking as "Autonomous (done)".

Reasons:
- Items 1–3 violate Constitution §5 (never auto-approve an action type that has an executor), §6.2 and §6.3.
- Item 4 described code that is unreachable or broken as complete.

`approval-triage` may score, escalate and remind. It may not decide an approval for any action type that has an executor. See `docs/PHASE_0_SAFETY_PLAN.md`, item 5.
