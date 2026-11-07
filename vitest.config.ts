import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    // Mirror the tsconfig "@/*" path alias.
    alias: [{ find: /^@\//, replacement: `${root}/` }],
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Builds one schema-current SQLite template per run.
    globalSetup: ["test/setup/global-setup.ts"],
    // Per test file: own DB copy, network guard, provider/clock reset.
    setupFiles: ["test/setup/per-file.ts"],
    // Separate processes: each test file gets its own Prisma client and DB.
    pool: "forks",
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
