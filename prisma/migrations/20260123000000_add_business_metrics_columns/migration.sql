-- Add aggregated deal metrics columns to businesses table for fast sorting
ALTER TABLE "businesses" ADD COLUMN "topSoldQuantity" INTEGER;
ALTER TABLE "businesses" ADD COLUMN "topSoldDealUrl" TEXT;
ALTER TABLE "businesses" ADD COLUMN "topRevenueAmount" DECIMAL(12, 2);
ALTER TABLE "businesses" ADD COLUMN "topRevenueDealUrl" TEXT;
ALTER TABLE "businesses" ADD COLUMN "lastLaunchDate" TIMESTAMP(3);
ALTER TABLE "businesses" ADD COLUMN "totalDeals360d" INTEGER;
ALTER TABLE "businesses" ADD COLUMN "metricsLastSyncedAt" TIMESTAMP(3);

-- Add businessId column to deal_metrics for direct relation
ALTER TABLE "deal_metrics" ADD COLUMN "businessId" TEXT;

-- Create indexes for fast sorting on businesses
CREATE INDEX "businesses_topSoldQuantity_idx" ON "businesses"("topSoldQuantity");
CREATE INDEX "businesses_topRevenueAmount_idx" ON "businesses"("topRevenueAmount");
CREATE INDEX "businesses_lastLaunchDate_idx" ON "businesses"("lastLaunchDate");
CREATE INDEX "businesses_totalDeals360d_idx" ON "businesses"("totalDeals360d");

-- Create index for businessId lookup on deal_metrics
CREATE INDEX "deal_metrics_businessId_idx" ON "deal_metrics"("businessId");

-- Add foreign key constraint
ALTER TABLE "deal_metrics" ADD CONSTRAINT "deal_metrics_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
