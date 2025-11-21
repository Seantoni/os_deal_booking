-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "parentCategory" TEXT,
ADD COLUMN     "subCategory1" TEXT,
ADD COLUMN     "subCategory2" TEXT,
ADD COLUMN     "subCategory3" TEXT;

-- CreateIndex
CREATE INDEX "Event_parentCategory_idx" ON "Event"("parentCategory");

-- CreateIndex
CREATE INDEX "Event_subCategory1_idx" ON "Event"("subCategory1");

-- CreateIndex
CREATE INDEX "Event_subCategory2_idx" ON "Event"("subCategory2");

-- CreateIndex
CREATE INDEX "Event_subCategory3_idx" ON "Event"("subCategory3");
