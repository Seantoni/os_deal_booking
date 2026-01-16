-- Add reassignment tracking fields to businesses table
ALTER TABLE "businesses" ADD COLUMN "reassignmentStatus" TEXT;
ALTER TABLE "businesses" ADD COLUMN "reassignmentType" TEXT;
ALTER TABLE "businesses" ADD COLUMN "reassignmentRequestedBy" TEXT;
ALTER TABLE "businesses" ADD COLUMN "reassignmentRequestedAt" TIMESTAMP(3);
ALTER TABLE "businesses" ADD COLUMN "reassignmentReason" TEXT;
ALTER TABLE "businesses" ADD COLUMN "reassignmentPreviousOwner" TEXT;

-- Add index for filtering by reassignment status
CREATE INDEX "businesses_reassignmentStatus_idx" ON "businesses"("reassignmentStatus");
