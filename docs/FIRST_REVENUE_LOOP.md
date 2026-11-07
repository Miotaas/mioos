# Mio Solutions — First Revenue Loop

| | |
|---|---|
| Status | **Accepted target design (founder, 2026-10-18). Not implemented.** |
| Version | 0.1 — 2026-10-18 |
| Owner | Founder |
| Business Unit | `mio-solutions` (operational) |
| Venture | AI Website Agency (priority portfolio) |
| First offer | AI Website + Leadflow Upgrade |
| Subordinate to | `docs/MIOOS_CONSTITUTION.md` v1.4 |

This document is the source of truth for the **first** revenue loop of Mio Solutions: the end-to-end path from a discovered prospect to collected money, delivery, upsell and learning.

---

## 0. Authority and boundaries

- The Constitution is binding and outranks this document. Where this document is silent, the Constitution applies. Where they appear to differ, the Constitution wins and this document is wrong.
- This document authorizes **nothing** on its own. No production credential (SMTP, IMAP, Stripe, search, hosting, DNS or client-site access) is enabled because this document exists. Credentials are enabled only after every item in Constitution §19 is complete and proven, and the budgets in §10 exist and are enforced.
- **Forecasts stay on `Opportunity`.** Real money goes to `RevenueEntry`. An AI estimate of deal value is never a `RevenueEntry` row (§5).
- **"Autonomous" in this loop means internal autonomy (§6.1)**: research, analysis, scoring, drafting, classification, recommendation, accounting. Every external action (§6.2) needs founder approval, and every financial action (§6.3) is locked and needs its own explicit approval. This holds for every stage below, whatever the stage description says.
- One approval authorizes **one action against one payload**, bound by a payload hash (§5). Approving one stage never authorizes a later stage.
- Every action passes the governance hierarchy (§7) in order: Global Safety → Business Unit Policy (including unit status) → Connector Policy → Budget Policy → Action Policy → Approval → Execution. Emergency Stop is checked at the runtime-loop boundary and immediately before every external side effect (§8).
- Uncertainty is never permission (§14). If approval, Emergency Stop, unit status, connector mode, budget or payment state cannot be verified, the stage does not execute.
- **Founder decision FD-001** (`docs/FOUNDER_DECISIONS.md`): the AI Website Agency is the first commercial execution loop MioOS makes production-ready, because it is the fastest path to proving the revenue machinery and generating cash. FD-001 separates two orderings:
  - *execution-loop priority*: which loop is made production-ready first;
  - *strategic portfolio priority*: AION, Mail Co-Pilot, AI Website Agency, unchanged.

  This loop never changes portfolio ranking, including the capital allocator's ranking. It does not authorize MioOS to reallocate effort or budget between ventures (§2.1.1). The share of Mio Solutions runtime and budget given to this loop is set by the founder in the §10 budgets.

---

## 1. Definition of complete

The first revenue loop is **complete** only when all of the following are true:

1. At least one real B2B customer has **paid**. That payment is a `RevenueEntry` of kind *collected*, with a Stripe provider reference, recognized from a verified provider event.
2. That customer's payment traces back through the audit trail to:
   - one discovered prospect;
   - one approved outreach;
   - one detected reply;
   - one approved proposal;
   - one approved invoice.
3. Delivery for that customer has gone live through an approved go-live.
4. The margin for that customer can be computed from recorded costs (§10), even if delivery was partly manual.

Delivery may be semi-autonomous at first: the founder may do parts of it by hand. The loop is still not complete before a real customer has paid.

A first collected payment satisfies activation condition 3 of Constitution §2.0 for the dormant units. That condition is necessary, not sufficient: it activates nothing by itself.

---

## 2. First offer — AI Website + Leadflow Upgrade

### 2.1 What it is

A conversion-focused website rebuild or upgrade for a B2B SMB, combined with a working lead flow. Default scope:

- the website itself, built or upgraded;
- lead capture (forms and calls-to-action);
- routing of captured leads to the customer's inbox or tool;
- an automated acknowledgement to the lead;
- basic conversion tracking.

The proposal fixes the exact scope per customer (§7).

The recurring component covers hosting, maintenance, leadflow monitoring and periodic optimisation.

### 2.2 Pricing bands

