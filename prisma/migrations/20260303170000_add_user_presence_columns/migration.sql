-- Add lightweight presence tracking fields to support live online badges
ALTER TABLE "UserProfile"
ADD COLUMN "lastSeenAt" TIMESTAMP(3),
ADD COLUMN "activePath" TEXT;

CREATE INDEX "UserProfile_lastSeenAt_idx" ON "UserProfile"("lastSeenAt");
