import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Unit + API tests run against the in-memory store (no database needed).
 * Integration tests against PostgreSQL: see vitest.integration.config.ts.
 */
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/store/memory.test.ts", "tests/api/**/*.test.ts"],
    setupFiles: ["tests/setup.memory.ts"],
    pool: "forks",
  },
});
