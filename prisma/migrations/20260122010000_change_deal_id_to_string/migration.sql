-- Change externalDealId from INTEGER to TEXT (deal_id is a string like "D44381")

-- Drop the unique index first
DROP INDEX IF EXISTS "deal_metrics_externalDealId_key";
DROP INDEX IF EXISTS "deal_metrics_externalDealId_idx";

-- Alter the column type
ALTER TABLE "deal_metrics" ALTER COLUMN "externalDealId" TYPE TEXT;

-- Recreate indexes
CREATE UNIQUE INDEX "deal_metrics_externalDealId_key" ON "deal_metrics"("externalDealId");
CREATE INDEX "deal_metrics_externalDealId_idx" ON "deal_metrics"("externalDealId");
