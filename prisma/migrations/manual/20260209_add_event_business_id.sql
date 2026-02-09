-- Add businessId to Event table and link to businesses
-- Run on production after schema update

ALTER TABLE "Event"
ADD COLUMN IF NOT EXISTS "businessId" TEXT;

-- Add foreign key (run only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Event_businessId_fkey'
  ) THEN
    ALTER TABLE "Event"
    ADD CONSTRAINT "Event_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Event_businessId_idx" ON "Event"("businessId");
