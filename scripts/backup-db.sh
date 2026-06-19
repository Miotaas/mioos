#!/bin/sh
# MioOS — nightly SQLite backup with retention.
# Cron example (on the Hetzner host):
#   0 3 * * * /opt/mioos/scripts/backup-db.sh >> /var/log/mioos-backup.log 2>&1
set -e

DB_PATH="${MIOOS_DB_PATH:-/data/mioos.db}"
BACKUP_DIR="${MIOOS_BACKUP_DIR:-/data/backups}"
RETAIN_DAYS="${MIOOS_BACKUP_RETAIN_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/mioos-$TS.db"

# Use sqlite3 .backup for a consistent snapshot (safe with WAL). Fallback to cp.
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB_PATH" ".backup '$OUT'"
else
  cp "$DB_PATH" "$OUT"
fi
gzip -f "$OUT"

# Prune backups older than RETAIN_DAYS.
find "$BACKUP_DIR" -name 'mioos-*.db.gz' -mtime +"$RETAIN_DAYS" -delete 2>/dev/null || true
echo "[backup] wrote ${OUT}.gz"