| Component | Band | Billing |
|---|---|---|
| Setup | €750 – €1,500 | One-off invoice |
| Recurring | €250 – €750 / month | Subscription |
| Optional upsell | €500 – €2,000 | One-off invoice, separate proposal |

Rules:

- MioOS may **recommend** a price inside these bands. Each recommendation carries a rationale that refers to audit facts (scope size, number of pages and forms, integrations).
- A price outside a band is rejected. MioOS does not clamp it silently, and the draft does not advance.
- Changing a band is a founder decision. Neither the Learning stage nor any other stage may change one.
- Sending a price to a third party is external and approval-gated. Starting recurring billing is financial and locked (§6.3).
- The band values live in configuration owned by the founder, not in prompts.

---

## 3. Prospect requirements

A prospect is admitted into the loop only when **all** of the following hold:

| Requirement | Test |
|---|---|
| B2B SMB | The business sells to other businesses, or is a small or medium business with a commercial website. It is not a consumer, a large enterprise or a public body. |
| Credible commercial problem | At least one problem observed on the prospect's own website: no or weak lead capture, a broken or missing contact form, an outdated or slow site, unclear calls-to-action, no tracking. |
| Fits the offer | The observed problem is one that AI Website + Leadflow Upgrade solves. |
| External evidence | The problem is supported by facts **fetched** from the prospect's site or other independent sources, recorded with source URL and retrieval time. A model statement is not evidence (§11). |
| Contactable | A business contact address was obtained from a legitimate source and recorded with its source. |
| Not suppressed | The domain and the address are not on the suppression list (§12.1). This is checked at admission and again immediately before every send. |
| Not a duplicate | No existing prospect with the same normalized domain or the same contact address. Re-discovery updates the existing record; it never creates a second one. |
| In scope | The prospect is not itself a dormant-unit business opportunity (§2.1.1 exclusions). Building a website **for** a company in any sector is allowed. |

---

## 4. Loop overview

```text
 1 Prospect ─▶ 2 Audit ─▶ 3 Offer Selection ─▶ 4 Outreach Draft ─▶ 5 Founder Approval ─▶ 6 Send
                                                                                          │
   ┌──────────────────────────────────────────────────────────────────────────────────────┘
   ▼
 7 Reply Detection ─▶ 8 Reply Classification ─▶ 9 Follow-up ─▶ 10 Proposal ─▶ 11 Founder Approval
                                                                                          │
   ┌──────────────────────────────────────────────────────────────────────────────────────┘
   ▼
12 Invoice ─▶ 13 Payment ─▶ 14 Delivery ─▶ 15 Upsell ─▶ 16 Revenue + Margin ─▶ 17 Learning
```

### 4.1 Approval gates

The stage list shows two named approval stages (5 and 11). Under Constitution §5, §6.2 and §6.3, every external or financial action needs its **own** approval against its own payload. The full set of gates in this loop:

| Gate | Action | Class | Stage |
|---|---|---|---|
| G1 | Send first outreach email | External | 5 → 6 |
| G2 | Send each follow-up or each reply to a prospect | External | 9 |
| G3 | Propose or book a meeting | External | 9 |
| G4 | Send a proposal | External | 11 |
| G5 | Create and send the setup invoice | External (§6.2 creating invoices) | 12 |
| G6 | Start recurring billing (subscription) | **Financial — locked** (§6.3) | 14 |
| G7 | Change the customer's live website / go-live | External (§6.2 changing a live website) | 14 |
| G8 | Send an upsell message or upsell proposal | External | 15 |
| G9 | Create an upsell invoice | External | 15 |
| G10 | Issue a refund or credit | **Financial — locked** | any |

No gate is auto-approved. Approval triage may not auto-approve any action type that has an executor (§5).

---

## 5. Stage specifications

Each stage states: input, autonomous action, output, founder approval, failure conditions, idempotency requirement and KPIs.

Every stage also:
- writes `businessUnitId = mio-solutions` at creation;
- records spend against the unit's §10 budget as it occurs;
- writes a founder-visible record of every failed step (§13).

### Stage 1 — Prospect

