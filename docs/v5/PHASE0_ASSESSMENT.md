# MioOS V5 — Flight Readiness

**V4 Autopsy & Social Engine Go/Kill**

| | |
|---|---|
| **Date** | 2 September 2026 |
| **Scope** | V4 repo forensics · Social economics · V5 experiment plan |
| **Status** | Decision required |
| **Production code written** | None |

Confidence tags used throughout: `[Certain]` hard evidence · `[Likely]` strong inference · `[Guessing]` filling gaps.

---

## VERDICT — PIVOT

**The Social Engine as specified cannot work, and the reason has nothing to do with your architecture.** Platform ad revenue is structurally closed to a Netherlands operator on all three target platforms simultaneously — and YouTube has published the date it closes further.

The engine is still worth building. But it is not a media business monetised by ad revenue. It is a **lead-generation channel for the Solutions Engine**, under your own name, at roughly one-hundredth the volume you planned. Your own hypothesis — content → audience → leads → services — is correct, and by a factor of 30–70×.

On the repo: **build a clean V5 core beside V4.** Salvage is about 1,600 of 47,100 lines. Not because V4 is bad, but because V4 contains no media pipeline, no publishing integration, and no OAuth — zero percent of what V5 actually does.

---

# DELIVERABLE 01 — V4 → V5 Forensic Repo Assessment

*47,102 lines, 81 models, 43 commits over 30 days. What survives, and what would poison V5 if carried across.*

## The finding that decides it

V4 is not a broken product. It is a *complete* product that does nothing external. Every path through the system terminates in a database row.

The live database is the proof: **41 approvals sit in `status='approved'` and the `action_results` table has 0 rows.** You approved 41 things and the system executed none of them, because `approval-dispatcher.ts` "executes" an approval by creating *another draft row*. There is no terminal action anywhere in the codebase. `[Certain]`

> ### The decisive fact for V5
>
> A hard grep for `ffmpeg|elevenlabs|whisper|tts|dall-e|replicate` across the whole repo returns **two hits, both false positives** — the word "replicate" in a sentence, and two environment-variable *names* in a placeholder catalogue. A grep for `youtube|tiktok|instagram|graph.facebook` returns 77 hits: **every one is a UI label, a hex colour, or a dropdown option.** Not one HTTP call.
>
> V4 contributes **0%** of the V5 video pipeline. The right framing is not "extend or rewrite" — V5 is a different application that can borrow V4's Dockerfile.

## Area-by-area

