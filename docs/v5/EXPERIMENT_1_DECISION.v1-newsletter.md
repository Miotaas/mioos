# MioOS V5 — Experiment #1 Decision

Decided 2026-09-02. Supersedes the Phase 0 recommendation. **Awaiting approval before any code.**
Full A–L package: https://claude.ai/code/artifact/a2b09ac2-2166-454c-b38a-61f51b87af42
Prior document: [PHASE0_ASSESSMENT.md](./PHASE0_ASSESSMENT.md)

---

## DECISION: Model A (Media Cash Cow), newsletter-led

| | |
|---|---|
| **Niche** | European freight, forwarding and warehouse operations |
| **Audience** | Ops managers, planners, forwarding agents, 3PL owners — 5–200 staff, NL/BE/DE, English-language |
| **Platform** | Weekly **email newsletter**. No gatekeeper, no YPP threshold, no API audit, no algorithm. |
| **Format** | 800–1,200 words original analysis, one original chart, one practical takeaway |
| **Identity** | Independent trade publication, **Mio named as editor** — bylined, not anonymous |
| **Monetisation** | Stage 4: logistics-software sponsorship → affiliate → data product. B2B newsletter CPM $50–100+; lists under 5,000 subs charge $50–250/placement |
| **CTA** | Subscribe and reply. **Nothing is sold from this property until Stage 4.** |
| **Cadence** | One issue per week — non-negotiable |

**W3 (media production / FFmpeg / TTS) is DEFERRED to Stage 3.** Build W1 + W2 now. Video launches into an audience that already exists.

---

## Why A over B — changed from Phase 0

Two new facts drove the change:

1. The staged ladder makes Model A falsifiable on **leading indicators** rather than revenue, removing the objection that killed it last time.
2. A 3,000-subscriber B2B newsletter monetises with **no platform gatekeeper** — Stage 4 is reachable in months, not years.

**The deciding argument:** Model B as a service is the least autonomous thing to build. Every customer adds permanent human load; €10k/month = 22 SME clients = a job, not a system. Model A's cost curve runs the other way — the archive compounds and each additional property costs less than the last.

Model B stays in the roadmap as the **funding engine**, started at Stage 3, deliberately capped.

### Deliberate disagreement with brief §8

A and B share a **domain** (logistics) at experiment stage — but not a brand and not a CTA. Full separation is correct at scale and premature for one person with €150. Convergence happens at Stage 4, turning cold outreach into warm inbound.

---

## Recommended Stage-3 offer (Model B — not yet)

Freight quote & tender-response automation for NL/BE forwarders, 5–40 staff.
**€750 setup + €450–650/month.** Chosen because its buyers are the newsletter's readers.

Runners-up: offerte automation for installers (best documented demand, more competition); AI tool consolidation (evidence-backed but stays consulting-shaped).

---

## Validation ladder — gates set BEFORE the work

| Stage | Scope | GO | KILL | Budget / box |
|---|---|---|---|---|
| **S1** Content–market signal | 8 issues | ≥40% opens · ≥6% clicks · ≥40 organic subs · **≥2 unsolicited replies from real freight people** | <25% opens AND <15 organic subs | €50 / 10 weeks |
| **S2** Repeatability | issues 9–24 | ≥3 of last 8 beat median of first 8 on clicks · growth ≥10%/mo · churn <3%/mo | Flat across 16 issues, **OR cadence missed 4+ times** | €150 cum. / month 6 |
| **S3** Audience economics + video | ~2,000 subs | CPS <€1 · ≥1,500 subs by month 9 · first 6 videos CTR>4%, retention>40%, return-viewer>10% | Growth stalled <800 subs for 3 months | €400 cum. / month 10 |
| **S4** Monetisation | — | ≥€250 collected in one month | Zero revenue by month 14 | month 14 |
| **S5** Profitability | — | Revenue > direct costs + (hours × €50) for 3 consecutive months | Negative at month 20 | month 20 |
| **S6** Autonomous scaling | — | <20 min human time per item · second property launched within 30 days | — | **Mission Control earned here** |

**PIVOT paths:** S1 good opens + weak clicks → wrong format, right audience. S2 one format outperforming → narrow to it. S3 video misses all three thresholds → stay written-only (an acceptable outcome, not a failure). S4 no sponsor interest at 3,000 engaged subs → pivot to the Model B offer, which by then sells warm.

### Anti-sunk-cost rule