| | |
|---|---|
| Input | Founder-owned ICP search queries; search results from a budgeted search connector. |
| Autonomous action | Run discovery queries. Normalize domains. Apply the prospect requirements in §3 that can be checked before the audit: B2B SMB signal, suppression, duplicates, exclusions. |
| Output | `Prospect` row (status *discovered*) with source URL, query, retrieval time and owning unit. |
| Founder approval | No. Internal (§6.1), within search budget. |
| Failure conditions | Search budget exhausted → discovery stops until the period resets. Search connector unavailable → no fallback to model-generated prospects. Domain or address suppressed → not created. Duplicate → existing record updated, none created. |
| Idempotency | Unique on normalized domain. One discovery run per (query, period). Re-running a run creates no new prospects. |
| KPIs | Qualified prospects per week. Duplicate rate. Search cost per qualified prospect. |

### Stage 2 — Audit

| | |
|---|---|
| Input | A *discovered* prospect. |
| Autonomous action | Fetch the prospect's website using a read-only connector. Extract observable facts: forms, calls-to-action, contact paths, tracking, page speed, mobile rendering, technology. Have a model interpret those facts; the interpretation is labelled as inference. Obtain the contact address, recorded with its source. |
| Output | Prospect audit `Artifact` that keeps three things separate: **facts** (with source URL and retrieval time), **inferences** and **assumptions**. Prospect status becomes *audited*. |
| Founder approval | No. Internal. |
| Failure conditions | Site unreachable → no audit, and the prospect is parked with a reason. Template or fallback output → the audit is marked *not evidence* and the prospect does **not** advance (§11). Malformed model output → rejected (§14). No observed problem → prospect closed as *no fit*. |
| Idempotency | One audit per (prospect, site-content hash). Re-audit only when the site changes or after a configured interval. |
| KPIs | Audit completion rate. Share of audits with at least two fetched facts. Audit cost. |

### Stage 3 — Offer Selection

| | |
|---|---|
| Input | An *audited* prospect and its audit. |
| Autonomous action | Decide whether AI Website + Leadflow Upgrade fits the observed problems. If it fits, recommend setup and recurring prices inside the §2.2 bands, with a rationale that refers to audit facts. |
| Output | `Opportunity` in stage *qualified*, carrying the offer, recommended prices and the forecast value, labelled as an **estimate**. The forecast lives on the Opportunity only. |
| Founder approval | No. The recommendation is internal. Any price leaving MioOS is gated later. |
| Failure conditions | No fit → prospect closed as *no fit*, with the reason. Price outside the band → rejected. No `RevenueEntry` is ever written at this stage. |
| Idempotency | At most one open Opportunity per (prospect, offer). |
| KPIs | Fit rate. Distribution of recommended prices. |

### Stage 4 — Outreach Draft

| | |
|---|---|
| Input | A *qualified* Opportunity, its audit and the contact address. |
| Autonomous action | Draft one first-contact email that: refers to at least one specific **fetched** fact about the prospect's site; states the problem and the offer plainly; identifies the sender; contains an opt-out (§12.1). Check suppression again. |
| Output | `EmailDraft` plus a pending `Approval` (G1). The approval's payload hash covers recipient, sender, subject and body. The assignment that produced the draft waits on that approval. |
| Founder approval | Not for drafting. The send requires G1. |
| Failure conditions | No contact address → no draft. Suppressed → no draft. Draft has no specific evidence reference, has no opt-out, or makes an unsupported claim → rejected. |
| Idempotency | One pending outreach approval per prospect at a time. Draft keyed by (prospect, sequence step 0). |
| KPIs | Drafts per day. Founder approval rate. Founder edit rate. |

### Stage 5 — Founder Approval (outreach)

| | |
|---|---|
| Input | A pending G1 approval, shown in Decide. It explains what is requested, why it matters, the impact if approved, the impact if rejected, and the exact payload. |
| Autonomous action | None. The founder decides. |
| Output | Approval moves from `pending` to `approved` or `rejected`, once. The waiting assignment is closed: completed on approval, closed as rejected on rejection (§5). |
| Founder approval | **Yes — G1.** |
| Failure conditions | Payload edited after approval → the approval is invalid and a new one is required. Approval already decided → no second transition. |
| Idempotency | Strict state machine. Approving twice has no second effect. |
| KPIs | Time to decision. Approval rate. Rejection reasons. |

### Stage 6 — Send

