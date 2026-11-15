-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Item_workspaceId_deletedAt_idx" ON "Item"("workspaceId", "deletedAt");
