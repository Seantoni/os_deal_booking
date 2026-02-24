-- Add category name columns to deal_metrics
ALTER TABLE "deal_metrics" ADD COLUMN "category1Name" TEXT;
ALTER TABLE "deal_metrics" ADD COLUMN "category2Name" TEXT;
ALTER TABLE "deal_metrics" ADD COLUMN "category3Name" TEXT;

-- Index on category1Name for filtering
CREATE INDEX "deal_metrics_category1Name_idx" ON "deal_metrics"("category1Name");
