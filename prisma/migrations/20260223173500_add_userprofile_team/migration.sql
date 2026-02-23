-- Add team assignment to user profiles for auto-filling business sales team
ALTER TABLE "UserProfile" ADD COLUMN "team" TEXT;
