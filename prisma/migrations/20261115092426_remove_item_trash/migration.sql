/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `Item` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Item_workspaceId_deletedAt_idx";

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "deletedAt";
