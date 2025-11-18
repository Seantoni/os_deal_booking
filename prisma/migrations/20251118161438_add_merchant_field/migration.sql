-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "merchant" TEXT;

-- CreateIndex
CREATE INDEX "Event_merchant_idx" ON "Event"("merchant");