| Area | Verdict | Evidence | V5 action |
|---|---|---|---|
| **Deployment config** | KEEP | Proper 3-stage Dockerfile, non-root uid 1001, real healthcheck, log rotation, correct Postgres/SQLite branching. Genuinely well done. | Copy near-verbatim. **Strip lines 19–21 of `docker-entrypoint.sh`** — they seed fake data on every boot. |
| **AI provider abstraction** | KEEP | `lib/ai/provider.ts`, 314 lines. Clean interface, `Promise.race` hard timeout, four backends, cached factory. Best file in the repo — but bypassed twice by raw `fetch` calls. | Copy it. Delete the two bypasses. Add token/cost capture — it currently discards the `usage` block the API returns. |
| **Logging & alerting** | KEEP | `auditLog.ts` swallows its own failures so it can never break a caller — 41 call sites. `alert-manager.ts` really POSTs to Discord and ntfy. | Copy both. Retarget alerts at render failures and spend ceilings. |
| **Design tokens** | KEEP | `tailwind.config.ts` is a coherent dark palette with named surfaces, accents and shadows. | Copy as-is. The only part of the Mission Control vision worth carrying forward now. |
| **Four real connectors** | KEEP | `webSearch.ts` (Serper/Tavily), `email.ts` (ImapFlow), `email-send.ts` (nodemailer), `website-analyzer.ts` — which returns `null` when it fails instead of inventing an answer. | Copy the four. Useful for research and outreach in V5. |
| **Authentication** | REFACTOR | Competent HMAC, correct cookie flags. But `middleware.ts:19` falls back to a **hardcoded public constant** with no production guard, and `.env.example` ships `SESSION_SECRET=""` which `??` does not catch. Sessions are forgeable. | Keep the token shape. Make the secret a hard boot requirement in both paths. Add a real user record. |
| **Prisma schema / DB** | REFACTOR | 81 models, 1,556 lines. **Zero `@@index`. Three `@@unique`. No `migrations/` directory at all** — only ever `db push`'d. The queue polls on unindexed columns. | New schema at ~9 tables. Index everything you filter or sort on. Start `migrate` from commit one. |
| **Queue / worker** | REFERENCE | Not a queue — a `setInterval` over a Prisma table, 2 items per 60s tick (ceiling 2,880 jobs/day). But the optimistic lock and crash recovery are correctly implemented. | Read `runtime-queue.ts` for those two patterns. Then use a real queue — video encoding needs concurrency a 60s poll can't give. |
| **Approvals** | REFERENCE | The *design* is right: per-team autonomy config, governance fallback, keyword risk triage. The execution is a no-op (41 approved, 0 executed). | Keep the human-in-the-loop design. In V5 an approval must gate one irreversible, externally visible act. |
| **Dashboard components** | REFERENCE | 25,227 lines in 64 files, but `components/ui/` is **6 files / 288 lines** — effectively no primitive layer. Two 1,000-line `WorkforceView.tsx` files exist; one is an unimported stale fork. | Rebuild on a real primitive layer when V5 earns a UI. |
| **API routes** | ABANDON | 156 route files; **27 route groups are never called from any client file.** 131 of 156 handlers query Prisma inline, which is why nothing is testable. | Do not port. V5 needs about 12 routes. |
| **Cost tracking** | ABSENT | Does not exist. No `inputTokens`, `costUsd` or `.usage` anywhere. The one spend field, `BusinessUnit.budgetCents`, is annotated "enforced later by Action engine" — and is enforced nowhere. | Build day one. A media pipeline burns TTS + images + LLM per asset; you cannot run it blind. |
| **Event system** | ABSENT | No event bus. Zero `EventEmitter` hits. Coupling is ~30 inline `await import()` calls inside one loop file. | Build a typed event bus — the one architectural piece V4 most needed and never had. |
| **Business-unit isolation** | ABANDON | A nullable string column on 5 models with **no `@relation` on any of them**. No query scoping, no middleware. Looks like tenancy in the schema and enforces nothing. | Not needed at V1. If multi-brand arrives, use real relations. |
| **Demo / seed data** | ABANDON | `prisma/seed.ts` is **1,453 lines — as large as the schema** — and `docker-entrypoint.sh` runs it on every production container start. `purge-demo-data.ts` exists to undo it, identifying fakes by keyword-matching "Toast POS" and "Restaurant Scheduling". | Ship V5 with an empty database. Seeds create test fixtures only. |
| **Opportunity / prospect engine** | ABANDON | Prompts an LLM to extract opportunities from *its own prior output*. Result: 10 rows, 7 near-duplicate rewordings of one idea. `prospect-engine.ts` prompts "you cannot crawl the site — infer from the signals," then emits a client-facing audit with a fabricated score and a euro price. **prospects table: 0 rows.** | Delete entirely. Do not port these models. |
| **Testability** | ABANDON | Zero tests, no runner configured. Root cause visible in git: **47k lines across 43 commits in 30 days — ~1,100 lines per commit.** Code arrived in bulk and was never refined. | Pure functions with injected clients. Seven critical-behaviour tests before anything else (D4). |

## Salvage list — copy into V5 (~1,600 of 47,100 lines, 3.4%)

