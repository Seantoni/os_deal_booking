-- Add optional role for primary business contact
ALTER TABLE "businesses"
ADD COLUMN "contactRole" TEXT;