| | |
|---|---|
| Input | An `approved` G1 approval. |
| Autonomous action | Re-run the governance checks: Emergency Stop, unit status, connector mode, outreach daily send cap, budget, suppression, payload-hash match. Then send through SMTP. |
| Output | One `ExecutionHistory` row per attempt and one `ActionResult` per approval, with the deterministic idempotency key and the provider message-id. Prospect status becomes *contacted*. |
| Founder approval | Already given (G1). The send executes exactly that payload and nothing else. |
| Failure conditions | Any check fails → not sent, recorded, and visible to the founder. SMTP outcome ambiguous (for example a timeout after the message was submitted) → marked *ambiguous* and escalated, with no blind retry (§14). Daily cap reached → deferred to the next period. The approval is not consumed. |
| Idempotency | Key = hash(approval id, payload hash). One `ActionResult` per approval. A retry never sends a second email. |
| KPIs | Send success rate. Sends against the daily cap. Bounce rate (detected in stage 7). |

### Stage 7 — Reply Detection

| | |
|---|---|
| Input | The outreach mailbox, through a read-only IMAP connector. |
| Autonomous action | Match inbound messages to sent outreach by `In-Reply-To` / `References`, falling back to the sender address. Detect bounces (delivery status notifications). The scan window must cover every message since the last successful scan; a fixed window that can skip messages is not acceptable. |
| Output | A reply record linked to the prospect and the draft, or a bounce record. Unmatched inbound messages go to a founder review list and are never discarded. |
| Founder approval | No. Read-only. |
| Failure conditions | Mailbox unavailable or the scan is failing → reply detection is marked **unavailable**, and **all follow-ups for the unit halt** until it recovers (§12.1). A gap in scan coverage counts as failing. |
| Idempotency | Unique on the inbound Message-ID. Reprocessing a message creates nothing new. |
| KPIs | Reply rate. Detection latency. Detection uptime. Unmatched-message count. |

### Stage 8 — Reply Classification

| | |
|---|---|
| Input | A detected reply or bounce. |
| Autonomous action | Apply deterministic rules first: a delivery status notification becomes `bounce`, and an explicit unsubscribe or stop request becomes `opt_out`. Otherwise a model classifies the reply into exactly one class from §6, with a confidence score and the quoted span it relied on. |
| Output | A classification on the reply, plus the state changes listed in §6. `opt_out` writes the domain or address to the suppression list immediately. That is protective internal work and needs no approval. |
| Founder approval | No for classification. Any response to the prospect is gated in stage 9. |
| Failure conditions | Malformed model output → rejected; the reply goes to founder review. Confidence below threshold → founder review, and follow-ups for that prospect pause. Ambiguity between `opt_out` and any other class → treated as `opt_out` (fail closed). |
| Idempotency | One classification per inbound Message-ID. A founder override records a new version and does not re-trigger side effects already taken. |
| KPIs | Class distribution. Founder override rate, as the accuracy measure. Time from reply to classification. |

### Stage 9 — Follow-up

Covers both follow-ups after no reply and responses to classified replies.

| | |
|---|---|
| Input | Time elapsed since the last send with no reply, or a classification from stage 8. |
| Autonomous action | Draft the next message according to §6. No-reply follow-ups: after a configured interval (current default 3 days), at most a configured number (current default 2). Responses may give a price indication inside the §2.2 bands, labelled as an indication. Each draft carries an opt-out. |
| Output | `EmailDraft` plus a pending approval: G2 for a follow-up or response, G3 for a meeting proposal or booking. Or, when the reply qualifies, a hand-off to stage 10. |
| Founder approval | **Yes — G2 / G3 for every message.** |
| Failure conditions | Follow-ups stop permanently on any reply, on `opt_out`, on `bounce`, on `negative` and when the prospect is marked lost. They pause while reply detection is unavailable (§12.1). Suppression is re-checked before drafting and before sending. A contact named in a `wrong_person` reply is a **new** contact: it goes through §3 and needs its own G1. |
| Idempotency | One draft per (prospect, sequence step). One pending follow-up approval per prospect at a time. |
| KPIs | Reply rate per follow-up step. Time from reply to response draft. Share of conversations reaching a proposal. |

### Stage 10 — Proposal