- `lib/ai/provider.ts` — 314 lines, the best file in the repo
- `tailwind.config.ts` — complete dark design-token set
- `Dockerfile` + `docker-compose.prod.yml` + `ecosystem.config.js` — ~200 lines
- `docker-entrypoint.sh` — provider-detection branch only, **strip the seed lines**
- `lib/auditLog.ts` — never let logging break the caller
- `lib/alerting/alert-manager.ts` — real Discord + ntfy delivery
- `lib/connectors/webSearch.ts` — real Serper/Tavily client
- `lib/actions/email-send.ts` + `lib/providers/email.ts` — real nodemailer behind a provider interface
- `lib/ai-ventures/website-analyzer.ts` — returns `null` when it fails instead of inventing an answer
- `lib/auth.ts` — token mechanics only, fix the secret first
- `runtime/runtime-queue.ts` + `runtime/error-guards.ts` — read for patterns, reimplement
- `.github/workflows/ci.yml` — add the test step it never had

## Landmines — actively harmful if carried forward

1. **Seed-on-boot.** 1,453 lines of fabricated companies and revenue injected into production on every restart.
2. **The forgeable session secret.** Do not copy `getSessionSecretSafe()`.
3. **The approval → draft loop.** Makes "approve" *feel* like execution while producing another row. In V5 approvals gate a real publish; inheriting this shape means you believe something published when it didn't.
4. **The fabricated revenue row.** `revenue_entries` holds a **€238,000** entry the engine wrote about its own invented product, sitting in the same table and the same UI as the €1,000 seeded one — indistinguishable to any dashboard reading it. This is precisely what a Mission Control built on mock data does to you.
5. **Zero indexes, zero migrations.** There is no upgrade path from V4's database, which means starting fresh costs you nothing you actually have.

## The uncomfortable pattern

98.8% of the 81 models are referenced in application code. I expected orphans from four pivots; instead the schema is fully wired. That makes it *worse*, not better: it is a complete, coherent, fully-connected map of a business that does not exist. The infrastructure — Docker, healthchecks, crash recovery, audit logging, graceful shutdown — is genuinely better than the product. Someone knew how to operate a system. What was missing was anything for that system to operate on.

---

# DELIVERABLE 02 — Social Engine Economics, September 2026

*Four independent structural barriers, any one of which would be enough on its own.*

## Barrier 1 — YouTube is doubling its thresholds on a published date

Current entry is 1,000 subscribers plus either 4,000 watch hours or 10M Shorts views in 90 days. **From 1 February 2027 that becomes 8,000 watch hours or 20M Shorts views.** `[Certain — YouTube Blog, 10 Aug 2026]`

The harder change is the payout floor: from the same date you must hold **10M qualified Shorts views per rolling 90 days, every month, to receive anything at all** from the Shorts pool. Below that you stay in the programme, keep other revenue, and earn **zero** from Shorts — while YouTube continues serving ads against them.

## Barrier 2 — Short-form ad revenue is a rounding error, and it cannibalises

Best dataset available (274 channels, 3,044 channel-months, within-channel design): Shorts RPM is **3–14% of long-form**, and Shorts contributed **under 2% of total revenue** across the sample. `[Likely — AIR Media-Tech, Jun 2026]`

The dose-response curve in Entertainment — same channels measured against themselves:

| Shorts published per month | Whole-channel RPM | Effect |
|---|---:|---|
| 0 | $4.99 | baseline |
| 1–5 | $4.18 | −16% |
| 6–20 | $1.73 | −65% |
| 21+ | $1.15 | **−77%** |

Posting more Shorts made channels earn less overall. A high-volume automated pipeline is not neutral — it is actively value-destroying on the same channel.

## Barrier 3 — the Netherlands is excluded, twice over

- **TikTok Creator Rewards operates in eight countries** — US, UK, Germany, France, Japan, South Korea, Brazil, Mexico. The Netherlands is not among them, and no audience size changes that. `[Likely — three independent secondary sources; TikTok's own docs block automated fetching. Verify in-app.]`
- **Instagram has no per-view ad revenue share at all in 2026.** Reels Play Bonus was replaced by an invite-only programme with no application route. `[Likely]`
- A Western-EU audience earns roughly **50% of a US audience** on Shorts (Germany $0.163 vs US $0.328 RPM). A Dutch-language audience is a further ~10× smaller addressable market. `[Likely]`

