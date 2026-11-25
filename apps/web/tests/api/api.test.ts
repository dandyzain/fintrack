import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { signSessionToken } from "@/lib/auth/token";
import { resetStore } from "../helpers";

const API_DIR = path.resolve(__dirname, "../../app/api");
const BASE = "http://localhost";

/** Routes that are intentionally reachable without a session. */
const PUBLIC = new Set([
  "auth/login",
  "auth/register",
  "auth/logout",
  "auth/demo",
  "auth/forgot-password",
  "auth/reset-password",
  "auth/verify-email",
  "receipts/file",
  "cron/recurring",
  "health",
]);

function routeFiles(dir = API_DIR): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return name === "route.ts" ? [full] : [];
  });
}

type Handler = (req: NextRequest, ctx: { params: Record<string, string> }) => Promise<Response>;

async function call(
  route: string,
  method: string,
  opts: { body?: unknown; cookie?: string; bearer?: string; query?: string; params?: Record<string, string>; form?: FormData; ip?: string } = {}
) {
  const mod = (await import(`@/app/api/${route}/route`)) as Record<string, Handler>;
  const handler = mod[method];
  if (!handler) throw new Error(`${method} ${route} not exported`);
  const headers = new Headers({ "x-forwarded-for": opts.ip ?? "203.0.113.7" });
  if (opts.cookie) headers.set("cookie", opts.cookie);
  if (opts.bearer) headers.set("authorization", `Bearer ${opts.bearer}`);
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined && method !== "GET" && method !== "HEAD") {
    headers.set("content-type", "application/json");
    body = JSON.stringify(opts.body);
  }
  const url = `${BASE}/api/${route.replace(/\[id\]/, opts.params?.id ?? "x")}${opts.query ? `?${opts.query}` : ""}`;
  const res = await handler(new NextRequest(url, { method, headers, body }), { params: opts.params ?? {} });
  const text = await res.text();
  let json: { success?: boolean; data?: any; error?: string; code?: string } = {};
  try {
    json = JSON.parse(text);
  } catch {
    /* CSV/binary */
  }
  const setCookie = res.headers.get("set-cookie") ?? "";
  const cookie = /fintrack_session=([^;]+)/.exec(setCookie)?.[1];
  return { status: res.status, json, text, headers: res.headers, cookie: cookie ? `fintrack_session=${cookie}` : undefined };
}

beforeEach(async () => {
  await resetStore();
});

describe("authentication is enforced on every private route", () => {
  const files = routeFiles();
  it("discovers the route files", () => expect(files.length).toBeGreaterThan(20));

  for (const file of files) {
    const route = path.relative(API_DIR, path.dirname(file)).split(path.sep).join("/");
    if (PUBLIC.has(route)) continue;
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
      it(`${method} /api/${route} → 401 without a session`, async () => {
        const mod = (await import(`@/app/api/${route}/route`)) as Record<string, unknown>;
        if (!mod[method]) return;
        const res = await call(route, method, { params: { id: "00000000-0000-0000-0000-000000000000" }, body: {} });
        expect(res.status).toBe(401);
        expect(res.json.code).toBe("UNAUTHORIZED");
      });
    }
  }

  it("rejects forged and revoked tokens", async () => {
    const forged = await signSessionToken({ sub: "someone", sv: 0 }, 60, "a-completely-different-secret-value-123456");
    expect((await call("wallets", "GET", { cookie: `fintrack_session=${forged}` })).status).toBe(401);

    const reg = await call("auth/register", "POST", { body: { name: "Ani", email: "ani@example.com", password: "rahasia-123" } });
    const oldCookie = reg.cookie!;
    expect((await call("wallets", "GET", { cookie: oldCookie })).status).toBe(200);
    const logoutAll = await call("auth/logout", "POST", { cookie: oldCookie, body: { everywhere: true } });
    expect(logoutAll.status).toBe(200);
    const after = await call("wallets", "GET", { cookie: oldCookie });
    expect(after.status).toBe(401);
    expect(after.headers.get("set-cookie")).toMatch(/fintrack_session=;/); // stale cookie cleared
  });
});

