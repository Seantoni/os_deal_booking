ALTER TABLE "BookingRequest"
ADD COLUMN "businessId" TEXT,
ADD COLUMN "originExternalDealId" TEXT,
ADD COLUMN "originExternalDealName" TEXT;

ALTER TABLE "deal_metrics"
ADD COLUMN "vendorReactivateEligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "vendorReactivateEligibleAt" TIMESTAMP(3),
ADD COLUMN "vendorReactivateEligibleBy" TEXT;

CREATE TABLE "vendor_reactivation_states" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "lastTriggerEmailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_reactivation_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vendor_reactivation_states_businessId_key" ON "vendor_reactivation_states"("businessId");
CREATE INDEX "vendor_reactivation_states_lastTriggerEmailSentAt_idx" ON "vendor_reactivation_states"("lastTriggerEmailSentAt");
CREATE INDEX "BookingRequest_businessId_idx" ON "BookingRequest"("businessId");
CREATE INDEX "deal_metrics_vendorReactivateEligible_idx" ON "deal_metrics"("vendorReactivateEligible");

ALTER TABLE "BookingRequest"
ADD CONSTRAINT "BookingRequest_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vendor_reactivation_states"
ADD CONSTRAINT "vendor_reactivation_states_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
