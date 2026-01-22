-- Remove unused fields from BookingRequest table
ALTER TABLE "BookingRequest" DROP COLUMN IF EXISTS "giftVouchers";
ALTER TABLE "BookingRequest" DROP COLUMN IF EXISTS "vouchersPerPerson";
ALTER TABLE "BookingRequest" DROP COLUMN IF EXISTS "commission";
