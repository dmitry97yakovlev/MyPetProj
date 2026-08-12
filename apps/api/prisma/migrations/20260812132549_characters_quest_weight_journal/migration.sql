-- CreateEnum
CREATE TYPE "JournalEntryKind" AS ENUM ('TEXT', 'VOICE');

-- AlterTable
ALTER TABLE "characters" ALTER COLUMN "avatarIcon" SET DEFAULT 'arthas';

-- AlterTable
ALTER TABLE "quests" ADD COLUMN     "estimatedDays" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "JournalEntryKind" NOT NULL DEFAULT 'TEXT',
    "content" TEXT,
    "audioUrl" TEXT,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
