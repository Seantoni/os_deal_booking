-- Add matching fields to restaurant_leads
ALTER TABLE "restaurant_leads" ADD COLUMN "matchedBusinessId" TEXT;
ALTER TABLE "restaurant_leads" ADD COLUMN "matchConfidence" DECIMAL(3,2);

-- CreateIndex
CREATE INDEX "restaurant_leads_matchedBusinessId_idx" ON "restaurant_leads"("matchedBusinessId");

-- AddForeignKey
ALTER TABLE "restaurant_leads" ADD CONSTRAINT "restaurant_leads_matchedBusinessId_fkey" FOREIGN KEY ("matchedBusinessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
