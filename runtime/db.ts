// Shared Prisma client for all runtime worker modules.
// Separate from lib/db.ts, which uses the Next.js global singleton pattern.
// This file is intentionally NOT imported by Next.js app code.

import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({ log: ["error"] });

// SQLite concurrency settings — must be set on every connection.
// WAL mode: allows readers to continue while a writer is active.
// busy_timeout: retry for up to 5s instead of failing with SQLITE_BUSY.
// synchronous=NORMAL: safe for WAL mode, faster than FULL.
if (process.env.DATABASE_URL?.startsWith("file:")) {
  prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL").catch(() => {});
  prisma.$executeRawUnsafe("PRAGMA synchronous=NORMAL").catch(() => {});
  prisma.$executeRawUnsafe("PRAGMA busy_timeout=5000").catch(() => {});
}
