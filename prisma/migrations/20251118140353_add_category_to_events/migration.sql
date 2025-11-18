-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "category" TEXT;

-- CreateIndex
CREATE INDEX "Event_category_idx" ON "Event"("category");
