#!/bin/sh
set -e

echo "[MioOS] Initializing database schema..."
./node_modules/.bin/prisma db push --skip-generate

echo "[MioOS] Starting server..."
exec npm start
