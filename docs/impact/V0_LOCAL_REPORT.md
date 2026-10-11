# V0 LOCAL BUILD REPORT — STOP POINT BEFORE PROVISIONING

Date: 2026-09-07 · Repo: `C:\Users\michi\Desktop\Projects\discovery-v0` (2 commits, clean tree) · Status: **local flow working, tests green, NOT deployed**

## 0. The uncomfortable part

1. **Measured AI cost is €0.00 because no real model call has been made.** [Certain] I do not have your Anthropic key and by your rule I must not ask for it. Everything below ran against a deterministic mock provider. The cost *instrumentation* is tested (tokens and USD recorded per message and per analysis run, unknown models flagged); the *numbers* only exist once you run one interview with your key in `.env`. My estimate stays an estimate: ~$0.15–0.40 per interview (Sonnet 5, ~20 calls × ~2–3k input tokens as the transcript grows) plus ~$0.10–0.30 per analysis (Opus 5, one call, ~4–6k in / ~2k out). [Guessing — replace with the inspector's numbers after your first real run.]
2. **The interviewer and analyst prompts have never met a real model.** [Certain] The skeleton, caps, guardrail, schema validation, verbatim-evidence check and scoring are all enforced in code and tested, so a badly behaved model degrades to scripted questions / REVIEW_REQUIRED, never to fabricated output. But question *quality* and analysis *quality* are unmeasured. Your first 2–3 self-interviews are the real test of `prompt.ts` and `analysis/prompt.ts`.
3. **Your Windows machine has no Postgres and no Docker that I could see.** [Likely — I can only see the Linux VM the Claude app runs, which has neither] Running V0 locally needs one of: Docker Desktop, a native PostgreSQL 16 install, or a managed Postgres. That is the only thing between you and the first real interview. See §5.
4. **Migrations are hand-written SQL.** [Certain] Prisma's schema-engine download host (`binaries.prisma.sh`) is blocked from both my build environment and your local VM, so `prisma migrate dev` could not run. The SQL mirrors the schema exactly (all 39 tests run against it through the generated client), and `prisma migrate deploy` in Docker applies the same files. Verify once with `prisma migrate diff` on the server (command in `docs/ARCHITECTURE.md`).

## 1. What works (verified locally)

Full loop, in this order, with a browser on a 390-px viewport:
operator login → create company/contact/invitation → tokenised link → NL/EN consent screen (AI disclosure, human review, no-credentials warning, 90-day retention, controller from env) → 10-section interview with scripted openings, model-worded questions and ≤2 follow-ups per section → every message persisted with model/tokens/cost → refresh-safe resume → closing message → analysis scheduled with `after()` → schema + anti-fabrication validation → one retry with the error list → ANALYSED or REVIEW_REQUIRED → list page (status, review status, top score, turns, duration, cost, spend total) → inspector (transcript with per-message cost, factor table with verbatim quotes, economics with UNKNOWN, evidence gaps, raw output, validation errors, notes, review status, re-run, delete interview, erase contact) → retention and retry cron endpoints (bearer-protected).

Screenshots: `v0-interview-phone.png`, `v0-inspector.png` (sent in chat).

## 2. Test results

| Suite | Result |
|---|---|
| Vitest — 10 files, 39 tests, real PostgreSQL (`discovery_test`), mock AI | **39/39 pass**, 6.5 s |
| Playwright — 3 smoke tests on a 390×780 viewport | **3/3 pass**, 17 s |
| `tsc --noEmit`, `eslint`, `next build` | clean |

What the ten test files prove: T1 migration creates the 9 tables + 6 enums and the client round-trips; T2 unknown / expired / revoked tokens → null (route 404); T3 messages persist in order and the same token resumes without creating a second interview; T4 selling / solution / AI / pricing / advice phrases are blocked, regenerated once with an explicit rejection note, then replaced by the scripted question, and every hit is audited; T5 follow-up cap, section completion, 15-min time cap, 25-turn cap, no answers after close; T6 pricing table exact, tokens+cost per interviewer message, regeneration attempts summed; T7 garbage analyst output → INVALID → retry with feedback → REVIEW_REQUIRED with zero opportunities, valid-on-retry → ANALYSED, provider error → FAILED; T8 weights sum to 16, max 80, thresholds 55/40, rejects non-integer ratings; T9 invented quotes rejected, interviewer text does not count as evidence, rating>0 needs a quote, numeric economics need a stated assumption, thin transcript keeps UNKNOWN; T10 `/app` redirects, forged cookies fail, missing `SESSION_SECRET` is a 500 (no fallback), scrypt round-trip, cron bearer.

E2E: consent → question → answer → next question → reload resumes; 404 on bad token and `/app` → `/login`; operator creates a link, a second browser context completes the interview, inspector shows the transcript and the analysis state.

## 3. Actual architecture

Next.js 16.3 (App Router, TS) · React 19 · PostgreSQL 16 · Prisma 7.10 (driver-adapter mode, no Rust engine) · Zod 4 · Tailwind 4 · Vitest 5 · Playwright 1.63 · Docker Compose (db + web + Caddy) · one Node process, no queue, no Redis. Full description in `docs/ARCHITECTURE.md`. 105 tracked files; ~2,300 lines of app code, ~700 lines of tests.

Key design points as built: section skeleton and caps enforced in code, model only words questions; guardrail is a regex list plus regenerate-then-scripted fallback; analyst evidence must be a verbatim (normalised) substring of *respondent* messages; score arithmetic and bands in `scoring.ts`; annual labour cost computed only when hours/week and hourly cost are both numbers; commercial statuses (QUALIFIED … DIAGNOSTIC_WON) are operator-set only; the app never sends anything — you paste the link.

## 4. Measured AI cost

None yet — see §0.1. Where to read it after your first run: `/app` shows total spend; each inspector shows interview cost, analysis cost and tokens; each transcript line shows model and tokens. `AuditLog` gets a `cost.unpriced_model` row if a model ID is missing from `src/lib/ai/pricing.ts`.

## 5. Remaining steps — your side, before I touch a server

1. Get a PostgreSQL 16 running on your machine (Docker Desktop: `docker run -d -p 5432:5432 -e POSTGRES_USER=discovery -e POSTGRES_PASSWORD=discovery -e POSTGRES_DB=discovery postgres:16`; or the native installer).
2. In `discovery-v0`: `cp .env.example .env`, fill `ANTHROPIC_API_KEY`, `SESSION_SECRET` (`openssl rand -base64 48`), `CRON_SECRET`, `CONTROLLER_NAME`, `CONTROLLER_EMAIL`; run `npm run hash-password -- 'yourpassword'` → `ADMIN_PASSWORD_HASH`.
3. `npm ci && npx prisma generate && npm run db:migrate && npm run dev` → `http://localhost:3000/login`.
4. Interview yourself twice (once NL, once EN), then read the inspector. Report back: the cost numbers, and whether the questions sounded like a competent human or like a form. That decides whether `prompt.ts` needs a second version before anyone external sees it.

## 6. Exact server requirements (for when you provision)

- Hetzner **CX23** (2 vCPU / 4 GB / 40 GB) is enough; Ubuntu 24.04. Not `aion-prod-1`.
- A DNS A-record for a subdomain → server IP (Caddy needs it for TLS). Ports 80/443 open; 22 restricted to your IP.
- Docker Engine + Compose plugin. `git clone` the repo, `.env` with the values above plus `POSTGRES_PASSWORD` and `DOMAIN`, `APP_URL=https://<domain>`, then `docker compose up -d --build`.
- Host cron: `/api/cron/retry` every 5 min, `/api/cron/retention` nightly, `pg_dump` nightly to `./backups` (commands in README). Enable Hetzner backups (~20% of server price).
- Nothing else. No Redis, no workers, no object storage.

## 7. Deviations from the approved plan

| Plan | Built | Why |
|---|---|---|
| Next.js 15 | Next.js 16.3 | `create-next-app@latest` ships 16; `middleware.ts` is now `proxy.ts`, params are promises. No functional impact. |
| Copy `provider.ts` (314 lines) | Rewritten to ~90 lines keeping the Claude call + timeout | The V4 file's silent `TemplateProvider` fallback returns fake text when no key is set — exactly the failure mode this project bans. Removed; missing key is now a hard error. Mock provider exists for tests and is refused under `NODE_ENV=production`. |
| Copy `tailwind.config.ts` tokens | Not copied | They are MioOS branding (dark mission-control). V0 is a neutral light UI for SME participants. |
| `prisma migrate dev` | Hand-written SQL + `scripts/migrate.ts` | Engine host blocked (§0.4). |
| Sonnet 5 interviewer / Opus 5 analyst | Same, IDs verified as `claude-sonnet-5` / `claude-opus-5` | Pricing table checked against platform.claude.com on 2026-09-06. |
| 10 tests | 39 Vitest tests in 10 files + 3 e2e | Same ten areas, more cases each. |
| "Delete interview" | Delete interview **and** "Erase contact + all data" | GDPR erasure needs the contact row gone too. |
| Local run on your machine | Built and verified in my workspace (which has Postgres); your machine needs Postgres first | §0.3. |

Nothing was added outside the approved scope: no email, CRM, proposals, voice, automation builder, matrix, filters, multi-tenant, billing, MioOS/AION code.

STOPPED. Waiting for: your first real-key run results (§5.4) and your go for provisioning (§6).
