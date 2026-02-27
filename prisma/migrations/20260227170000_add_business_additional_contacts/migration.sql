-- Add JSON column for additional business contacts
ALTER TABLE "businesses"
ADD COLUMN "additionalContacts" JSONB;