| | |
|---|---|
| Input | A qualifying conversation (`interested`, `pricing_request`, or a meeting held), plus the audit and the Opportunity. |
| Autonomous action | Generate a proposal containing every element in §7, with prices inside the §2.2 bands. |
| Output | Proposal `Artifact` (versioned). Opportunity stage becomes *proposal*. |
| Founder approval | Not for drafting. Sending requires G4 (stage 11). |
| Failure conditions | Any required element missing → rejected. Price outside a band → rejected. No qualifying conversation → no proposal. |
| Idempotency | One active proposal version per Opportunity. A revision creates a new version and supersedes the old one; the old one can never be sent after that. |
| KPIs | Proposals per week. Time from qualifying reply to proposal. |

### Stage 11 — Founder Approval (proposal)

| | |
|---|---|
| Input | A pending G4 approval: the proposal version hash, the recipient and the covering message. |
| Autonomous action | None for the decision. After approval, the proposal is sent under the same execution rules as stage 6. |
| Output | Proposal sent, recorded as `ExecutionHistory` + `ActionResult`. Waiting assignment closed. Opportunity stage becomes *proposal sent*. |
| Founder approval | **Yes — G4.** |
| Failure conditions | Proposal revised after approval → approval invalid. The validity period has expired → the proposal cannot be sent; a new version is needed. |
| Idempotency | As stage 6: one send per approval. |
| KPIs | Proposal acceptance rate. Time from sending to decision. |

**Acceptance.** None of the reply classes in §6 means "accepted". In the first loop, the founder confirms proposal acceptance, recorded against the exact proposal version. MioOS may suggest that a reply looks like acceptance. It may not record acceptance itself.

### Stage 12 — Invoice

| | |
|---|---|
| Input | A proposal version with founder-confirmed acceptance. |
| Autonomous action | Draft the setup invoice. Its line items and amounts must equal the accepted proposal version. |
| Output | Pending G5 approval. After approval: a Stripe invoice created with a deterministic idempotency key, `ExecutionHistory` + `ActionResult`, and a `RevenueEntry` of kind *invoiced*. |
| Founder approval | **Yes — G5.** |
| Failure conditions | Amount or line items differ from the accepted proposal → rejected. Stripe outcome ambiguous → look up the invoice by idempotency key or metadata before any retry; no blind retry (§14). |
| Idempotency | Stripe idempotency key = hash(approval id, payload hash). One setup invoice per accepted proposal version. |
| KPIs | Time from acceptance to invoice. Invoice error rate. |

### Stage 13 — Payment

| | |
|---|---|
| Input | A Stripe payment event, delivered by a signature-verified webhook. A read-only reconciliation poll is the fallback. |
| Autonomous action | Verify the event. Match it to the invoice. Record the payment. |
| Output | `RevenueEntry` of kind *collected*, with amount, currency, Stripe reference and owning unit. Opportunity stage becomes *won*. |
| Founder approval | No. Recording a verified payment is internal. |
| Failure conditions | Invalid signature → rejected. Amount differs from the invoice → recorded as a discrepancy and escalated. Event cannot be matched → escalated. Payment state ambiguous → no action (§14). |
| Idempotency | Unique on Stripe event id and on invoice id. A replayed event creates no second `RevenueEntry`. |
| KPIs | Days to pay. Collection rate. Collected €. |

### Stage 14 — Delivery

| | |
|---|---|
| Input | A *won* Opportunity with collected setup payment, the accepted proposal scope, and the customer's access and content. |
| Autonomous action | Build in a staging environment owned by MioOS: pages, forms, lead routing, acknowledgement, tracking. Run leadflow tests with test submissions in staging. Prepare the customer review. Semi-autonomous: the founder may do or finish parts by hand. |
| Output | Delivery `Artifact`. Pending G7 approval for go-live. After go-live has been verified, a pending G6 approval to start recurring billing. |
| Founder approval | **Yes — G7** (changing a live website, §6.2). **Yes — G6** (starting a subscription, §6.3, financial, locked). |
| Failure conditions | Customer access or content missing → blocked, and the founder is told. A post-go-live check fails (site down, form not delivering) → roll back to the previous version and escalate. Recurring billing never starts before a verified go-live. |
| Idempotency | Each deployment is keyed by (delivery id, build version). The subscription key = hash(approval id, payload hash); at most one active subscription per customer per offer. Each paid period writes one `RevenueEntry` of kind *recurring*. |
| KPIs | Days from payment to go-live. Revision rounds. Delivery cost, including founder hours. Leads delivered to the customer in the first 30 days. |