describe("account flows", () => {
  it("registers, logs in, upgrades nothing it shouldn't, and limits guessing", async () => {
    const weak = await call("auth/register", "POST", { body: { name: "Budi", email: "budi@example.com", password: "123456" } });
    expect(weak.status).toBe(400);

    const reg = await call("auth/register", "POST", { body: { name: "Budi", email: "Budi@Example.com", password: "kata-sandi-kuat" } });
    expect(reg.status).toBe(201);
    expect(reg.json.data.user.email).toBe("budi@example.com");
    expect(reg.json.data.token).toBeTruthy();
    expect((await call("auth/register", "POST", { body: { name: "B2", email: "budi@example.com", password: "kata-sandi-kuat" } })).status).toBe(409);

    const wrong = await call("auth/login", "POST", { body: { email: "budi@example.com", password: "salah-salah" } });
    expect(wrong.status).toBe(401);
    expect(wrong.json.error).toBe("Email atau kata sandi tidak cocok.");
    const unknown = await call("auth/login", "POST", { body: { email: "nobody@example.com", password: "salah-salah" } });
    expect(unknown.json.error).toBe(wrong.json.error);

    const login = await call("auth/login", "POST", { body: { email: "budi@example.com", password: "kata-sandi-kuat" } });
    expect(login.status).toBe(200);
    // Bearer works for the mobile app
    expect((await call("auth/me", "GET", { bearer: login.json.data.token })).json.data.user.name).toBe("Budi");

    let limited = 0;
    for (let i = 0; i < 10; i++) {
      const r = await call("auth/login", "POST", { body: { email: "budi@example.com", password: "tebak-tebak" }, ip: `198.51.100.${i}` });
      if (r.status === 429) limited++;
    }
    expect(limited).toBeGreaterThan(0); // per-account limit applies across IPs
  });

  it("changes the password and signs out other sessions", async () => {
    const reg = await call("auth/register", "POST", { body: { name: "Citra", email: "citra@example.com", password: "lama-123456" } });
    const other = await call("auth/login", "POST", { body: { email: "citra@example.com", password: "lama-123456" } });
    const bad = await call("account/password", "POST", { cookie: reg.cookie, body: { currentPassword: "keliru-123", newPassword: "baru-1234567" } });
    expect(bad.status).toBe(400);
    const changed = await call("account/password", "POST", { cookie: reg.cookie, body: { currentPassword: "lama-123456", newPassword: "baru-1234567" } });
    expect(changed.status).toBe(200);
    expect((await call("wallets", "GET", { cookie: other.cookie })).status).toBe(401);
    expect((await call("wallets", "GET", { cookie: changed.cookie })).status).toBe(200);
    expect((await call("auth/login", "POST", { body: { email: "citra@example.com", password: "baru-1234567" } })).status).toBe(200);
  });

  it("resets a forgotten password with a one-time link", async () => {
    await call("auth/register", "POST", { body: { name: "Dewi", email: "dewi@example.com", password: "awal-123456" } });
    const logs: string[] = [];
    const orig = console.info;
    console.info = (line: string) => logs.push(String(line));
    try {
      const res = await call("auth/forgot-password", "POST", { body: { email: "dewi@example.com" } });
      expect(res.status).toBe(200);
      const same = await call("auth/forgot-password", "POST", { body: { email: "tidak-ada@example.com" } });
      expect(same.json.message).toBe(res.json.message);
    } finally {
      console.info = orig;
    }
    const token = logs.join("\n").match(/reset-password\?token=([\w-]+)/)?.[1];
    expect(token).toBeTruthy();
    const reset = await call("auth/reset-password", "POST", { body: { token, password: "baru-sekali-123" } });
    expect(reset.status).toBe(200);
    expect((await call("auth/reset-password", "POST", { body: { token, password: "lagi-lagi-123" } })).status).toBe(400);
    expect((await call("auth/login", "POST", { body: { email: "dewi@example.com", password: "baru-sekali-123" } })).status).toBe(200);
  });

  it("exports and deletes the account", async () => {
    const reg = await call("auth/register", "POST", { body: { name: "Eka", email: "eka@example.com", password: "hapus-123456" } });
    const exp = await call("account/export", "GET", { cookie: reg.cookie });
    expect(exp.status).toBe(200);
    expect(exp.headers.get("content-disposition")).toMatch(/attachment/);
    expect(JSON.parse(exp.text).wallets).toHaveLength(3);
    expect((await call("account", "DELETE", { cookie: reg.cookie, body: { confirm: "DELETE", password: "salah" } })).status).toBe(400);
    expect((await call("account", "DELETE", { cookie: reg.cookie, body: { confirm: "DELETE", password: "hapus-123456" } })).status).toBe(200);
    expect((await call("wallets", "GET", { cookie: reg.cookie })).status).toBe(401);
    expect((await call("auth/login", "POST", { body: { email: "eka@example.com", password: "hapus-123456" } })).status).toBe(401);
  });
});

