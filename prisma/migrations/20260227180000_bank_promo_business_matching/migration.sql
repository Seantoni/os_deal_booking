-- AlterTable
ALTER TABLE "bank_promos" ADD COLUMN "matchedBusinessId" TEXT,
ADD COLUMN "matchConfidence" DECIMAL(3,2);

-- CreateIndex
CREATE INDEX "bank_promos_matchedBusinessId_idx" ON "bank_promos"("matchedBusinessId");

-- AddForeignKey
ALTER TABLE "bank_promos" ADD CONSTRAINT "bank_promos_matchedBusinessId_fkey" FOREIGN KEY ("matchedBusinessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
