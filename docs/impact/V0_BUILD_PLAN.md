# AI PROCESS DISCOVERY V0 — BUILD PLAN (PRE-IMPLEMENTATION)

Status: PLAN ONLY. No code written. Awaiting approval.
Date: 2026-09-06

---

## 0. THE UNCOMFORTABLE PART FIRST

**1. V0 tests a different, weaker hypothesis than the one you froze.** [Certain]
The Validation Kit's binding constraint was *you* getting an owner-director to talk for 30 minutes and trust you enough to buy a diagnostic. V0 replaces that human conversation with a link to a chatbot. What it actually measures is: "will an SME employee complete a 10–15 minute AI interview sent by a stranger?" That is a lower-trust event than a phone call, not a proxy for it. It works after a warm intro (someone already said yes to you); it does not manufacture customer #1.

I disagree with treating V0 as the validation instrument. Here's what I'd do instead: treat V0 as the **intake instrument for people who already agreed to talk** — the second touch, not the first. The risk in your framing is that a weak completion rate tells you nothing about the business, only about cold chatbot links.

**2. This is a dashboard before a customer.** [Certain]
Sections on Opportunity Matrix, filters, invitation polish and status badges are cockpit work. The only thing that makes V0 different from V4's cockpit is that its rows come from real external humans. So the external event that counts is: **a completed interview by a person you do not employ, do not work with, and are not related to.** Everything on the internal side is earned by that.

