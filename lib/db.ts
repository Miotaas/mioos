import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  // SQLite concurrency settings for the two-process architecture (Next.js + runtime worker).
  // WAL mode persists in the DB file — safe to run on every startup.
  if (process.env.DATABASE_URL?.startsWith("file:")) {
    client.$executeRawUnsafe("PRAGMA journal_mode=WAL").catch(() => {});
    client.$executeRawUnsafe("PRAGMA synchronous=NORMAL").catch(() => {});
    client.$executeRawUnsafe("PRAGMA busy_timeout=5000").catch(() => {});
  }
  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
