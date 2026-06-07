# MioOS — Production Deployment Guide

Private, single-owner VPS deployment. Not a public SaaS.

---

## Requirements

- VPS with Docker + Docker Compose
- Caddy (reverse proxy + automatic HTTPS)
- Domain pointing at your VPS IP (`mio.aion-platform.eu`)
- `openssl` on the VPS for secret generation

---

## 1. VPS Folder Structure

```
/opt/mioos/
├── docker-compose.prod.yml   # production compose
├── .env                      # real secrets — never commit
├── Caddyfile                 # reverse proxy config
└── backups/                  # database backups
```

---

## 2. Environment Setup

```bash
# On your VPS
mkdir -p /opt/mioos/backups
cd /opt/mioos

# Copy the production template
cp .env.production.example .env

# Generate a strong session secret
openssl rand -hex 32
# Paste the output as SESSION_SECRET in .env

# Edit .env — fill in:
#   MIOOS_USERNAME
#   MIOOS_PASSWORD (use a password manager)
#   SESSION_SECRET (from above)
#   APP_URL + NEXT_PUBLIC_APP_URL (your domain)
nano .env
```

Minimum required `.env`:
```env
DATABASE_URL="file:/data/mioos.db"
MIOOS_USERNAME="your-username"
MIOOS_PASSWORD="your-strong-password"
SESSION_SECRET="64-char-hex-from-openssl"
APP_URL="https://mio.aion-platform.eu"
NEXT_PUBLIC_APP_URL="https://mio.aion-platform.eu"
ENABLE_SCHEDULE_RUNNER=true
NODE_ENV=production
DOCKER_ENV=true
```

---

## 3. Docker Build

```bash
cd /opt/mioos

# Build the image (runs prisma generate + npm run build internally)
docker compose -f docker-compose.prod.yml build --no-cache

# Or pull a pre-built image if using a registry:
# docker pull your-registry/mioos:latest
```

---

## 4. First Start (Database Initialization)

```bash
# Start — entrypoint runs prisma db push on first boot
docker compose -f docker-compose.prod.yml up -d

# Verify startup
docker compose -f docker-compose.prod.yml logs -f mioos
# Look for: "[MioOS] Database ready. Starting server..."

# Verify health
curl http://localhost:3000/api/health
# Expected: {"status":"ok","db":{"ok":true},...}
```

---

## 5. Subsequent Deploys

```bash
cd /opt/mioos

# 1. Pull/rebuild
docker compose -f docker-compose.prod.yml build --no-cache

# 2. Rolling restart (zero-ish downtime — SQLite allows it)
docker compose -f docker-compose.prod.yml up -d --force-recreate

# 3. Verify health
curl http://localhost:3000/api/health
```

---

## 6. Prisma Migrations

**SQLite (current default):**  
The entrypoint runs `prisma db push` on each startup. For SQLite this is safe — it applies schema changes idempotently without destroying data.

**PostgreSQL (future):**  
1. Change `DATABASE_URL` to a `postgresql://` URL
2. Change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`
3. Run `npx prisma migrate dev --name init` locally to generate the migrations folder
4. Commit the `prisma/migrations/` folder
5. On the VPS the entrypoint will automatically use `prisma migrate deploy`

---

## 7. Caddy Configuration

Create `/opt/mioos/Caddyfile`:

```
mio.aion-platform.eu {
    reverse_proxy localhost:3000

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    # Health endpoint — no auth required
    @health path /api/health
    handle @health {
        reverse_proxy localhost:3000
    }
}
```

Start Caddy:
```bash
# Install Caddy (Debian/Ubuntu)
apt install -y caddy

# Place Caddyfile
cp Caddyfile /etc/caddy/Caddyfile

# Reload
systemctl reload caddy
```

Caddy handles TLS automatically via Let's Encrypt. No manual certificate management needed.

---

## 8. DNS Setup

Point your domain to your VPS IP:

| Type | Name | Value           | TTL  |
|------|------|-----------------|------|
| A    | mio  | YOUR_VPS_IP     | 300  |

Verify propagation: `dig mio.aion-platform.eu`

---

## 9. Backup & Restore

### Automated backup (cron on VPS)

```bash
# Add to crontab: crontab -e
0 3 * * * docker exec mioos-mioos-1 sh -c 'cp /data/mioos.db /data/mioos.db.bak' && cp /var/lib/docker/volumes/mioos_mioos_data/_data/mioos.db.bak /opt/mioos/backups/mioos-$(date +\%Y\%m\%d).db
```

Simpler approach using the named volume:
```bash
#!/bin/bash
BACKUP_DIR="/opt/mioos/backups"
DATE=$(date +%Y%m%d_%H%M%S)
docker run --rm \
  -v mioos_mioos_data:/data \
  -v "$BACKUP_DIR":/backups \
  alpine cp /data/mioos.db "/backups/mioos-$DATE.db"
