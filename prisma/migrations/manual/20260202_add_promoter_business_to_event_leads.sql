-- Add promoterBusinessId to event_leads table
-- Links event lead to a Business (promoter) selected by the user
-- Run on production after schema update

ALTER TABLE "event_leads" 
ADD COLUMN IF NOT EXISTS "promoterBusinessId" TEXT;

-- Add foreign key (run only if not exists - omit if column was just added with FK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_leads_promoterBusinessId_fkey'
  ) THEN
    ALTER TABLE "event_leads"
    ADD CONSTRAINT "event_leads_promoterBusinessId_fkey" 
    FOREIGN KEY ("promoterBusinessId") REFERENCES "businesses"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "event_leads_promoterBusinessId_idx" ON "event_leads"("promoterBusinessId");