**A stage missing its GO criteria at its time box gets PIVOT or KILL, never an extension.** "We just need more content" is legitimate only *before* the time box. Making that argument after the box is the signal, not the counter-argument.

---

## Economics — Stage 1

| Line | Cost |
|---|---:|
| Hetzner CX23 + backups, 2 months | €14.50 |
| Domain, 1 year | €12 |
| LLM (Haiku 4.5 + Sonnet 5) | €6 |
| Web search API | €5 |
| Email sending (free tier to 1,000 subs) | €0 |
| TTS / visuals / video — not used at Stage 1 | €0 |
| **Total** | **≈ €38** |
| **Per issue** | **≈ €1.40** |

**€150 hard ceiling stands.** It now covers Stages 1 and 2 together (~24 issues over 6 months) instead of one 6-week video experiment. A costed Stage 3 proposal (~€400) follows if S2 passes.

---

## Infrastructure

**Second Hetzner CX23** — 2 vCPU / 4 GB / 40 GB, €6.04 + €1.21 backups ≈ **€8.25/month all-in**. NOT `aion-prod-1`.

- CX33 (4 vCPU / 8 GB / 80 GB, ~€10.50) is the **Stage-3** machine when FFmpeg arrives — not before
- Upgrade trigger is a measurement, not a feeling: first render exceeding 5 minutes, or Postgres RSS crossing ~1.5 GB
- CPU/RAM upgrades are in-place and reversible. **Disk growth is one-way** — start at 40 GB deliberately
- Own project, firewall, SSH key, secrets, subdomain. No AION credential on this box.

**Flagged, not acted on:** `aion-prod-1` has Backups disabled, no snapshots, no activity in 90 days. Enabling backups is €1.21/month and one click. Not touched, per instruction.

---

## Model routing (verified 2 Sep 2026, platform.claude.com)

| Tier | Model | Price /Mtok | Use |
|---|---|---|---|
| Cheap | Claude Haiku 4.5 | $1 in / $5 out | Extraction, classification, tagging |
| Mid | Claude Sonnet 5 | $2 in / $10 out | Synthesis, drafting |
| Escalation | Claude Opus 5 | $5 in / $25 out | Only when lower tiers fail |

Every routing decision records a reason. Deterministic tasks never call an LLM.

---

## The first 10 issues

| # | Topic | Why it's in the set |
|---|---|---|
| 01 | What a four-hour dock wait actually costs | Opens with a number every reader recognises and has never totalled |
| 02 | The real cost of one manual quote (43 min, six systems) | Seeds the Stage-3 offer without selling |
| 03 | Why your TMS integration failed — three patterns | Vendor-adjacent without being vendor-friendly |
| 04 | The spreadsheet that runs your planning | Key-person risk. High forward-share potential |
| 05 | Reading a rate sheet properly — six lines where margin hides | Immediately actionable; drives return-visit rate |
| 06 | Customs data after ICS2: real compliance cost | Regulatory content is the highest-value evergreen |
| 07 | **e-CMR in 2026: adoption, honestly** | **First original-research issue. Protect this one — it is the whole differentiator** |
| 08 | How small forwarders lose tenders they should win | Second offer seed; strongest sponsorship-adjacent topic |
| 09 | What AI can and cannot do in freight ops — the honest version | Counter-positions against every vendor writing hype |
| 10 | The eight numbers a 20-person forwarder should watch weekly | Highest-utility issue; natural lead magnet for Stage 2 |

Shape: 1–5 build credibility on what readers already feel · 6–8 add information unavailable elsewhere · 9–10 establish voice and produce a reusable asset.

---

## Technical plan — Stage 1–2 only

