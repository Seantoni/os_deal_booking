-- Add deliveryDate to deals table
-- Run on production after schema update

ALTER TABLE "deals"
ADD COLUMN IF NOT EXISTS "deliveryDate" TIMESTAMP;
