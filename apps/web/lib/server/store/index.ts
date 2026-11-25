import { isDatabaseMode } from "../config";
import { createMemoryStore } from "./memory-store";
import { createPrismaStore } from "./prisma-store";
import type { FinanceStore } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var __fintrackMemoryStore: (FinanceStore & { reset(): void }) | undefined;
}

let prismaStore: FinanceStore | undefined;
let warned = false;

/**
 * PostgreSQL when DATABASE_URL is set, otherwise the in-memory store.
 * Decided once per request from configuration; a database error is reported
 * as an error, never answered from memory.
 */
export function getStore(): FinanceStore {
  if (isDatabaseMode()) {
    prismaStore ??= createPrismaStore();
    return prismaStore;
  }
  if (!warned) {
    warned = true;
    console.warn("[fintrack] DATABASE_URL is not set: running in memory mode. Data is lost when the server restarts.");
  }
  globalThis.__fintrackMemoryStore ??= createMemoryStore();
  return globalThis.__fintrackMemoryStore;
}

export type { FinanceStore } from "./types";
