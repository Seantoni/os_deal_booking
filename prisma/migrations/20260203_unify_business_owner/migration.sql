-- Unify business ownership: remove BusinessSalesRep, add owner relation

-- Drop the business_sales_reps table (no data migration needed per user request)
DROP TABLE IF EXISTS "business_sales_reps";

-- Add foreign key constraint for owner relation
-- Note: ownerId column already exists, just adding the foreign key
ALTER TABLE "businesses" 
ADD CONSTRAINT "businesses_ownerId_fkey" 
FOREIGN KEY ("ownerId") REFERENCES "user_profiles"("clerkId") ON DELETE SET NULL ON UPDATE CASCADE;