| Component | Shape | Source |
|---|---|---|
| Repo | New, beside V4. `/app` `/lib` `/worker` `/prisma` `/tests`. ~12 routes. | NEW |
| Database | Postgres, nine tables, indexes on every filtered/sorted column, `prisma migrate` from commit one | NEW |
| Queue + worker | Redis-backed, real backoff, dead-letter list. V4's optimistic-lock and crash-recovery patterns reimplemented. | PATTERN |
| Provider abstraction | V4's `provider.ts` + token/cost capture on every call | V4 + EXT |
| W1 Discovery & Research | Sources → topics → search → claim extraction with URL provenance | NEW |
| W2 Strategy & Draft | One structured call: angle, headline, 900-word draft, chart spec, subject line. Schema-validated; invalid output rejected and retried, never repaired. | NEW |
| W3 Media Production | **Interface defined, not implemented.** `MediaProducer` behind a clean boundary. | DEFERRED |
| W4 Review, Send, Measure | Review row required → approval → send → **verify provider accepted and store external id** → ingest opens/clicks daily | NEW |
| Cost ledger | Every paid op: provider, model, units, tokens, est + actual cost, workflow, item, retries, outcome. Checked *before* the call. | NEW |
| State machine | Illegal transitions throw. `PUBLISHED` requires a verified external id. | NEW |
| UI | One page: Needs Attention · Pipeline · Approvals · Cost · Results · Failures. Empty state says zero when it is zero. | V4 TOKENS |
| Logging / alerting | V4's `auditLog` + `alert-manager`, retargeted at spend ceilings and failed sends | V4 |
| Deployment | V4's Dockerfile + compose, **seed lines stripped**. Caddy, CX23, nightly `pg_dump` off-box + Hetzner Backups. | V4 |

### The eight tests, written first

1. Spend ceiling refuses the operation **before** the provider call
2. Same item + same workflow cannot produce two runs — unique constraint, not check-then-act
3. No `publication` row without an approved `review` row
4. Retries bounded and backing off; terminal failure recorded
5. Provider failure records partial cost and leaves the item resumable
6. Every illegal state transition throws
7. Ingesting the same metric snapshot twice produces one row
8. **External action verification** — `content_item.state` cannot become `PUBLISHED` unless `publication.external_id` is non-null AND was returned by the email provider in a 2xx. A mocked provider error must leave state at `APPROVED` and raise.

Test 8 is the machine-checked form of the primary V5 rule: **no internal success without an external effect.** It is the test V4's whole architecture would have failed.

---

## Security & failure controls

| Risk | Control |
|---|---|
| Runaway API spend | Pre-call ceiling check. Per-op, per-item, daily caps. Worker halts and alerts; no workflow raises its own limit. |
| Repeated jobs | Unique constraint per (item, workflow). Max attempts. Dead-letter. Loop detector on runs/item/hour. |
| Leaked secrets | Env only, never in prompts or logs. `SESSION_SECRET` a hard boot requirement — V4's fallback deleted, not fixed. No AION credential on the box. |
| Accidental send | Approval gate + test-send to self required before the real send unlocks |
| Copyright / sourcing | `research_source` mandatory. No claim ships without a retrievable URL. Charts built from data, not lifted. |
| Wrong or defamatory claims | Human review is a required state. Naming a company negatively triggers a hold. You are the named editor — the control is you reading it. |
| Database loss | Nightly `pg_dump` off-box + Hetzner Backups. **Restore tested once in week 2, before it matters.** |
| Provider outage | Timeout, contained failure, resumable item |
| Duplicate external action | Idempotency key on send; external id checked before any retry |
| Disk exhaustion | Alert at 70%. Retention policy from day one, even though Stage 1 stores almost nothing. |

No RBAC. No environment separation beyond dev and prod. No secrets manager. One user, one box, one set of keys.

---

## Key negative finding

**NL mandatory B2B e-invoicing starts 1 January 2030** — draft legislation consulted end-2026; EU ViDA cross-border July 2030. *[Certain — KPMG, May 2026]*

There is no compliance-urgency wedge for NL SMEs in the next 18 months. Any Model B offer must sell on ROI alone, which is harder.

---

## Falsification

**What would prove this wrong:** eight well-executed issues, sent to a list built from people who genuinely work in European freight operations, producing <25% opens and <15 organic subscribers. That would mean the audience doesn't want independent analysis of their own industry from an outsider.

*This is the assumption I am least certain of. Absence of competition can mean white space, or it can mean no demand — and I have no data showing freight operators read trade newsletters, only that no good one exists.*

**Two further fatal signals:**

- **You cannot produce issue 07.** If the original-research issue can't be done, this is a commentary blog, not a publication, and the defensibility argument collapses.
- **Cadence breaks.** Four missed weeks in the first sixteen means the model is wrong about your available time, regardless of content performance.

**What justifies V2:** Stage 4 passed — **€250 collected in one month against a channel costing under €30/month.** That single fact establishes every part of the thesis at once: the content is wanted, the audience is commercially valuable, the pipeline is cheap, and MioOS produced something outside itself with economic value. Only then are the Control Plane, the typed event bus, a second property and eventually Mission Control justified by operating requirements rather than imagination.

---

*Until then, MioOS is nine tables, four workflows, one page, and a send button that a person presses.*