## Barrier 4 — the high-RPM niches are explicitly closed to synthetic personas

YouTube's 13 July 2026 clarification names three non-monetizable categories. The third is content *"that presents itself as a human expert providing advice to viewers on topics such as health, legal issues, finances, or politics."* `[Certain — YouTube policy]`

Those are exactly the four highest-RPM niches. Insurance runs $7–17 RPM, personal finance $5–17, legal $5–15 — against $1.24 for entertainment. **The niches worth entering are precisely the ones a faceless AI format is now barred from.**

## And the one that breaks your autonomy model outright

YouTube's API Services Developer Policies state you *"must not automate or trigger views, uploads, comments, likes… without the user's prior specific and express consent,"* and require actions be *"clearly initiated by the user."* `[Certain]`

Your brief has publishing at L2 "initially," implying L3/L4 later. **It cannot go past L2 on YouTube.** The human approval gate is not a training-wheels phase — it is permanently required by the platform. Separately, January 2026's enforcement wave removed 16 channels holding 35M subscribers and 4.7bn views, and **upload velocity itself was a flagged signal**, independent of content quality.

## Cost per finished item

A 45-second vertical short, ~110 words of narration, six visual beats. `[Likely — list prices verified Sep 2026, USD→EUR ≈ 0.92]`

| Stack | Script | Narration | Visuals | Render | Total / short |
|---|---|---|---|---|---:|
| **Budget** — stock footage | €0.05–0.15 | €0.06 | €0 (Pexels) | local FFmpeg | **≈ €0.15** |
| **Mid** — AI stills + Ken Burns | €0.05–0.15 | €0.06 | €0.22 (6 images) | local FFmpeg | **≈ €0.45** |
| **Premium** — Veo 3.1 Lite | €0.05–0.15 | €0.06 | €2.20 (6×8s @ $0.05/s) | local FFmpeg | **≈ €2.40** |
| **Premium+** — Veo 3.1 Fast | €0.05–0.15 | €0.06 | €6.65 (6×8s @ $0.15/s) | local FFmpeg | **≈ €6.85** |

**AI video generation is 90–97% of the premium bill.** Everything else is noise. That is the single cost trap in this pipeline, and it is avoidable.

## Break-even is a red herring. The threshold is the real constraint.

At €0.15 per short and an EU Shorts RPM of ~€0.15 per 1,000 views, per-video break-even is about **1,000 views** — 2,000 with library music, which halves your share of the pool. That looks fine and is completely misleading, because **you earn €0 until you cross the programme threshold**, and from February 2027, €0 below 10M views per 90 days regardless.

### Volume required, by monetisation path

| Target | YouTube Shorts (EU) | Long-form, education (EU) | AI/IT services @ €450/mo |
|---|---:|---:|---:|
| €100 / month | 667,000 views/mo — *unreachable\** | ~13,000 views/mo | 0.2 customers |
| €1,000 / month | 6.7M views/mo | ~125,000 views/mo | **2.2 customers** |
| €3,000 / month | 20M views/mo | ~375,000 views/mo | **6.7 customers** |
| €10,000 / month | 67M views/mo | ~1.25M views/mo | **22 customers** |

\* From Feb 2027 the Shorts pool pays nothing below 10M qualified views per 90 days (≈3.3M/month), so every target under roughly €500/month is structurally unreachable on that path — you do not earn a smaller amount, you earn nothing.

**€3,000/month is either twenty million Shorts views per month, or seven customers.** That comparison is the whole study.

## Testing your hypothesis: content → audience → leads → services

Same million views, monetised two ways (Western-EU audience):

| Path | Assumption | Value |
|---|---|---:|
| Platform ad revenue | YouTube Shorts pool, EU RPM | **€150** one-time |
| Lead-gen, pessimistic | 0.0005% → 5 leads → 1 client | **€5,400 / yr** |
| Lead-gen, moderate | 0.005% → 50 leads → 2 clients | **€10,800 / yr** |

