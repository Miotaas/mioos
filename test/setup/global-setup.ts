/**
 * Vitest global setup — runs once per test run, in the main process.
 *
 * Creates a SQLite template database from the current prisma/schema.prisma
 * with `prisma db push`. Each test file then copies this template into its
 * own throw-away database file (see per-file.ts). Test-only: production never
 * uses `db push` through this path.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    templateDbPath: string;
    testDbDir: string;
  }
}

function toSqliteUrl(filePath: string): string {
  return `file:${filePath.replace(/\\/g, "/")}`;
}

export default function setup(project: TestProject) {
  const root = process.cwd();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mioos-test-"));
  const templateDbPath = path.join(dir, "template.db");
  const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");

  try {
    execFileSync(
      process.execPath,
      [prismaCli, "db", "push", "--skip-generate", "--schema", path.join(root, "prisma", "schema.prisma")],
      {
        cwd: root,
        stdio: "pipe",
        env: { ...process.env, DATABASE_URL: toSqliteUrl(templateDbPath), PRISMA_HIDE_UPDATE_MESSAGE: "1" },
      },
    );
  } catch (err) {
    const stderr = (err as { stderr?: Buffer }).stderr?.toString().trim();
    fs.rmSync(dir, { recursive: true, force: true });
    throw new Error(
      `[test harness] could not create the SQLite template database with \`prisma db push\`.\n` +
        `Prisma's engines must be installed (\`npm ci\` + \`npx prisma generate\`).\n${stderr ?? String(err)}`,
    );
  }

  project.provide("templateDbPath", templateDbPath);
  project.provide("testDbDir", dir);

  return () => {
    fs.rmSync(dir, { recursive: true, force: true });
  };
}
