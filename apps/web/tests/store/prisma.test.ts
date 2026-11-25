import { afterAll } from "vitest";
import { runStoreContract } from "./contract";

runStoreContract("postgresql");

afterAll(async () => {
  const { prisma } = await import("@fintrack/database");
  await prisma.$disconnect();
});