**36× to 72×.** Client value uses your own brief's figure (€450/month). The view-to-lead rate is the one number I could not source anywhere credible — no published benchmark for organic short-form exists, and anyone quoting you one is inventing it. The conclusion survives that gap because the ad-revenue side is so small that lead-gen wins across roughly three orders of magnitude of plausible conversion rates. `[Likely]`

## One structural gift

**EU AI Act Article 50 has applied since 2 August 2026** — one month ago — with penalties to €15M or 3% of turnover, and it makes you a "deployer" the moment content generates economic benefit regularly. Its key exemption is *meaningful human editorial control*: substantive review by someone with authority to approve or reject.

That is the *same standard* YouTube's inauthentic-content policy demands. One operating discipline — documented human review before publication, plus always using YouTube's AI disclosure toggle (confirmed to carry no reach or monetisation penalty) — satisfies the regulator and the platform at once. The compliance requirement and the quality requirement are the same requirement. `[Certain — EC guidance + YouTube policy]`

---

# DELIVERABLE 03 — Go / Kill Decision

*Criteria set before the answer, then scored against the evidence.*

| Criterion | Threshold to proceed | Finding | Result |
|---|---|---|---|
| Content cost | < €2 per finished short | €0.15–0.45 on budget/mid stacks | **PASS** |
| Achievable RPM | ≥ €2 / 1,000 views | €0.15 (EU Shorts). Long-form education €7–8. | **FAIL** (short-form) |
| Required view volume | ≤ 2M views/mo for €1,000 | 6.7M/mo on Shorts | **FAIL** |
| Monetisation access | Reachable from NL | TikTok excludes NL. Instagram has no rev share. YouTube floor rises Feb 2027. | **FAIL** |
| Publishing feasibility | Automatable end-to-end | Unattended API publishing breaches YouTube dev policy. TikTok direct-post needs an audit; unaudited apps post private-only. Meta needs business verification + app review. | **FAIL** |
| Policy risk | No existential enforcement exposure | 16 channels / 35M subs removed Jan 2026. Channel-level, not video-level. Upload velocity is a flag. | **FAIL** |
| Manual workload | < 15 min human time per item | Achievable — but human editorial review is mandatory, not optional | **CONDITIONAL** |
| Time to first revenue | < 6 months | Ad path: 12+ months and probably never. Lead path: 6–10 weeks. | **SPLIT** |
| **Lead-gen value per 1M views** | **≥ 5× ad revenue** | **36–72×** | **STRONG PASS** |

## Decision: PIVOT — format, platform, and monetisation together

Not KILL. The production capability is real, cheap, and worth having. But every criterion that fails, fails on the *ad-revenue premise*, and every one of those failures is irrelevant the moment content exists to generate leads rather than impressions. Pivoting is not a consolation prize — it removes six of the seven failing criteria at once.

### What this costs you, stated plainly

**The word "faceless" has to go.** A named human byline is required three times over: by YouTube's AI-persona rule if you go anywhere near advice topics, by the EU AI Act's editorial-control exemption, and by conversion data (personal profiles out-engage company pages roughly 8:1; LinkedIn converts visitors to leads at 2.74% against 0.77% for Facebook). You are on camera or at least named. `[Likely]`

**Volume stops being the strategy.** Thirty pieces to five thousand of the right people beats two thousand pieces to a million strangers. That means much less of MioOS is autonomous than the brief imagines — and it means the €6/month box is adequate, because you are not rendering twenty videos a day.

**The engine order inverts.** Social-as-lead-generation is worthless without a Solutions offer to convert leads into. You need the offer before the content. Solutions is no longer "a future architectural boundary" — it is the thing that makes Social monetizable at all.

## Recommended first experiment

