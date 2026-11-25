import crypto from "crypto";
import { prisma } from "../src/index";

/**
 * Local development seed: one login you can use right away.
 *
 *   email:    dandy@example.com
 *   password: password123   (override with SEED_PASSWORD)
 *
 * Never run this against production: it creates an account with a known
 * password. The public "Try the demo" button does not need it (it creates a
 * private sandbox per visitor).
 */

/** Same format as apps/web/lib/server/password.ts (scrypt N=2^15, r=8, p=1). */
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password.normalize("NFKC"), salt, 64, { N: 2 ** 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
  return ["scrypt", 2 ** 15, 8, 1, salt.toString("base64"), key.toString("base64")].join("$");
}

const CATEGORIES = [
  { name: "Makanan & Minuman", icon: "Utensils", color: "#F97316" },
  { name: "Belanja Bulanan", icon: "ShoppingCart", color: "#10B981" },
  { name: "Transportasi", icon: "Car", color: "#3B82F6" },
  { name: "Tagihan & Utilitas", icon: "Receipt", color: "#0EA5E9" },
  { name: "Kesehatan", icon: "HeartPulse", color: "#EC4899" },
  { name: "Hiburan", icon: "Film", color: "#8B5CF6" },
  { name: "Gaji & Pendapatan", icon: "Banknote", color: "#22C55E" },
  { name: "Lainnya", icon: "Tag", color: "#6B7280" },
];

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
    throw new Error("Refusing to seed a production database (set ALLOW_PRODUCTION_SEED=true to override).");
  }
  console.log("🌱 Seeding development user...");

  const email = "dandy@example.com";
  const password = process.env.SEED_PASSWORD || "password123";

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: "Dandy Zain", passwordHash: hashPassword(password) },
    create: { email, name: "Dandy Zain", passwordHash: hashPassword(password), emailVerifiedAt: new Date() },
  });

  const wallets = [
    { name: "Dompet Tunai (Cash)", balance: 500000 },
    { name: "BCA Tabungan", balance: 5000000 },
    { name: "GoPay / OVO", balance: 250000 },
  ];
  for (const w of wallets) {
    const exists = await prisma.wallet.findFirst({ where: { userId: user.id, name: w.name } });
    if (!exists) await prisma.wallet.create({ data: { userId: user.id, ...w } });
  }

  for (const c of CATEGORIES) {
    const exists = await prisma.category.findFirst({ where: { name: c.name, OR: [{ userId: user.id }, { userId: null }] } });
    if (!exists) await prisma.category.create({ data: { userId: user.id, ...c } });
  }

  console.log(`✅ Done. Sign in as ${email} / ${process.env.SEED_PASSWORD ? "(SEED_PASSWORD)" : password}`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
