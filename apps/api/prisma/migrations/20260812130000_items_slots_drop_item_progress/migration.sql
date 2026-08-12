-- AlterEnum
ALTER TYPE "ItemSlot" ADD VALUE 'RING';
ALTER TYPE "ItemSlot" ADD VALUE 'NECKLACE';

-- AlterTable
ALTER TABLE "characters" DROP COLUMN "itemProgress";