**Customer client credentials.** Credentials for a customer's hosting or DNS are production credentials. They are stored and used only under §19 and §9 rules, in connector mode `approval_required`.

### Stage 15 — Upsell

| | |
|---|---|
| Input | A live customer with leadflow data, after a configured minimum period live (proposed default 30 days). |
| Autonomous action | Identify an upsell from **observed** customer data, such as lead volume, conversion or unanswered leads. Recommend a price inside the €500–€2,000 band and draft the message or upsell proposal. |
| Output | Draft plus a pending G8 approval. If accepted: an upsell proposal and invoice, via G8 and then G9. |
| Founder approval | **Yes — G8, G9.** |
| Failure conditions | No observed data supporting the upsell → no draft. Customer has opted out of marketing or has an open complaint → no draft. Price outside the band → rejected. |
| Idempotency | At most one open upsell per customer at a time. Keyed by (customer, upsell type, period). |
| KPIs | Upsell rate. Upsell revenue per customer. |

### Stage 16 — Revenue + Margin

| | |
|---|---|
| Input | `RevenueEntry` rows (invoiced, collected, recurring, refund) and cost records for `mio-solutions`: LLM, search, tools, SMTP and hosting, and logged founder delivery hours. |
| Autonomous action | Compute, per customer and for the whole loop: collected revenue, recurring revenue, direct costs and gross margin. Keep forecast (Opportunity) and real revenue in visibly separate figures. |
| Output | A per-customer and loop-level margin view, surfaced in Today and Workforce in outcome language. |
| Founder approval | No. Internal accounting. |
| Failure conditions | Cost data missing for a period → margin shown as *incomplete*. Missing costs are never treated as zero. An invoiced amount is never shown as collected. |
| Idempotency | Derived figures are recomputed deterministically from the ledger. `RevenueEntry` is unique on provider reference. |
| KPIs | Collected €. MRR, from collected recurring payments. Gross margin %. Acquisition cost per paid customer. Payback period. |

### Stage 17 — Learning

| | |
|---|---|
| Input | Outcomes from every stage: approvals and rejections with reasons, replies and classes, founder overrides, acceptance, payment, delivery cost, margin. |
| Autonomous action | Produce a periodic learning report: conversion per stage, which audit facts and message elements correlate with replies, and classification accuracy. Within founder-set bounds, adjust **internal** parameters: ICP query ranking, audit signal weights, draft style, price recommendation within the bands. |
| Output | Learning report `Artifact`. Where a change requires founder authority, a founder decision in Decide with evidence and the expected impact of approving and of rejecting it. |
| Founder approval | Not for internal parameters. **Founder decision required** to change price bands, offer scope, send caps, budgets, autonomy or approval requirements, or portfolio priority (§2.1.1, §10, §15). |
| Failure conditions | Sample too small → the report states it is inconclusive and changes nothing. A recommendation without supporting data → not raised. |
| Idempotency | One report per period. One pending founder decision per recommended change. |
| KPIs | Trend in stage conversion. Trend in cost per paid customer. Founder override rate over time. |

---

## 6. Reply classes

| Class | Meaning | State change | Follow-up sequence | Next action (always approval-gated if external) |
|---|---|---|---|---|
| `interested` | Positive interest | Prospect → *interested* | Stops | Response draft (G2) or proposal (stage 10) |
| `wants_more_info` | Asks for details | Prospect → *engaged* | Stops | Information response draft (G2) |
| `pricing_request` | Asks for price | Prospect → *engaged* | Stops | Response with a price indication inside the bands (G2), or proposal |
| `objection` | Raises a concern | Prospect → *engaged* | Stops | Response draft addressing the objection (G2) |
| `later` | Not now, maybe later | Prospect → *deferred*, with a re-contact date | Stops | Re-contact draft on that date (G2) |
| `wrong_person` | Not the right contact | Prospect → *redirected* | Stops | A named new contact goes through §3 and needs G1 |
| `meeting_request` | Wants a call | Prospect → *meeting requested* | Stops | Meeting proposal or booking (G3) |
| `negative` | Not interested | Prospect → *lost* | Stops permanently | None |
| `opt_out` | Asks not to be contacted | Prospect → *lost*; domain or address → **suppression list** | Stops permanently | None. No message of any kind, ever. |
| `bounce` | Delivery failed | Prospect → *undeliverable* | Stops permanently | None. The address is not retried. |

