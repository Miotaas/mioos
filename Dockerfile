# ── Stage 1: Install dependencies ────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: Build ────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma client (uses a temporary db url for build)
ENV DATABASE_URL="file:./prisma/mioos.db"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# ── Stage 3: Production runner ────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Persistent data directory for SQLite
RUN mkdir -p /data && chown nextjs:nodejs /data

# Copy Next.js build artifacts
COPY --from=builder /app/public         ./public
COPY --from=builder /app/.next          ./.next
COPY --from=builder /app/node_modules   ./node_modules
COPY --from=builder /app/package.json   ./package.json
COPY --from=builder /app/prisma         ./prisma

# Copy runtime worker + first-run data init sources
COPY --from=builder /app/runtime        ./runtime
COPY --from=builder /app/lib            ./lib
COPY --from=builder /app/types          ./types
COPY --from=builder /app/scripts        ./scripts
COPY --from=builder /app/tsconfig.json  ./tsconfig.json

# Entrypoint
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && chown nextjs:nodejs docker-entrypoint.sh

USER nextjs
EXPOSE 3000

# CMD can be overridden by docker-compose `command:` to run the runtime worker instead
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
