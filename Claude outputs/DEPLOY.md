# Discovery V0 — first-test deployment on the existing Hetzner host

Objective: get V0 into a safe, isolated place where **you** can do one Dutch and one English interview
against a real model, and come back with numbers. Nothing public, no domain, no TLS, no outreach.

---

## 1. What I actually know about your server, and what I don't

**Known** (from what you've told me, not from the machine): one Hetzner server, `aion-prod-1`, **CX23 —
2 vCPU / 4 GB RAM / 40 GB disk**, backups disabled. AION runs there as Docker Compose: Go control/gateway/worker,
React dashboard, **PostgreSQL**, **Caddy** as reverse proxy owning ports 80/443, four subdomains
(dashboard/client/api/control.aion-platform.eu), DNS at TransIP.

**Not known — and each one can decide the answer:** current free RAM · current free disk · whether swap exists ·
whether host port 3000 is already taken · Docker and Compose versions · whether any object is already named
`discovery*`. I have no shell on that box, so I will not claim co-hosting is safe. **Run §3 and send me the output.**

**The one real risk.** At runtime V0 is small (~600–900 MB across two containers, capped in the compose file).
The dangerous moment is the **image build**: `next build` peaks around 1–1.5 GB. On a 4 GB box that is the one
operation that could invoke the kernel OOM killer, and the OOM killer picks the biggest process — which may be
**AION's PostgreSQL**. That is precisely the outcome you forbade, so the build is treated as the gated step.

---

## 2. Isolation already built into this repo (nothing on your side to configure)

| Concern | How it is prevented |
|---|---|
| Compose object collision | Project `discovery`; network `discovery_net`; volumes `discovery_db_data` etc.; containers `discovery-db` / `discovery-web`. No name AION uses. |
| Port 80/443 contention | The `caddy` service sits behind a `public` profile and **does not start** with a plain `up`. AION's Caddy is never touched. |
| Public exposure | `web` publishes to **`127.0.0.1:3000` only**. Nothing is reachable from the internet. You reach it over an SSH tunnel. |
| Database coupling | Own PostgreSQL 16 container and own volume. AION's database is never opened, migrated or read. |
| Runtime starvation | `mem_limit` 512 MB (db) / 768 MB (web), `cpus: 1.0` each, `pids_limit: 200`. V0 cannot grow into AION's memory. |
| Build starvation | Build heap capped (`--max-old-space-size=1024`) and the build command below adds a hard container memory limit. |
| Image weight | Next standalone output: the runtime image carries ~75 MB of traced server code, no dev toolchain, no Prisma engine. |
| Log growth on a 40 GB disk | json-file driver, 10 MB × 3–5 files per service. |

---

## 3. STEP 0 — preflight (read-only, changes nothing)

SSH to the server and run:

```bash
curl -fsSL https://raw.githubusercontent.com/<you>/discovery-v0/main/scripts/preflight.sh | sh
```

…or, without a repo yet, paste this one command:

```bash
echo "== host =="; uname -m; . /etc/os-release && echo "$PRETTY_NAME"; \
echo "== memory (MB) =="; free -m; echo "== swap =="; swapon --show || echo "no swap"; \
echo "== disk =="; df -h /; echo "== docker =="; docker --version; docker compose version; \
echo "== projects =="; docker compose ls; \
echo "== containers =="; docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'; \
echo "== memory per container =="; docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}'; \
echo "== ports 80/443/3000/5432 =="; ss -ltnp | grep -E ':(80|443|3000|5432)\b'; \
echo "== clashes =="; docker network ls --format '{{.Name}}' | grep -x discovery_net; \
docker volume ls --format '{{.Name}}' | grep -E '^discovery_'; \
docker ps -a --format '{{.Names}}' | grep -E '^discovery-'; echo "(nothing above = no clashes)"
```

**Send me the whole output.** I read it as:

- **GO** — available RAM ≥ 2000 MB, free disk ≥ 6 GB, port 3000 free, no `discovery*` names. Proceed to §4.
- **TIGHT** — available RAM 1200–2000 MB. Proceed, but add swap first (§4, step 1b). I will say which.
- **NO-GO** — available RAM < 1200 MB, or disk < 6 GB, or port 3000 taken by AION. Go to §8.

---

## 4. STEP 1 — deploy (only after a GO)

```bash
# 1. code
sudo mkdir -p /opt/discovery && sudo chown "$USER" /opt/discovery
cd /opt/discovery
git clone <your discovery-v0 remote> .        # or: scp the folder up, it is ~1 MB without node_modules

# 1b. ONLY if I said TIGHT — 2 GB swap protects every container, including AION's Postgres
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 2. secrets  (never paste these into chat)
cp .env.example .env
openssl rand -base64 48   # → SESSION_SECRET
openssl rand -hex 24      # → POSTGRES_PASSWORD
openssl rand -hex 16      # → CRON_SECRET
nano .env
#   ANTHROPIC_API_KEY=sk-ant-...
#   SESSION_SECRET=...        POSTGRES_PASSWORD=...        CRON_SECRET=...
#   ADMIN_USERNAME=mio        ADMIN_PASSWORD_HASH=         (filled in step 3)
#   CONTROLLER_NAME="<the name a participant should see>"  CONTROLLER_EMAIL=<your email>
#   APP_URL=http://localhost:3000
#   INTERVIEWER_MODEL=claude-sonnet-5   ANALYST_MODEL=claude-opus-5   RETENTION_DAYS=90
# leave DOMAIN unset — public mode stays off

# 3. operator password hash (throwaway container, nothing installed on the host)
docker run --rm -v "$PWD":/app -w /app node:22-alpine \
  node -e 'const c=require("crypto");const p=process.argv[1];const s=c.randomBytes(16);
  c.scrypt(p,s,64,(e,k)=>console.log("scrypt:"+s.toString("base64url")+":"+k.toString("base64url")))' 'YOUR-PASSWORD'
# paste the scrypt:... line into ADMIN_PASSWORD_HASH in .env

# 4. build — hard memory ceiling, so a build spike can only kill the build, never AION
DOCKER_BUILDKIT=1 docker compose build --memory 1500m web

# 5. start (db + web only; Caddy stays down because it is in the 'public' profile)
docker compose up -d

# 6. verify — and check AION is untouched
docker compose ps
docker compose logs web | tail -20          # expect: applied 20260906000000_init → starting
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/login    # expect 200
docker ps --format '{{.Names}}\t{{.Status}}'                            # AION containers still Up
free -m
```

If step 4 fails with an OOM/137, stop and tell me — do **not** retry it; that is the NO-GO signal arriving late.

---

## 5. STEP 2 — reach it (SSH tunnel, from your Windows machine)

```powershell
ssh -N -L 3000:127.0.0.1:3000 root@<server-ip>
```

Leave that window open, then browse to **http://localhost:3000/login**. Nothing about V0 is reachable from
the internet; the tunnel is the only door, and it closes when you close the window.

---

## 6. STEP 3 — the two interviews

1. Sign in → **New invitation**.
2. Interview A: any company/contact name, language **Nederlands**. Create link → copy it.
3. Open the link **in a private/incognito window** (so you are not logged in as the operator) and answer as
   yourself, about a real recurring process — not a test script. Vague answers are fine and useful: they are
   how you find out whether the system refuses to invent economics.
4. Interview B: repeat with language **English**.
5. Back in the operator window, open each interview and read the inspector.

Rough expectation so nothing surprises you: 20–25 questions, 8–15 minutes, and **$0.20–0.70 per interview**
across interviewer + analyst. If a single interview goes past ~$1.50, stop and tell me.

---

## 7. STEP 4 — measurement (what to send me)

**Quantitative** — one command, prints everything in a table:

```bash
cd /opt/discovery && docker compose exec -T db psql -U discovery -d discovery < docs/measure.sql
```

That gives, per interview: model calls · input tokens · output tokens · cost · average and max latency ·
follow-up count · guardrail/parse retries · schema failures · analysis runs · analysis seconds ·
opportunities · top score. Paste the table back to me.

**Qualitative** — five sentences from you, one per question:

1. Did the follow-ups actually respond to what you said, or were they generic?
2. Did it feel like a conversation or like filling in a form?
3. Is the analysis genuinely useful — would you act on it?
4. Is every conclusion traceable to a verbatim quote you recognise as your own words?
5. Where evidence was missing, did it honestly say UNKNOWN, or did it invent numbers?

Also send: any interview that ended `REVIEW_REQUIRED`, and the raw analyst output from the inspector for one interview.

**Do not change any prompt before this.** The whole point is to measure the current version.

---

## 8. If preflight says NO-GO — the smallest alternative

A **second Hetzner CX23** (~€6/mo, ~€0.20 for two days), Ubuntu 24.04, in the same project. Then §4 unchanged,
minus step 1b. Destroy it after the test. This costs pocket change and removes every shared-resource question
from a box that runs your customer-facing platform. If preflight comes back TIGHT rather than NO-GO, I will
tell you plainly which of the two I would pick.

Local Docker Desktop on your Windows machine is a third option and costs nothing, but you said you would rather
not install a local stack, so it is the fallback of last resort.

---

## 9. Rollback — complete removal, AION untouched

```bash
cd /opt/discovery
docker compose down -v          # stops containers, deletes discovery_* volumes (all interview data)
docker image rm discovery-v0:0.1.0
cd / && sudo rm -rf /opt/discovery
# if step 1b was used and you want the swap gone:
sudo swapoff /swapfile && sudo rm /swapfile && sudo sed -i '/swapfile/d' /etc/fstab
```

Nothing outside `/opt/discovery`, the `discovery_*` Docker objects and (optionally) `/swapfile` is created or modified.

---

## 10. Deliberately not done

No public URL, no domain, no TLS, no Caddy, no email, no CRM, no outreach, no matrix, no filters, no agents,
no MioOS integration, no AION contact, no prompt changes, no cron jobs yet (retry/retention are only needed
once interviews run unattended).