Any reply stops the no-reply follow-up sequence. Only stage 9 continues the conversation, one approved message at a time.

---

## 7. Proposal contents

Every proposal contains all of the following, or it is rejected in stage 10:

| Element | Content |
|---|---|
| Problem | The prospect's problem, citing observed audit facts. |
| Solution | How AI Website + Leadflow Upgrade solves it. |
| Scope | What is included, by page, form, integration and leadflow route. |
| Deliverables | The concrete items handed over or put live. |
| Timeline | Milestones from acceptance to go-live. |
| Setup fee | One amount inside €750–€1,500. |
| Recurring fee | One monthly amount inside €250–€750, what it covers, and when billing starts (at verified go-live). |
| Assumptions | What the price and timeline depend on, such as content supplied by the customer or access provided. |
| Exclusions | What is not included. |
| Validity period | The date after which the proposal can no longer be accepted. Founder-configured. |

---

## 8. Idempotency summary

| Object | Key |
|---|---|
| Prospect | Normalized domain |
| Audit | (prospect, site-content hash) |
| Opportunity | (prospect, offer) — one open at a time |
| Outreach / follow-up draft | (prospect, sequence step) |
| Any external execution | hash(approval id, payload hash) → one `ActionResult` per approval |
| Inbound reply | Message-ID |
| Classification | Message-ID (with versioned overrides) |
| Proposal | (opportunity, version) — one active |
| Stripe invoice / subscription | hash(approval id, payload hash), sent as Stripe idempotency key |
| Payment | Stripe event id and invoice id |
| Deployment | (delivery id, build version) |
| Learning report | Period |

---

## 9. Loop KPIs

| KPI | Definition | Counts as revenue? |
|---|---|---|
| Qualified prospects / week | Prospects passing §3 | — |
| Outreach approved / sent | G1 approvals and successful sends | — |
| Reply rate | Detected replies ÷ sends (bounces excluded) | — |
| Positive reply rate | `interested` + `pricing_request` + `meeting_request` ÷ sends | — |
| Opt-out and bounce rates | Per send | — |
| Proposal rate | Proposals sent ÷ positive replies | — |
| Win rate | Accepted ÷ proposals sent | — |
| Pipeline value | Sum of Opportunity forecasts | **No** — forecast |
| Invoiced € | `RevenueEntry` kind *invoiced* | No — not collected |
| Collected € | `RevenueEntry` kind *collected* + *recurring* paid, minus refunds | **Yes** |
| MRR | Collected recurring for the latest full month | Yes |
| Cost per paid customer | Unit costs in the loop ÷ paid customers | — |
| Gross margin % | (Collected − direct cost) ÷ collected | — |
| Founder decisions per paid customer | Gates decided per customer won | — |

---

## 10. Constitution conformance

Conflicts identified between the original loop request and Constitution v1.1, and how this document resolves them. In every case the Constitution is applied as written.

| # | Request as given | Constitution | Resolution in this document |
|---|---|---|---|
| 1 | Two founder approval stages (outreach, proposal) | §5 one approval = one action + one payload; §6.2; §6.3 | Ten gates (§4.1), each its own approval. Stages 5 and 11 remain as named. |
| 2 | Recurring fee as part of the offer | §6.3 starting subscriptions is financial and locked; §5 recurring revenue per period | Separate G6 after verified go-live. One `RevenueEntry` per paid period. |
| 3 | "Real collected money goes to RevenueEntry" | §5 RevenueEntry holds invoiced, collected, recurring and refunds | All four kinds used. Revenue KPIs count only collected (§9). |
| 4 | Learning stage | §2.1.1 authority; §10 budgets; §15 the founder changes autonomy policies | Learning adjusts internal parameters only. Everything else becomes a founder decision. |
| 5 | Delivery "semi-autonomous" | §6.2 changing a live website is external | Building in staging is internal. Go-live is G7. |
| 6 | First loop on the AI Website Agency | §2.1.1 reallocation between portfolio ventures is a founder decision | Founder decision FD-001: execution-loop priority only. Portfolio order and allocator ranking unchanged. |

