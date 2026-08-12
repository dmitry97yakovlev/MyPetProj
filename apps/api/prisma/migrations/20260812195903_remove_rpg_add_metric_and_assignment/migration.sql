-- DropForeignKey
ALTER TABLE "characters" DROP CONSTRAINT "characters_userId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_items" DROP CONSTRAINT "inventory_items_itemId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_items" DROP CONSTRAINT "inventory_items_userId_fkey";

-- AlterTable
ALTER TABLE "daily_tasks" DROP COLUMN "xpPerUnit",
DROP COLUMN "xpReward",
ADD COLUMN     "tracksEpicMetric" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "epic_wins" ADD COLUMN     "metricStartValue" DOUBLE PRECISION,
ADD COLUMN     "metricTargetValue" DOUBLE PRECISION,
ADD COLUMN     "metricUnit" TEXT;

-- AlterTable
ALTER TABLE "quests" DROP COLUMN "xpReward",
ADD COLUMN     "assignedToUserId" TEXT;

-- DropTable
DROP TABLE "characters";

-- DropTable
DROP TABLE "inventory_items";

-- DropTable
DROP TABLE "items";

-- DropEnum
DROP TYPE "ItemRarity";

-- DropEnum
DROP TYPE "ItemSlot";

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

