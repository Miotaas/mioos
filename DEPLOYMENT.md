# MioOS — Production Deployment

Two deployment modes are supported. **PM2 bare-metal is recommended** for single-VPS setups — it gives cleaner process management and easier log access. Docker Compose is available as an alternative.

---

## Prerequisites

- Ubuntu 22.04+ or Debian 12+ VPS (minimum 1 GB RAM, 20 GB disk)
- Domain name pointed at the VPS
- Node.js 20, PM2, Git, Caddy

---

## Option A — PM2 Bare-Metal (Recommended)

### 1. Install Node.js 20 and PM2

```sh
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
sudo npm install -g pm2
```

### 2. Clone and configure

```sh
sudo mkdir -p /opt/mioos && sudo chown $USER:$USER /opt/mioos
git clone <your-repo> /opt/mioos
cd /opt/mioos

cp .env.production.example .env
nano .env
```

Minimum required values in `.env`:

```env
DATABASE_URL="file:/data/mioos.db"
MIOOS_USERNAME="your-username"
MIOOS_PASSWORD="your-strong-password"
SESSION_SECRET="$(openssl rand -hex 32)"
APP_URL="https://yourdomain.com"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NODE_ENV=production
ANTHROPIC_API_KEY="your-key"
```

### 3. Create data and log directories

```sh
sudo mkdir -p /data && sudo chown $USER:$USER /data
sudo mkdir -p /var/log/mioos && sudo chown $USER:$USER /var/log/mioos
```

### 4. Install dependencies and build

```sh
cd /opt/mioos
npm ci
npx prisma generate
npx prisma db push
npm run build
```

### 5. Start both processes with PM2

```sh
cd /opt/mioos

# Load env into the current shell so PM2 inherits them
export $(grep -v '^#' .env | xargs)

pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup   # follow the printed sudo command to enable auto-start on reboot
```

### 6. Verify both processes are running

```sh
pm2 status
# Should show: mioos-web (online) and mioos-runtime (online)

# Check web health
curl http://localhost:3000/api/health

# Check runtime health
curl http://localhost:3000/api/runtime/status
# "status": "running" means the worker is alive and heartbeating
```

### 7. Configure Caddy for HTTPS

```sh
sudo apt install -y caddy
```

`/etc/caddy/Caddyfile`:

```
yourdomain.com {
    reverse_proxy localhost:3000
}
```

```sh
sudo systemctl reload caddy
```

---

## Option B — Docker Compose

### 1. Install Docker

```sh
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker
```

### 2. Configure environment

```sh
cp .env.production.example .env
nano .env   # fill in all required values
```

### 3. Build and start

```sh
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

This starts two containers from the same image:
- `mioos` — Next.js web server on port 3000
- `mioos-runtime` — background worker (starts after web is healthy)

Both share the `/data` volume for the SQLite database.

### 4. Verify

```sh
docker compose -f docker-compose.prod.yml ps
# Both services should show "healthy" / "running"

docker compose -f docker-compose.prod.yml logs mioos-runtime --tail 20
# Should show: [worker] Runtime active.
```

---

## Runtime Worker Details

The runtime worker runs separately from the Next.js app. It handles:

- Assignment queue execution (every 60 seconds)
- Team objectives scheduling
- Handoff execution between agents
- Executive monitoring
- Signal collection

**Critical: only one runtime worker instance should ever run.** SQLite does not support concurrent writers — running two workers against the same database will cause `SQLITE_BUSY` errors.

### Crash recovery

On every startup the worker calls `recoverStuckQueue()`, which resets any queue items stuck in `"running"` state from a previous crash back to `"queued"`. Items are never permanently lost due to a crash.

### Verifying queue recovery after a crash

```sh
# Check for stuck items before restart
sqlite3 /data/mioos.db "SELECT id, title, status FROM RuntimeQueue WHERE status='running';"

# Restart the worker
pm2 restart mioos-runtime

# Verify recovery in logs
pm2 logs mioos-runtime --lines 5
# Should print: [worker] Recovered N stuck queue item(s) from previous crash
```

### Verifying handoffs resume after restart

Handoffs survive restarts automatically because they are stored in the database. The runtime loop calls `processPendingHandoffs()` on every tick, which picks up any handoffs in `"pending"` state regardless of whether the worker was restarted.

---

## Health Checks

| Endpoint | What it checks |
|---|---|
| `GET /api/health` | DB connectivity, auth config, scheduler state |
| `GET /api/runtime/status` | Worker heartbeat, uptime, queue depth |

A `"status": "running"` response from `/api/runtime/status` means the worker sent a heartbeat within the last 2 minutes.

A `"status": "stale"` means the worker is alive but slow (heartbeat 2–10 min ago).

A `"status": "offline"` means the worker has not heartbeated in over 10 minutes — restart it.

---

## Database Backup

```sh
# Stop the runtime worker before backup to avoid write conflicts
pm2 stop mioos-runtime

# Copy the database file
cp /data/mioos.db /data/mioos.db.backup-$(date +%Y%m%d)

# Resume
pm2 start mioos-runtime
```

For automated backups, add a cron job:

```sh
crontab -e
# Add:
0 3 * * * pm2 stop mioos-runtime && cp /data/mioos.db /data/backups/mioos-$(date +\%Y\%m\%d).db && pm2 start mioos-runtime
```

---

## PM2 Useful Commands

```sh
pm2 status                        # process table
pm2 logs mioos-web --lines 50     # web server logs
pm2 logs mioos-runtime --lines 50 # worker logs
pm2 restart mioos-runtime         # restart worker only
pm2 restart all                   # restart everything
pm2 monit                         # live CPU/memory dashboard
```

---

## Updating MioOS

```sh
cd /opt/mioos
git pull

npm ci
npx prisma db push     # apply any new schema changes
npm run build

pm2 restart all
pm2 save
```
