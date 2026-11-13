-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "targetHistory" JSONB NOT NULL DEFAULT '[]';