| Dimension | Choice | Why this and not the alternative |
|---|---|---|
| **Niche** | AI & workflow automation for Dutch SMEs | It is the Solutions Engine's own market, so content and pipeline are one motion. You already have domain evidence from logistics email automation. Advice-adjacent but under your real name — exactly what the AI-persona rule permits. |
| **Platform** | LinkedIn primary · YouTube long-form secondary | LinkedIn has no monetisation threshold, no API audit gate, the best documented B2B conversion rate, and your buyers are on it. YouTube long-form carries 50–100× the RPM of Shorts if ad revenue ever matters, and serves as the depth asset LinkedIn posts point at. |
| **Format** | 60–90s vertical video, your voice, + written companion post | Exercises the full media pipeline (script → voice → assembly → captions → render) while testing the lead thesis. Long enough to clear TikTok's 1-minute rule if you later expand. |
| **Publishing** | **Manual, for all 30** | The highest-leverage decision in this plan. Sidesteps the TikTok audit, Meta business verification, Meta app review, and YouTube's developer-policy problem entirely — and costs perhaps 90 seconds per piece. Automate publishing only once you know the content is worth publishing. |

---

# DELIVERABLE 04 — Minimal V5 Experiment Plan

*Thirty pieces. Four workflows. Nine tables. No Mission Control, no Control Plane, no event bus.*

## Infrastructure

- **A second Hetzner CX23 (€6.04/mo), not a bigger one.** Two reasons. First, `aion-prod-1` is AION's production box and §0 of your own brief forbids sharing it — this is a €6 separation purchase, not a scaling one. Second, 30 renders over six weeks is roughly one minute of CPU each; 2 vCPU is genuinely adequate. Buy capacity when a measurement demands it. **Enable backups on both boxes today** — currently neither has them.
- Docker Compose, carried from V4: Postgres, Redis, app, worker. Caddy in front.
- Storage: ~30 shorts plus source assets is well under 5 GB. No object store yet.

## External services

| Purpose | Service | Cost for the experiment | Gate |
|---|---|---:|---|
| Research + script | Mid-tier LLM via the salvaged provider abstraction | ≈ €5 | none |
| Web research | Serper or Tavily (connector already exists) | ≈ €5 | none |
| Narration | ElevenLabs Starter, $6/mo, 60k chars `[verified Sep 2026]` | ≈ €11 | none |
| Visuals | Stock (Pexels) + AI stills. **No Veo in the experiment.** | ≈ €8 | none |
| Assembly | FFmpeg, local | €0 | none |
| Captions | whisper.cpp, local | €0 | none |
| Publishing | **Your hands** | €0 | avoided entirely |
| Hosting | Hetzner CX23 + backups | ≈ €9 / mo | none |

**All-in for the 30-piece experiment: roughly €50.** Set the hard ceiling at €150 and have it halt the worker, not warn.

## The four workflows

**W1 — Discovery & Research.** Pull signals, pick a topic, gather sources, record every URL and claim with provenance. Output: a research package with citations. This table is also your copyright and defamation control — every factual claim traces to a source you can produce.

**W2 — Strategy, Script & Creative Plan.** One call, not three agents. Audience, angle, hook, 110-word script, shot list, caption, CTA. Structured output, schema-validated. Reject and retry on invalid JSON rather than repairing it.

**W3 — Media Production.** TTS → asset selection or generation → FFmpeg assembly → whisper captions → burn-in → encode. Deterministic throughout; the only AI call is the voice. Every asset writes a cost ledger row as it is created.

**W4 — Review, Publish & Measure.** Human review is a required state, not an optional one — nothing reaches PUBLISHED without a review row. You publish by hand and paste the URL back. A daily job pulls metrics; a manual form records leads against the piece that produced them.

## Schema — nine tables

| Table | Carries | Answers |
|---|---|---|
| `content_item` | topic, angle, state, hook, script, timestamps | where is everything |
| `research_source` | url, claim, retrieved_at, used_in_script | can I defend this claim |
| `asset` | type, path, provider, duration, bytes | what did we make |
| `run` | workflow, model, tokens_in/out, cost_cents, ms, status, error | what did each step cost, how often does it fail |
| `cost_ledger` | provider, service, units, cost_cents, content_item_id | cost per content item, cost per euro earned |
| `review` | verdict, minutes_spent, changes_made, reviewed_at | **did AI actually reduce my workload** |
| `publication` | platform, external_url, published_at | what went live, when |
| `metric_snapshot` | captured_at, views, watch_time, engagement, followers_delta | median views, hit rate, retention |
| `lead` | source_content_item_id, channel, status, value_eur | **the only number that decides V2** |

