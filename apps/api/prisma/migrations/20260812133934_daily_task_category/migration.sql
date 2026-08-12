-- CreateEnum
CREATE TYPE "DailyTaskCategory" AS ENUM ('MANDATORY', 'OPTIONAL', 'SMALL', 'SUDDEN');

-- AlterTable
ALTER TABLE "daily_tasks" ADD COLUMN     "category" "DailyTaskCategory" NOT NULL DEFAULT 'MANDATORY';
