#!/bin/sh
set -e

# Detect database provider from DATABASE_URL to choose the correct migration strategy.
# PostgreSQL: use `prisma migrate deploy` (requires a migrations folder).
# SQLite:     use `prisma db push` (safe for single-instance embedded DB).
if echo "$DATABASE_URL" | grep -qE "^postgresql://|^postgres://"; then
  echo "[MioOS] PostgreSQL detected — running prisma migrate deploy..."
  ./node_modules/.bin/prisma migrate deploy
else
  echo "[MioOS] SQLite detected — applying schema with prisma db push..."
  ./node_modules/.bin/prisma db push --skip-generate
fi

# First-run data initialization — REQUIRED so a fresh database is not empty.
# Both steps are idempotent: seed.ts skips when data already exists; the
# business-unit backfill upserts. Non-fatal so the app still starts if they fail.
echo "[MioOS] Ensuring base data (idempotent seed + business units)..."
./node_modules/.bin/tsx prisma/seed.ts || echo "[MioOS] seed skipped/failed (continuing)"
./node_modules/.bin/tsx scripts/backfill-business-units.ts || echo "[MioOS] BU backfill skipped/failed (continuing)"

echo "[MioOS] Database ready. Starting: ${*:-npm start}"

# Use args passed by Docker CMD (or docker-compose command:) so the same image
# can run either the web server or the runtime worker.
exec "${@:-npm start}"
