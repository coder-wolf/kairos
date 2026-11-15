-- CreateTable
CREATE TABLE "GoalItem" (
    "goalId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "GoalItem_pkey" PRIMARY KEY ("goalId","itemId")
);

-- CreateIndex
CREATE INDEX "GoalItem_itemId_idx" ON "GoalItem"("itemId");

-- AddForeignKey
ALTER TABLE "GoalItem" ADD CONSTRAINT "GoalItem_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalItem" ADD CONSTRAINT "GoalItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing single-item goals into the new relation.
INSERT INTO "GoalItem" ("goalId", "itemId")
SELECT "id", "itemId" FROM "Goal"
ON CONFLICT DO NOTHING;
