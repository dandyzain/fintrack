import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Runs the store contract and API flows against a real PostgreSQL database.
 * Requires TEST_DATABASE_URL (the database is wiped between tests, so it must
 * be a throw-away database whose name contains "test").
 */
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    environment: "node",
    include: ["tests/store/prisma.test.ts", "tests/api/**/*.test.ts"],
    setupFiles: ["tests/setup.database.ts"],
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
