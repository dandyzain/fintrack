import { afterEach, describe, expect, it, vi } from "vitest";
import { getSessionSecret, signSessionToken, verifySessionToken } from "@/lib/auth/token";

const SECRET = "x".repeat(40);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("session tokens", () => {
  it("round-trips claims", async () => {
    const token = await signSessionToken({ sub: "user-1", sv: 3, demo: true }, 60, SECRET);
    expect(await verifySessionToken(token, SECRET)).toMatchObject({ sub: "user-1", sv: 3, demo: true });
  });

  it("rejects a tampered payload or a different secret", async () => {
    const token = await signSessionToken({ sub: "user-1", sv: 0 }, 60, SECRET);
    const [h, , s] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "admin", sv: 0, exp: 9999999999 })).toString("base64url");
    expect(await verifySessionToken(`${h}.${forged}.${s}`, SECRET)).toBeNull();
    expect(await verifySessionToken(token, "y".repeat(40))).toBeNull();
    expect(await verifySessionToken("not.a.token", SECRET)).toBeNull();
  });

  it("rejects tokens signed with alg=none", async () => {
    const h = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const p = Buffer.from(JSON.stringify({ sub: "u", sv: 0, exp: 9999999999 })).toString("base64url");
    expect(await verifySessionToken(`${h}.${p}.`, SECRET)).toBeNull();
  });

  it("expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = await signSessionToken({ sub: "u", sv: 0 }, 60, SECRET);
    vi.setSystemTime(new Date("2026-01-01T00:02:00Z"));
    expect(await verifySessionToken(token, SECRET)).toBeNull();
  });

  it("requires SESSION_SECRET in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "");
    vi.stubEnv("JWT_SECRET", "");
    expect(() => getSessionSecret()).toThrow(/SESSION_SECRET/);
    vi.stubEnv("SESSION_SECRET", "too-short");
    expect(() => getSessionSecret()).toThrow(/at least 32/);
    vi.stubEnv("SESSION_SECRET", SECRET);
    expect(getSessionSecret()).toBe(SECRET);
  });
});