describe("finance flows", () => {
  async function demo() {
    const res = await call("auth/demo", "POST");
    expect(res.status).toBe(201);
    return res.cookie!;
  }

  it("gives every demo visitor an isolated sandbox", async () => {
    const a = await demo();
    const b = await demo();
    const aTx = (await call("transactions", "GET", { cookie: a })).json.data.items;
    expect(aTx.length).toBeGreaterThan(0);
    const victim = aTx[0].id;
    expect((await call("transactions/[id]", "GET", { cookie: b, params: { id: victim } })).status).toBe(404);
    expect((await call("transactions/[id]", "DELETE", { cookie: b, params: { id: victim } })).status).toBe(404);
    expect((await call("transactions/[id]", "GET", { cookie: a, params: { id: victim } })).status).toBe(200);
    const me = await call("auth/me", "GET", { cookie: a });
    expect(me.json.data.user.isDemo).toBe(true);
    expect(me.json.data.storage).toBe(process.env.DATABASE_URL ? "database" : "memory");
  });

  it("dashboard analytics include insights in every storage mode", async () => {
    const cookie = await demo();
    const now = new Date();
    const res = await call("analytics", "GET", { cookie, query: `month=${now.getUTCMonth() + 1}&year=${now.getUTCFullYear()}` });
    expect(res.status).toBe(200);
    expect(res.json.data.metrics).toBeDefined();
    expect(res.json.data.financialHealth).toBeDefined();
    expect(res.json.data.categoryBreakdown.length).toBeGreaterThan(0);
    expect(res.json.data.budgetComparisons.every((b: { hasBudget: boolean }) => b.hasBudget)).toBe(true);
    const report = await call("reports", "GET", { cookie, query: "months=6" });
    expect(report.json.data.months).toHaveLength(6);
  });

  it("scans a receipt, stores it privately and links it to the new transaction", async () => {
    const cookie = await demo();
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0]);
    const form = new FormData();
    form.append("file", new File([jpeg], "struk.jpg", { type: "image/jpeg" }));
    const scan = await call("receipts/scan", "POST", { cookie, form });
    expect(scan.status).toBe(200);
    expect(scan.json.data.extractedData.totalAmount).toBeGreaterThan(0);
    const signedUrl: string = scan.json.data.receiptImageUrl;
    expect(signedUrl).toMatch(/^\/api\/receipts\/file\?p=/);

    const svg = new FormData();
    svg.append("file", new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], "x.png", { type: "image/png" }));
    expect((await call("receipts/scan", "POST", { cookie, form: svg })).status).toBe(400);

    const wallets = (await call("wallets", "GET", { cookie })).json.data;
    const created = await call("transactions", "POST", {
      cookie,
      body: { walletId: wallets[0].id, type: "EXPENSE", amount: 145000, date: "2026-11-20", receiptImageUrl: signedUrl },
    });
    expect(created.status).toBe(201);
    expect(created.json.data.hasReceipt).toBe(true);
    expect(created.json.data.receiptImageUrl).toMatch(/^\/api\/receipts\/file\?p=/);

    const file = await call("receipts/file", "GET", { query: new URL(created.json.data.receiptImageUrl, BASE).search.slice(1) });
    expect(file.status).toBe(200);
    expect(file.headers.get("content-type")).toBe("image/jpeg");

    // Another user cannot attach this receipt to their own transaction.
    const other = await demo();
    const otherWallets = (await call("wallets", "GET", { cookie: other })).json.data;
    const steal = await call("transactions", "POST", {
      cookie: other,
      body: { walletId: otherWallets[0].id, type: "EXPENSE", amount: 1, date: "2026-11-20", receiptImageUrl: signedUrl },
    });
    expect(steal.status).toBe(400);
  });

  it("transfers, budgets, categories, recurring rules and CSV export", async () => {
    const reg = await call("auth/register", "POST", { body: { name: "Fajar", email: "fajar@example.com", password: "fajar-12345" } });
    const cookie = reg.cookie!;
    const [bank, cash] = (await call("wallets", "GET", { cookie })).json.data;

    const transfer = await call("transactions", "POST", {
      cookie,
      body: { walletId: bank.id, toWalletId: cash.id, type: "TRANSFER", amount: 200000, date: "2026-11-02" },
    });
    expect(transfer.status).toBe(201);
    const sameWallet = await call("transactions", "POST", {
      cookie,
      body: { walletId: bank.id, toWalletId: bank.id, type: "TRANSFER", amount: 1, date: "2026-11-02" },
    });
    expect(sameWallet.status).toBe(400);
    const balances = Object.fromEntries((await call("wallets", "GET", { cookie })).json.data.map((w: any) => [w.id, w.balance]));
    expect([balances[bank.id], balances[cash.id]]).toEqual([-200000, 200000]);

    const cat = await call("categories", "POST", { cookie, body: { name: "=cmd|' /C calc'!A0", icon: "Tag", color: "#123456" } });
    expect(cat.status).toBe(201);
    await call("transactions", "POST", { cookie, body: { walletId: cash.id, categoryId: cat.json.data.id, type: "EXPENSE", amount: 5000, date: "2026-11-03", merchantName: "=HYPERLINK(1)" } });

    const budget = await call("budgets", "PUT", { cookie, body: { categoryId: cat.json.data.id, month: 11, year: 2026, limitAmount: 1000 } });
    expect(budget.status).toBe(200);
    const analytics = await call("analytics", "GET", { cookie, query: "month=11&year=2026" });
    expect(analytics.json.data.summary.totalExpense).toBe(5000); // transfer not counted
    expect(analytics.json.data.budgetComparisons[0].isOverBudget).toBe(true);
    const copied = await call("budgets/copy", "POST", { cookie, body: { from: { month: 11, year: 2026 }, to: { month: 12, year: 2026 } } });
    expect(copied.json.data.copied).toBe(1);

    const rule = await call("recurring", "POST", {
      cookie,
      body: { walletId: bank.id, type: "INCOME", amount: 1000000, frequency: "MONTHLY", startDate: "2026-09-01", merchantName: "Gaji" },
    });
    expect(rule.status).toBe(201);
    expect(rule.json.data.createdTransactions).toBeGreaterThanOrEqual(3); // Sep, Oct, Nov (backfilled)
    const paused = await call("recurring/[id]", "PATCH", { cookie, params: { id: rule.json.data.rule.id }, body: { active: false } });
    expect(paused.json.data.active).toBe(false);

    const csv = await call("transactions/export", "GET", { cookie, query: "lang=id" });
    expect(csv.status).toBe(200);
    expect(csv.headers.get("content-type")).toMatch(/text\/csv/);
    expect(csv.text).toContain("'=HYPERLINK(1)");
    expect(csv.text).toContain("Tanggal,Jenis");

    // A pocket with history is never wiped silently.
    const refuse = await call("wallets/[id]", "DELETE", { cookie, params: { id: cash.id } });
    expect(refuse.status).toBe(409);
    const moved = await call("wallets/[id]", "DELETE", { cookie, params: { id: cash.id }, query: `mode=move&targetId=${bank.id}` });
    expect(moved.status).toBe(200);
    const rename = await call("wallets/[id]", "PATCH", { cookie, params: { id: bank.id }, body: { name: "BCA Utama" } });
    expect(rename.json.data.name).toBe("BCA Utama");
  });

  it("never exposes internal error details", async () => {
    const cookie = await demo();
    const res = await call("transactions", "POST", { cookie, body: { walletId: "nope", type: "EXPENSE", amount: 1, date: "2026-11-01" } });
    expect(res.status).toBe(404);
    const badJson = await (async () => {
      const mod = await import("@/app/api/transactions/route");
      const r = await mod.POST(
        new NextRequest(`${BASE}/api/transactions`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: "{oops" }),
        { params: {} }
      );
      return { status: r.status, json: await r.json() };
    })();
    expect(badJson.status).toBe(400);
    expect(JSON.stringify(badJson.json)).not.toMatch(/SyntaxError|at JSON|prisma/i);
  });
});
