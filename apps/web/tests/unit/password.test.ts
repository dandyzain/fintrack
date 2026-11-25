import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { hashPassword, needsRehash, verifyPassword } from "@/lib/server/password";

describe("password hashing", () => {
  it("hashes with scrypt and verifies", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash.startsWith("scrypt$32768$8$1$")).toBe(true);
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
    expect(needsRehash(hash)).toBe(false);
  });

  it("uses a unique salt per hash", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("still accepts legacy PBKDF2 hashes and flags them for upgrade", async () => {
    const salt = crypto.randomBytes(16).toString("hex");
    const legacy = `${salt}:${crypto.pbkdf2Sync("password123", salt, 1000, 64, "sha512").toString("hex")}`;
    expect(await verifyPassword("password123", legacy)).toBe(true);
    expect(await verifyPassword("password124", legacy)).toBe(false);
    expect(needsRehash(legacy)).toBe(true);
  });

  it("rejects empty or malformed hashes", async () => {
    expect(await verifyPassword("x", null)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
    expect(await verifyPassword("x", "scrypt$1$2$3")).toBe(false);
  });
});