Content state machine:

```
IDEA → RESEARCHED → SCRIPTED → ASSETS_READY → ASSEMBLED
     → IN_REVIEW → APPROVED → PUBLISHED → MEASURED
plus REJECTED, FAILED
```

Illegal transitions throw. `review.minutes_spent` is not optional — it is the field that answers whether any of this was worth automating.

## The seven tests, written before the features they cover

1. **Spend ceiling halts.** With the daily budget consumed, the next run is refused *before* any provider call is made — not after.
2. **Duplicate jobs are impossible.** Same content item + same workflow = one run, enforced by a unique constraint, not a check-then-act race.
3. **The publish gate holds.** No `publication` row can exist without an approved `review` row. This is the test V4 needed and never had.
4. **Retries back off and give up.** Bounded attempts, exponential backoff, terminal failure recorded rather than retried forever.
5. **Provider failure is contained.** Timeout or 500 marks the run failed, records partial cost, leaves the content item resumable.
6. **State transitions are legal.** Every illegal edge in the machine throws.
7. **Metric ingestion is idempotent.** Ingesting the same snapshot twice produces one row.

That is the whole test suite. Do not retrofit anything onto V4.

## Sequence

1. **Define the offer first — before any content.** The one thing content converts into. Scope, price, delivery. Without it every lead the experiment generates evaporates. A day of thinking, not a sprint.
2. **Provision and separate.** Second CX23, backups on both boxes, Compose stack up, salvaged provider + audit log + alerting wired in. *Exit:* health check passes and a deliberate over-spend triggers a Discord alert.
3. **Build W1–W3 behind the CLI.** No web UI at all. *Exit:* `npm run pipeline -- --topic "…"` produces a finished MP4 with burnt captions, and the cost ledger shows a per-item figure within 20% of estimate.
4. **The brutally simple UI.** One page, six blocks: Needs Attention · Pipeline · Cost · Results · Approvals · Failures. A table, not a dashboard. *Exit:* you can review and approve without touching the database.
5. **Publish 30, by hand, over ~6 weeks.** Record minutes spent on every review. Log every inbound conversation as a lead against its source piece. *Exit:* 30 published, 30 reviews timed, metrics ingested.
6. **Read the numbers and decide.** Cost/item · time/item · median views · hit rate · leads · revenue per item · whether AI reduced workload. Then, and only then, decide what deserves automating and what deserves a dashboard.

## The kill condition, set now while it is cheap to set

After 30 pieces: if **zero qualified conversations** have come from the content, stop. Not "iterate on the hooks" — stop, and reconsider whether distribution is your constraint at all. Cold outbound to the same list may reach the same buyers for less. Decide this now, in writing, because in six weeks you will have sunk effort and want to keep going.

Conversely, the go condition for V2 is deliberately low: **two qualified conversations and one paying customer.** At €450/month that single customer outearns every ad-revenue scenario in this document, and it is the signal that justifies building the Control Plane, the event bus, and eventually Mission Control.

---

## Confidence notes

Repo findings are direct observation of the codebase and live database — treat as certain. Platform thresholds and policy language are from YouTube's own documentation. RPM figures come from a 274-channel dataset with disclosed methodology; strong but not definitive. TikTok's exclusion of the Netherlands rests on three agreeing secondary sources — **verify in-app before relying on it**. **No credible view-to-lead benchmark for organic short-form video exists anywhere I could find**; the lead-gen conclusion is built to survive that gap rather than to paper over it. Prices verified September 2026 at USD→EUR ≈ 0.92.

*MioOS V5 · Phase 0 assessment · No production code written.*