**3. 48 hours is not a real number for a solo founder with a full-time job.** [Likely]
Honest estimate for the full spec: 45–60 focused hours with AI tooling (schema, interview loop, analyst with schema validation, dashboard, inspector, 15 tests, deploy, debugging the LLM's refusal to follow format). With evenings and weekends that is 2–3 calendar weeks. To make "48 hours" true you cut scope, not sleep.

**Recommended cut (keep / drop):**
- KEEP: token link → interview → transcript storage → analyst → validated analysis → score → interview list → inspector → auth → cost log → deploy.
- DROP to V0.1: Opportunity Matrix, list filters/sorting, invitation "polish", internal notes UI (a single text column is enough), status transitions beyond INVITED → STARTED → COMPLETED → ANALYSED / REVIEW_REQUIRED / FAILED (the commercial statuses QUALIFIED…DIAGNOSTIC_WON are set by hand in V0; there is no automation to drive them).
- Tests: 15 → 10, dropping the UI/matrix ones; keep the guardrail and schema tests.

**4. Two constraints your spec did not name.** [Certain]
- Transcripts are personal data under GDPR. V0 needs a one-paragraph consent notice on the interview start page, a stated retention period, and a delete-interview action. Not optional in NL.
- Your employer rule applies to interviewees: colleagues interviewed about employer processes would be an improper use of employer relationships. First interviewees must be outside DSV.

---

## 1. INSPECTION RESULT

**Directory situation** (`C:\Users\michi\Desktop\Projects`):
AgentLock · backup-local · Co-pilot Outlook · Gatewatch · MioOS · Project-AION-main · Sentinel AI · triply-fixed. Only `MioOS` is connected to this session.

**MioOS V4 repo:** ~47k lines, 81 Prisma models, 0 tests, remote `github.com/Miotaas/mioos.git`. Not a base for V0 under any reading of your constraints.

**Reusable, verified present:**
| File | Lines | Verdict |
|---|---|---|
| `lib/ai/provider.ts` | 314 | Copy. Add token/cost capture (currently discards `usage`). |
| `lib/auth.ts` | 95 | Copy HMAC helpers only. Delete `getSessionSecretSafe()` fallback (forgeable secret). |
| `lib/auditLog.ts` | 22 | Copy as-is. |
| `Dockerfile` | 60 | Copy (3-stage, non-root). |
| `docker-compose.prod.yml` | 60 | Copy, rename services, own Postgres volume. |
| `docker-entrypoint.sh` | 26 | Copy, **strip seed lines 19–21**. |
| `tailwind.config.ts` | 92 | Copy tokens only. |
| `.github/workflows/ci.yml` | 32 | Copy. |

**Not reused:** schema, middleware, any `*-engine.ts`, dashboard UI, alert-manager (not needed for V0), approval/dispatch code.

**Environment:** Node 22.23.2 / npm 10.9.8 in the local VM; no Docker in that VM (Docker on your actual Windows install is unknown — see blockers). `googleapis.com` blocked from my shells (irrelevant for V0). Hetzner: only `aion-prod-1` exists — forbidden for V0.

---

## 2. WHERE V0 LIVES — RECOMMENDATION

**New sibling repo: `C:\Users\michi\Desktop\Projects\discovery-v0`** [Certain this is the right call]
- Own git repo, own GitHub remote (`Miotaas/discovery-v0` or similar), own `.env`, own Postgres, own Hetzner server, own subdomain.
- Zero imports from MioOS. The 8 files above are **copied**, not linked, so the repos can diverge freely.
- Plan docs move into `discovery-v0/docs/` once the folder exists. This file lands in `MioOS/docs/impact/` only because that is the folder I can currently write to.

Rejected: subfolder inside MioOS (violates "do not merge repos"); branch of MioOS (same); monorepo (Kubernetes-brain for a 1-person project).

---

## 3. STACK (as you specified, with 3 decisions made)

Next.js 15 (App Router, TypeScript) · PostgreSQL 16 · Prisma · Zod for analyst schema validation · Tailwind · Vitest (unit) + Playwright (1 smoke test) · Docker Compose · Caddy as reverse proxy (auto-TLS, 10-line config) · Hetzner CX23.

Decisions I am making unless you object:
- **AI provider:** Claude through the copied `provider.ts`. Interviewer = Sonnet 5 (latency matters, $2/$10). Analyst = Opus 5 ($5/$25) — one call per interview, structure quality matters more than cost. [Guessing on ideal split; cost log will tell us.] Expected cost per interview: ~€0.15–0.40 interviewer, ~€0.10–0.30 analyst.
- **Jobs:** no queue. Analyst runs in a server action triggered on interview completion with `after()`; a `/api/cron/retry` endpoint hit by a Hetzner cron every 5 min retries FAILED/ANALYSIS_PENDING rows. No Redis.
- **Auth:** single user. Password hash + `SESSION_SECRET` in env; HMAC-signed cookie; middleware guards `/app/*`. Public: only `/interview/[token]` and `/api/interview/*`.

---

## 4. DATA MODEL (9 entities)

`Company` (name, sector, size band, source note) · `Contact` (name, role, email optional — minimum needed) · `Invitation` (token unique, contactId, status, expiresAt, sentAt, openedAt) · `Interview` (invitationId, status, startedAt, completedAt, durationSec, language, consentAcceptedAt) · `InterviewMessage` (interviewId, role, content, seq, sectionKey, tokensIn/Out, costUsd, createdAt) · `AnalysisRun` (interviewId, model, promptVersion, status, rawOutput, validationErrors, tokens, costUsd) · `Opportunity` (analysisRunId, title, processDescription, frequency, laborEstimate, errorRework, delayImpact, revenueImpact, feasibility, measurability, urgency, factorEvidence JSON, totalScore, economicEstimate JSON with `assumptions[]` and explicit `UNKNOWN` fields, evidenceGaps[]) · `Note` (interviewId, body) · `AuditLog`.

Schema rule: every numeric factor is 0–5 **rated by the analyst with a quoted evidence line**; the weighted total (×2/×2/×1/×1/×1/×3/×3/×3, max 80) is computed in code, never by the LLM. Economic estimate must return `UNKNOWN` for any input the transcript does not support; a test asserts fabrication-free output on a deliberately thin transcript.

---

## 5. INTERVIEW DESIGN (the part that decides whether V0 is worth anything)

Hybrid, not free-form: a fixed section skeleton drives coverage; the LLM only generates the wording and at most 2 follow-ups per section.

Sections (from Validation Kit script C): role & responsibilities → the one process that eats the most time → frequency & volume → who touches it / handoffs → tools & systems → where it goes wrong (errors, rework) → delays & waiting → what has been tried → what "better" would look like in their words → anything else.

Guardrails enforced in code and tested, not just prompted:
- Interviewer system prompt forbids: proposing solutions, mentioning AI/automation/tools as remedies, pricing, "would you pay", DSV or any employer reference.
- Post-generation filter: regex over each assistant turn for a banned-term list (AI, automate, automation, tool, software, price, cost you, we could, solution…); on hit → regenerate once, then fall back to a neutral scripted question. Logged as a guardrail event.
- Caps: 25 assistant turns or 15 minutes → graceful close. Each message persisted immediately (refresh-safe; resume by token).
- Consent screen before Q1; language NL/EN chosen by interviewee.

---

## 6. IMPLEMENTATION SEQUENCE (with honest hours)

| Phase | Scope | Hours | Done when |
|---|---|---|---|
| 0 Scaffold | repo, Next.js, Prisma, Postgres (local), copied files patched, env template, CI | 3 | `npm run dev` + migration + CI green |
| 1 Schema | 9 entities, migrations, seed-free | 2 | migration applies; T1 |
| 2 Interview loop | token page, consent, section engine, interviewer prompt, guardrail filter, persistence, resume, close, cost capture | 12 | end-to-end interview with yourself; T2–T6 |
| 3 Analyst | prompt, Zod schema, validation + one retry, REVIEW_REQUIRED path, scoring in code, evidence gaps, economic estimate w/ UNKNOWN, retry endpoint | 10 | 3 real-ish transcripts analysed; T7–T10 |
| 4 Internal | auth, invitation create + link copy, interview list, inspector (transcript + analysis + score breakdown + gaps + raw JSON), delete-interview, cost per interview | 10 | you can run the whole loop from the UI |
| 5 Tests & hardening | remaining tests, rate limit on public endpoint, token expiry, error pages | 5 | 10 tests green in CI |
| 6 Deploy | Hetzner CX23, Caddy, compose, pg_dump nightly, first real invitation | 4 | link works on your phone over TLS |
| | **Total** | **~46** | |

Tests kept (10): T1 migration; T2 invalid/expired token 404; T3 message persistence + resume; T4 guardrail regex blocks banned terms; T5 turn/time cap closes interview; T6 cost recorded per message; T7 analyst output fails schema → REVIEW_REQUIRED, not crash; T8 score arithmetic from fixed factor input; T9 thin transcript → economic fields UNKNOWN, no numbers invented; T10 unauthenticated `/app` redirects. Dropped: matrix render, filters, badge styling, invitation email formatting, mobile snapshot.

**External gate (pre-committed, set now):** V0 is a success only when **3 people outside your employer and family complete an interview and 1 of them agrees to a follow-up call**. If 10 links are sent and fewer than 3 complete within 14 days, the AI-interview channel is dead for cold use; revert to human calls and keep V0 as post-call intake. No extension of the window.

---

## 7. BLOCKERS

1. **Folder access.** `discovery-v0` does not exist and is not connected. I need you to create the folder (or approve me requesting access to `Projects` so I can create it). [Certain]
2. **Second Hetzner server.** `aion-prod-1` is off-limits. A new CX23 is ~€4–6/mo; you create it and give me the IP only. SSH key handling stays on your side. [Certain]
3. **API key.** Anthropic key goes into `.env` on your machine/server by you. Per your rule, never in chat, docs, code or git. I will write `.env.example` only. [Certain]
4. **Docker on your Windows machine.** Unknown. If absent: local dev uses a plain Postgres install or Hetzner Postgres from day 1; Docker only on the server. [Guessing]
5. **GDPR consent text and retention period.** You decide the retention (I'd default 90 days) and whether your name/entity appears on the consent screen. [Likely a 10-minute decision, but it blocks Phase 2]
6. **Domain/subdomain** for the public link. A bare IP in an interview invitation kills completion rate. [Likely]
7. **Who gets the first 10 links.** Not a build blocker, but the only thing that makes the build worth doing. Must be non-DSV.

---

## 8. WHAT I NEED FROM YOU TO START

- APPROVE / AMEND: scope cut (§0), location (§2), stack decisions (§3), external gate (§6).
- Create or grant: `Projects\discovery-v0` folder.
- Confirm: Hetzner second server yes/no now, or deploy last.

STOPPED. No code written.
