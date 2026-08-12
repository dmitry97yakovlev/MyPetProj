/**
 * Dev-сид: создаёт пользователя admin/admin, чтобы сразу можно было
 * посмотреть интерфейс приложения, не проходя регистрацию вручную.
 *
 * ⚠️ ТОЛЬКО для локальной разработки. Пароль "admin" — намеренно простой
 * и НЕ должен попасть в production. Скрипт отказывается запускаться,
 * если NODE_ENV=production.
 */
import "dotenv/config";
import { prisma } from "../src/db";
import { hashPassword } from "../src/modules/auth/password";
import { ITEM_CATALOG } from "../src/modules/items/itemCatalog";

const DEV_ADMIN_EMAIL = "admin@local.test";
const DEV_ADMIN_PASSWORD = "admin";

async function seedItemCatalog() {
  for (const item of ITEM_CATALOG) {
    await prisma.item.upsert({
      where: { id: item.id },
      create: item,
      update: { name: item.name, slot: item.slot, rarity: item.rarity, icon: item.icon, bonusHp: item.bonusHp },
    });
  }
  console.log(`Каталог предметов синхронизирован: ${ITEM_CATALOG.length} шт.`);
}

async function seedDevAdmin() {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "Отказ: сид с дефолтным пользователем admin/admin нельзя запускать при NODE_ENV=production.",
    );
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email: DEV_ADMIN_EMAIL } });
  if (existing) {
    console.log(`Dev-админ уже существует: ${DEV_ADMIN_EMAIL}`);
    return;
  }

  const passwordHash = await hashPassword(DEV_ADMIN_PASSWORD);
  await prisma.user.create({
    data: {
      email: DEV_ADMIN_EMAIL,
      passwordHash,
      displayName: "Admin",
      isAdmin: true,
    },
  });

  console.log("Создан dev-пользователь для входа в приложение:");
  console.log(`  email:    ${DEV_ADMIN_EMAIL}`);
  console.log(`  password: ${DEV_ADMIN_PASSWORD}`);
  console.log("⚠️  Только для локальной разработки — не использовать в production.");
}

async function main() {
  await seedItemCatalog();
  await seedDevAdmin();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