`docs/FOUNDER_LOOP_MAP.md` describes moving outreach, invoice and subscription approvals to auto-approval once there is a track record. That conflicts with §5 ("never auto-approved" for action types that have an executor) and §6.3. That file was rewritten on 2026-10-18, and its auto-approval mechanism is now marked void.

---

## 11. Current code versus this specification

Recorded so that implementation starts from reality (see `docs/ARCHITECTURE_REALITY_AUDIT.md`). None of this is changed by this document.

| Area | Today | Required here |
|---|---|---|
| Offer | No "AI Website + Leadflow Upgrade" offer. The nearest offer, "AI Website Refresh", uses €750–4,000 setup and €0–300/month (`lib/ai-ventures/offers.ts`). | One offer with the §2.2 bands, held in founder-owned configuration. |
| Forecast vs revenue | `lib/opportunity-engine.ts` writes `[Potential]` `RevenueEntry` rows. | No forecast in `RevenueEntry` (§19 item 13). |
| Suppression / opt-out | No suppression list or opt-out handling found in `lib/` or `app/`. | §12.1 in full (§19 item 11). |
| Reply detection | IMAP scan of the last 24 hours, at most 30 messages; a reply marks the prospect *interested*. | Gap-free scan, bounce detection, the ten classes, a halt when detection is unavailable. |
| Follow-ups | Auto-drafted after 3 days, max 2. | Each one approval-gated (G2); stop rules per §6. |
| Approval triage | Auto-approves low-risk approvals after 48 hours. | Never for action types that have an executor. |
| Invoice / subscription | Stripe executors exist without idempotency keys, and nothing raises invoice approvals. | G5 and G6 with deterministic idempotency keys. |
| Payment | The Stripe webhook route is blocked by `middleware.ts`. | A signature-verified, reachable webhook, plus reconciliation. |
| Proposal | No proposal artifact with the §7 elements. | Versioned proposal artifact. |
| Delivery, upsell, margin, learning | Not implemented. | Stages 14–17. |

---

# Implementation Phases

Phases only. Each phase starts only when the previous one has met its exit criteria. No phase enables a production credential unless the Constitution permits it at that point.

### Phase 0 — Governance foundations

Complete and prove every item of Constitution §19, in its order, starting with the test harness. The plan is in `docs/PHASE_0_SAFETY_PLAN.md`. That includes the outreach suppression list, opt-out handling and send caps; the separation of forecast from revenue; budgets and cost accounting per unit; and tested off-server backups.

**Exit:** every §19 item (1–15 and 5A, Constitution v1.2) proven by tests. No production credential exists before this.

### Phase 1 — Offer and pricing as configuration

Define AI Website + Leadflow Upgrade, its §2.2 bands, the proposal template (§7) and the validity period as founder-owned configuration.

**Exit:** prices outside a band are rejected in tests.

### Phase 2 — Internal pipeline (stages 1–4)

Prospect discovery, audit, offer selection and outreach drafting against fake providers. Then, once Phase 0 allows it, run with budgeted read-only search and fetch connectors. Drafts land in Decide.

**Exit:** a founder-reviewed set of drafts that cite real fetched facts, with zero template output advancing.

### Phase 3 — Outreach path (stages 5–9)

Approval, send, reply detection, classification and follow-up, with all stop rules, suppression and caps. The founder confirms the legal compliance of outreach before the first production send (§12.1).

**Exit:** the first approved production sends, with every reply class handled in tests. An opt-out is suppressed within one detection cycle.

### Phase 4 — Proposal, invoice and payment (stages 10–13)

Versioned proposals, founder-confirmed acceptance, the idempotent invoice executor, the verified webhook and reconciliation.

**Exit:** an end-to-end test from acceptance to a collected `RevenueEntry` with a replayed event creating no duplicate. Then the first real invoice.

### Phase 5 — Delivery and recurring billing (stage 14)

Semi-autonomous delivery in staging, the go-live approval with rollback, and the subscription approval after verified go-live.

**Exit:** the first customer is live, recurring billing has started under G6, and the first recurring `RevenueEntry` has been recorded.

### Phase 6 — Margin, upsell and learning (stages 15–17)

Margin per customer from recorded costs, data-driven upsell drafts, and the periodic learning report with founder decisions for anything outside internal authority.

**Exit:** the first revenue loop is complete under §1, and margin is computable for every paying customer.
