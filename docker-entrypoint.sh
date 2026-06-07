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

echo "[MioOS] Database ready. Starting server..."
exec npm start
