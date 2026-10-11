# AI Ventures — Founder Loop Map

Standing rule: every manual founder step is classified as one of:
- **Autonomous** — MioOS does it end-to-end (no founder).
- **Delegated** — an autonomous Workforce team owns it (still no founder, different unit).
- **Founder-only: permanent** — deliberately never automated (security, legal, human trust/judgment).
- **Founder-only: for-now** — gated only until a condition is met, then it moves to Autonomous
  (usually via approval-triage auto-approve once a track record + limits exist).

The strategy to remove the founder = migrate "for-now" rows to Autonomous by raising the
autonomy threshold as trust accrues, while keeping money/new-external-contact gated early.

| # | Manual step | Category | Owner target | What unlocks removal |
|---|---|---|---|---|
| 1 | Discover leads | 🟢 Autonomous (DONE) | runtime | Web-search ICP → Prospect rows, interval-gated + capped. ICP = SystemConfig "icp_queries" |
| 2 | Obtain contact email | 🟢 Autonomous (DONE, on-site) / 🟠 backlog for enrichment | runtime | Harvested from the site during analysis. Verified-email enrichment (Hunter/Apollo) = backlog, needs provider key |
| 3 | Website/process analysis | ✅ Autonomous (done) | engine | Already real (website-analyzer) |
| 4 | Offer selection | ✅ Autonomous (done) | engine | Rule-based matcher |
| 5 | Proposal / audit / outreach drafting | ✅ Autonomous (done) | engine | AI + real signals |
| 6 | Approve outreach (external contact) | Founder-only: for-now → Autonomous | founder → triage | Auto-approve once N sent + acceptable reply/complaint rate + daily volume cap |
| 7 | Send outreach | ✅ Autonomous (done, gated by #6) | runtime | Already sends on approval |
| 8 | Detect replies | 🟢 Autonomous (DONE) | runtime | reply-matcher on IMAP → prospect → "interested" + signal |
| 9 | Draft follow-ups | 🟢 Autonomous (DONE) | runtime | Auto-drafts + queues after N days no reply, capped |
| 9b | Send follow-ups | 🟠 Founder-only (for-now) → Autonomous | founder → triage | Auto-send once reply/complaint rate over N sends acceptable, under daily cap |
| 10 | Book meeting | Delegated (later) | Sales team | CalendarProvider (Cal.com link now; API later) |
| 11 | Sales conversation / close | Founder-only: permanent (early) → partly Delegated | founder | Human trust; later qualification + scheduling delegated, human still closes |
| 12 | Set price & deal terms | Founder-only: for-now → Autonomous suggestion | founder | Engine proposes price; founder approves; later auto within pricing bands |
| 13 | Approve invoice | Founder-only: for-now → Autonomous | founder → triage | Auto-approve for won prospects under a value cap once track record exists |
| 14 | Approve subscription | Founder-only: for-now → Autonomous | founder → triage | Same as #13, for recurring |
| 15 | Approve pricing change / cancellation | Founder-only: permanent | founder | Money + relationship risk — keep gated |
| 16 | Invoice / subscription creation | ✅ Autonomous (done, gated) | runtime | Stripe provider, runs on approval |
| 17 | Recurring revenue / MRR tracking | ✅ Autonomous (done) | runtime | Webhook → RevenueEntry |
| 18 | Onboard customer | Delegated (later) | Support/Operations team | Onboarding sequence (drafts autonomous, external sends gated) |
| 19 | Deliver the service (build site/automation) | Founder-only: permanent (services) / Autonomous (products) | founder/contractor for agency; product for Mail Co-Pilot/AION | The product delivers itself; bespoke agency work stays human |
| 20 | Deploy + credentials + Stripe setup | Founder-only: permanent | founder | Secrets/ops/security — never automate |

## The removal mechanism (reuse what exists — do NOT build new)
Every "Founder-only: for-now" row moves to Autonomous the same way, via the **existing**
`approval-triage` + autonomy level + budget governor:
1. Start: founder approves everything (current state).
2. Accrue track record (sends, replies, complaints, paid invoices) — already recorded.
3. Raise the autonomy level for a specific decisionType so `approval-triage` auto-approves it
   **within limits** (daily volume cap, per-deal value cap, only already-contacted prospects).
4. Founder-only: permanent rows (money-risk changes, deploy/secrets, the human close) never move.

Order to remove the founder (highest leverage first, after first revenue):
#8 reply detection → #9 follow-up send (capped) → #13/#14 invoice/subscription auto-approve
(value-capped) → #6 outreach auto-approve (volume-capped) → #1/#2 discovery+enrichment.
