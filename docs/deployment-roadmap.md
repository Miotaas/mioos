# MioOS Deployment Roadmap

## Current State: Local-First

MioOS runs fully locally on your machine:
- Next.js dev server (`npm run dev`)
- SQLite database (`prisma/mioos.db`)
- No authentication required
- No cloud dependency
- All data stays on your machine

**Use case:** Solo operator + sales partner using same machine or local network.

## Next State: Private Web App

To give your sales partner access from their own machine, you need:

### Required Changes

1. **Database: SQLite → PostgreSQL**
   - Migrate schema: `prisma db push` after updating `datasource`
   - Host on Railway, Supabase, or Render (free tiers available)
   - Update `DATABASE_URL` in environment variables

2. **Authentication**
   - Add NextAuth.js or Clerk
   - Two users: you + sales partner
   - Role-based access is optional (start with shared login)

3. **Hosting**
   - Deploy to Vercel (easiest for Next.js)
   - Or Railway / Render for full-stack
   - Set environment variables in dashboard

4. **Backups**
   - PostgreSQL on Supabase: automatic daily backups
   - Or pg_dump cron job if self-hosted

### Migration Path

```
Phase 7 (now):   Local SQLite + localhost
Phase 8:         PostgreSQL + Vercel + simple auth
Phase 9:         Role-based access, sales partner dashboard polish
Phase 10:        Customer-facing portal (optional, much later)
```

### Estimated Phase 8 Effort

- Database migration: ~2 hours
- Auth setup (Clerk or NextAuth): ~4 hours
- Vercel deployment: ~1 hour
- Total: ~1 day of focused work
