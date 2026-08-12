-- AlterTable
ALTER TABLE "daily_tasks" ADD COLUMN     "unit" TEXT,
ADD COLUMN     "xpPerUnit" INTEGER;

-- AlterTable
ALTER TABLE "task_completions" ADD COLUMN     "quantity" DOUBLE PRECISION;
