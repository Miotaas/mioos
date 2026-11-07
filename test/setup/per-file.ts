/**
 * Vitest per-file setup — runs in each test file's worker before the file's
 * own imports are evaluated.
 *
 * 1. Gives the file its own throw-away SQLite database (a copy of the template),
 *    so lib/db.ts creates its Prisma client against that file.
 * 2. Installs the real-network guard: any real TCP/TLS connection or fetch
 *    fails the test.
 * 3. Resets the provider and clock overrides after every test.
 */
import fs from "node:fs";
import path from "node:path";
import { afterAll, afterEach, beforeAll, inject } from "vitest";
import { assertNoRealNetworkAttempts, installNetworkGuard } from "../helpers/network-guard";

const templateDbPath = inject("templateDbPath");
const testDbDir = inject("testDbDir");
const fileDbPath = path.join(
  testDbDir,
  `file-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.db`,
);
fs.copyFileSync(templateDbPath, fileDbPath);

process.env.DATABASE_URL = `file:${fileDbPath.replace(/\\/g, "/")}`;
// lib/db.ts caches its client on globalThis outside production; never reuse one
// that points at another file's database.
Reflect.deleteProperty(globalThis, "prisma");

installNetworkGuard();

beforeAll(() => {
  assertNoRealNetworkAttempts();
});

afterEach(async () => {
  const { setEmailProviderForTesting } = await import("@/lib/providers");
  const { setClockForTesting } = await import("@/lib/clock");
  setEmailProviderForTesting(null);
  setClockForTesting(null);
  assertNoRealNetworkAttempts();
});

afterAll(async () => {
  const { prisma } = await import("@/lib/db");
  await prisma.$disconnect();
  for (const suffix of ["", "-wal", "-shm", "-journal"]) {
    fs.rmSync(`${fileDbPath}${suffix}`, { force: true });
  }
});
