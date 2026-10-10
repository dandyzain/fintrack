import { prisma } from "../src/index";

async function main() {
  console.log("🌱 Seeding default categories and demo user...");

  // 1. Create Demo User
  const demoUser = await prisma.user.upsert({
    where: { email: "dandy@example.com" },
    update: { name: "Dandy Zain" },
    create: {
      email: "dandy@example.com",
      name: "Dandy Zain",
    },
  });

  console.log(`👤 Demo User: ${demoUser.name} (${demoUser.id})`);

  // 2. Create Default Wallets
  const wallets = [
    { name: "Dompet Tunai (Cash)", balance: 500000 },
    { name: "BCA Tabungan", balance: 5000000 },
    { name: "GoPay / OVO", balance: 250000 },
  ];

  for (const w of wallets) {
    const existingWallet = await prisma.wallet.findFirst({
      where: { userId: demoUser.id, name: w.name },
    });

    if (!existingWallet) {
      await prisma.wallet.create({
        data: {
          userId: demoUser.id,
          name: w.name,
          balance: w.balance,
        },
      });
    }
  }

  // 3. Create Default Categories (matching Receipt Extraction categories)
  const defaultCategories = [
    { name: "Makanan & Minuman", icon: "utensils", color: "#F97316" },
    { name: "Belanja Bulanan", icon: "shopping-bag", color: "#10B981" },
    { name: "Transportasi", icon: "car", color: "#3B82F6" },
    { name: "Kesehatan", icon: "heart-pulse", color: "#EC4899" },
    { name: "Hiburan", icon: "film", color: "#8B5CF6" },
    { name: "Lainnya", icon: "tag", color: "#6B7280" },
  ];

  for (const cat of defaultCategories) {
    const existingCat = await prisma.category.findFirst({
      where: {
        name: cat.name,
        OR: [{ userId: demoUser.id }, { userId: null }],
      },
    });

    if (!existingCat) {
      await prisma.category.create({
        data: {
          userId: demoUser.id,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
        },
      });
    }
  }

  console.log("✅ Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
