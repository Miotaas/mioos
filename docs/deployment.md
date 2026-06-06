# MioOS — VPS Deployment Guide

Target: Ubuntu VPS → `https://mio.aion-platform.eu`

---

## 1. VPS Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU      | 1 vCPU  | 2 vCPU      |
| RAM      | 512 MB  | 1 GB        |
| Disk     | 5 GB    | 20 GB       |
| OS       | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |

**Required software:**
- Docker 24+
- Docker Compose v2 (`docker compose` — no hyphen)
- Nginx (reverse proxy + TLS termination)
- Certbot (Let's Encrypt SSL)

---

## 2. Environment Variables

Copy `.env.example` to `.env` and fill in every value before deploying.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite path — use `file:/data/mioos.db` in production |
| `MIOOS_USERNAME` | Yes | Login username |
| `MIOOS_PASSWORD` | Yes | Login password — use a strong password |
| `SESSION_SECRET` | Yes | 32-byte hex string for signing session tokens |
| `NEXT_PUBLIC_APP_URL` | Yes | Full public URL, e.g. `https://mio.aion-platform.eu` |
| `NEXT_PUBLIC_AI_ENABLED` | No | Set `true` to enable AI assistant (requires `ANTHROPIC_API_KEY`) |
| `ANTHROPIC_API_KEY` | No | Only if `NEXT_PUBLIC_AI_ENABLED=true` |

Generate a session secret:
```bash
openssl rand -hex 32
```

**Never commit `.env` to git.** It is listed in `.gitignore`.

---

## 3. Initial Server Setup

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Nginx + Certbot
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx

# Clone the repository
git clone <your-repo-url> /opt/mioos
cd /opt/mioos

# Create production .env
cp .env.example .env
nano .env   # fill in all values
```

---

## 4. Docker Deployment

```bash
cd /opt/mioos

# Build and start
docker compose up -d --build

# Verify it started
docker compose ps
docker compose logs -f
```

The container will:
1. Run `prisma db push` to initialize / migrate the schema (idempotent, never drops data)
2. Start the Next.js server on port 3000

Verify the health endpoint from inside the VPS:
```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","version":"...","timestamp":"..."}
```

---

## 5. Nginx Reverse Proxy + TLS

Create `/etc/nginx/sites-available/mioos`:

```nginx
server {
    server_name mio.aion-platform.eu;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/mioos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Obtain SSL certificate
sudo certbot --nginx -d mio.aion-platform.eu
```

Certbot will edit your Nginx config to add HTTPS and auto-renewal.

---

## 6. Updating MioOS

```bash
cd /opt/mioos

# Pull latest code
git pull

# Rebuild and restart (zero-downtime swap)
docker compose up -d --build

# Remove old images
docker image prune -f
```

The entrypoint runs `prisma db push` on every start, so schema migrations apply automatically.

---

## 7. Backup Strategy

The SQLite database lives in the `mioos_data` Docker volume, mounted at `/data/mioos.db` inside the container.

**Automated daily backup (cron):**

```bash
# Create backup directory
mkdir -p /opt/mioos-backups

# Add to crontab: sudo crontab -e
0 3 * * * docker run --rm -v mioos_mioos_data:/data -v /opt/mioos-backups:/backup alpine \
  sh -c "cp /data/mioos.db /backup/mioos-$(date +\%Y\%m\%d).db" >> /var/log/mioos-backup.log 2>&1

# Prune backups older than 30 days
5 3 * * * find /opt/mioos-backups -name "*.db" -mtime +30 -delete
```

> Note: The Docker volume name is `mioos_mioos_data` (project folder prefix + volume name). Confirm with `docker volume ls`.

**Manual backup:**
```bash
docker run --rm \
  -v mioos_mioos_data:/data \
  -v $(pwd):/backup \
  alpine cp /data/mioos.db /backup/mioos-manual.db
```

---

## 8. Restore Strategy

```bash
# Stop the app
docker compose stop

# Restore backup into the volume
docker run --rm \
  -v mioos_mioos_data:/data \
  -v /opt/mioos-backups:/backup \
  alpine cp /backup/mioos-20260101.db /data/mioos.db

# Restart
docker compose start
```

---

## 9. Health Monitoring

The `/api/health` endpoint is public (no auth required) and returns:

```json
{
  "status": "ok",
  "version": "0.1.0",
  "timestamp": "2026-06-01T10:00:00.000Z"
}
```

Use it with any uptime monitor (UptimeRobot, Better Uptime, etc.) to get alerted on downtime.

---

## 10. Troubleshooting

**Container exits immediately:**
```bash
docker compose logs mioos
```
Most likely cause: missing required env var (`SESSION_SECRET`, `MIOOS_USERNAME`, or `MIOOS_PASSWORD`).

**Login not working:**
- Verify `MIOOS_USERNAME` and `MIOOS_PASSWORD` match what you're entering
- Check `SESSION_SECRET` is set (required in production — the server returns 500 if missing)

**Database not persisting across redeploys:**
- Confirm the volume exists: `docker volume ls | grep mioos`
- Do **not** run `docker compose down -v` — that deletes the volume

**Port 3000 already in use:**
Change the host port in `docker-compose.yml`: `"3001:3000"` and update Nginx `proxy_pass` accordingly.