echo "Backed up to mioos-$DATE.db"

# Retain last 30 days only
find "$BACKUP_DIR" -name "mioos-*.db" -mtime +30 -delete
```

Save as `/opt/mioos/backup.sh`, `chmod +x`, then `crontab -e`:
```
0 3 * * * /opt/mioos/backup.sh >> /opt/mioos/backups/backup.log 2>&1
```

### Restore

```bash
# Stop MioOS
docker compose -f docker-compose.prod.yml down

# Restore from backup into volume
docker run --rm \
  -v mioos_mioos_data:/data \
  -v /opt/mioos/backups:/backups \
  alpine cp /backups/mioos-20260607_030000.db /data/mioos.db

# Restart
docker compose -f docker-compose.prod.yml up -d
```

---

## 10. Rollback

```bash
# Keep previous image tagged
docker tag mioos:latest mioos:previous

# After a bad deploy, roll back:
docker compose -f docker-compose.prod.yml down
docker tag mioos:previous mioos:latest
docker compose -f docker-compose.prod.yml up -d
```

---

## 11. Health Verification

```bash
# API health (includes db, auth, scheduler, autonomy)
curl https://mio.aion-platform.eu/api/health | jq

# Expected:
# {
#   "status": "ok",
#   "db": { "ok": true },
#   "auth": { "configured": true },
#   "scheduler": { "enabled": true },
#   "autonomy": { "paused": false },
#   "agents": { "active": N }
# }

# Unauthenticated API call — must return 401
curl https://mio.aion-platform.eu/api/agents
# Expected: {"error":"Unauthorized"}

# Login page — must redirect here when unauthenticated
curl -I https://mio.aion-platform.eu/
# Expected: 307 → /login
```

---

## 12. Emergency Stop

From the Settings view inside MioOS: **Settings → Autonomy Control → Emergency Stop**

Or via API (requires authenticated session):
```bash
# Pause all autonomous execution
curl -X POST https://mio.aion-platform.eu/api/autonomy/status \
  -H "Content-Type: application/json" \
  -H "Cookie: mioos-session=YOUR_SESSION_COOKIE" \
  -d '{"paused": true}'

# Resume
curl -X POST https://mio.aion-platform.eu/api/autonomy/status \
  -H "Content-Type: application/json" \
  -H "Cookie: mioos-session=YOUR_SESSION_COOKIE" \
  -d '{"paused": false}'
```

Emergency stop halts: agent schedules, workflow triggers, delegations, and the execution pipeline. Agent data and memory are preserved.

---

## 13. Security Checklist

Before going live:

- [ ] `SESSION_SECRET` is a 64-char random hex string (not the dev fallback)
- [ ] `MIOOS_PASSWORD` is strong and unique (not "changeme")
- [ ] `.env` is not in git (check `.gitignore`)
- [ ] `docker-compose.prod.yml` binds only `127.0.0.1:3000` (not `0.0.0.0`)
- [ ] Caddy HTTPS is active (Let's Encrypt cert issued)
- [ ] `curl /api/agents` returns 401 without session
- [ ] Login page redirects to `/login` without session
- [ ] No `ANTHROPIC_API_KEY` set unless live AI is intentionally enabled
- [ ] Firewall: only ports 80, 443, and SSH (22) open externally
- [ ] Automated backups are running

---

## 14. Autonomy Readiness Status

### Safe to run online now (Level 2)
- Task/goal/note creation from agents ✓
- Memory suggestions (queued for approval) ✓
- Pattern detection (queued for approval) ✓
- Insight generation ✓
- Executive briefings ✓
- Internal agent delegation and messaging ✓
- Scheduled agent runs ✓

### Local-only (not safe externally yet)
- AI agent execution (requires ANTHROPIC_API_KEY)

### Blocked before Level 3 (external prep)
- No web search connector configured
- No email connector configured
- No browser automation
- Approval queue must be reviewed before any outreach is prepared

### Blocked before outreach/ads/publishing (Level 4)
- Policy engine not yet implemented
- Budget controls not yet implemented
- All external connectors disabled
- No approved workflow for external content

### Blocked before Opportunity Engine (Level 4+)
- Opportunity Engine views built (Commerce Autopilot stage)
- Opportunity validation pipeline not implemented
- Learning loop not implemented
- External data sources (web search) not connected
