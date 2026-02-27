-- Add business lifecycle enum and denormalized column
CREATE TYPE "BusinessLifecycle" AS ENUM ('NEW', 'RECURRENT', 'UNKNOWN');

ALTER TABLE "businesses"
ADD COLUMN "businessLifecycle" "BusinessLifecycle" NOT NULL DEFAULT 'UNKNOWN';

-- One-time backfill using existing recurring threshold logic
-- Current recurring definition in sync flows: more than 2 deals in 360 days.
UPDATE "businesses"
SET "businessLifecycle" = CASE
  WHEN COALESCE("totalDeals360d", 0) > 2 THEN 'RECURRENT'::"BusinessLifecycle"
  ELSE 'NEW'::"BusinessLifecycle"
END;

CREATE INDEX "businesses_businessLifecycle_idx" ON "businesses"("businessLifecycle");
