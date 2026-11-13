-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Item_workspaceId_isSystem_idx" ON "Item"("workspaceId", "isSystem");
