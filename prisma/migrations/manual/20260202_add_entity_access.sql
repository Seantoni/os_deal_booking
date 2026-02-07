-- Entity Access Table
-- Grants specific users access to specific entities regardless of role
-- Run on production after deploying schema changes

-- Create entity_access table
CREATE TABLE IF NOT EXISTS "entity_access" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "accessLevel" TEXT NOT NULL DEFAULT 'view',
  "grantedBy" TEXT NOT NULL,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "notes" TEXT,
  
  CONSTRAINT "entity_access_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint for userId + entityType + entityId
ALTER TABLE "entity_access" 
ADD CONSTRAINT "entity_access_userId_entityType_entityId_key" 
UNIQUE ("userId", "entityType", "entityId");

-- Add foreign key to user_profiles (assumes user_profiles table exists)
-- Note: Check your actual table name - might be "UserProfile" or "user_profiles"
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'entity_access_userId_fkey'
  ) THEN
    ALTER TABLE "entity_access"
    ADD CONSTRAINT "entity_access_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "UserProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS "entity_access_entityType_entityId_idx" ON "entity_access"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "entity_access_userId_idx" ON "entity_access"("userId");
CREATE INDEX IF NOT EXISTS "entity_access_expiresAt_idx" ON "entity_access"("expiresAt");
