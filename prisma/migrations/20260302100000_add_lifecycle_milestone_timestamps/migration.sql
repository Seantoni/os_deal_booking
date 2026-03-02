-- AlterTable
ALTER TABLE "BookingRequest"
  ADD COLUMN "sentAt" TIMESTAMP(3),
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "bookedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

ALTER TABLE "opportunities"
  ADD COLUMN "wonAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "BookingRequest_sentAt_idx" ON "BookingRequest"("sentAt");
CREATE INDEX "BookingRequest_approvedAt_idx" ON "BookingRequest"("approvedAt");
CREATE INDEX "BookingRequest_bookedAt_idx" ON "BookingRequest"("bookedAt");
CREATE INDEX "BookingRequest_rejectedAt_idx" ON "BookingRequest"("rejectedAt");
CREATE INDEX "BookingRequest_cancelledAt_idx" ON "BookingRequest"("cancelledAt");
CREATE INDEX "opportunities_wonAt_idx" ON "opportunities"("wonAt");

-- Backfill BookingRequest milestones from existing record state + activity logs.
UPDATE "BookingRequest" br
SET "sentAt" = COALESCE(
  br."sentAt",
  CASE WHEN br."status" <> 'draft' THEN br."createdAt" ELSE NULL END
);

UPDATE "BookingRequest" br
SET "approvedAt" = COALESCE(
  br."approvedAt",
  (
    SELECT MIN(al."createdAt")
    FROM "activity_logs" al
    WHERE al."entityType" = 'BookingRequest'
      AND al."entityId" = br."id"
      AND (
        al."action" = 'APPROVE'
        OR (al."details" -> 'statusChange' ->> 'to') = 'approved'
      )
  ),
  CASE
    WHEN br."status" IN ('approved', 'booked')
      THEN COALESCE(br."processedAt", br."updatedAt")
    ELSE NULL
  END
);

UPDATE "BookingRequest" br
SET "bookedAt" = COALESCE(
  br."bookedAt",
  (
    SELECT MIN(al."createdAt")
    FROM "activity_logs" al
    WHERE al."entityType" = 'BookingRequest'
      AND al."entityId" = br."id"
      AND (
        (al."details" -> 'statusChange' ->> 'to') = 'booked'
        OR (al."action" = 'STATUS_CHANGE' AND (al."details" -> 'statusChange' ->> 'to') = 'booked')
      )
  ),
  CASE
    WHEN br."status" = 'booked'
      THEN COALESCE(br."processedAt", br."updatedAt")
    ELSE NULL
  END
);

UPDATE "BookingRequest" br
SET "rejectedAt" = COALESCE(
  br."rejectedAt",
  (
    SELECT MIN(al."createdAt")
    FROM "activity_logs" al
    WHERE al."entityType" = 'BookingRequest'
      AND al."entityId" = br."id"
      AND (
        al."action" = 'REJECT'
        OR (al."details" -> 'statusChange' ->> 'to') = 'rejected'
      )
  ),
  CASE
    WHEN br."status" = 'rejected'
      THEN COALESCE(br."processedAt", br."updatedAt")
    ELSE NULL
  END
);

UPDATE "BookingRequest" br
SET "cancelledAt" = COALESCE(
  br."cancelledAt",
  (
    SELECT MIN(al."createdAt")
    FROM "activity_logs" al
    WHERE al."entityType" = 'BookingRequest'
      AND al."entityId" = br."id"
      AND (
        al."action" = 'CANCEL'
        OR (al."details" -> 'statusChange' ->> 'to') = 'cancelled'
      )
  ),
  CASE
    WHEN br."status" = 'cancelled'
      THEN COALESCE(br."processedAt", br."updatedAt")
    ELSE NULL
  END
);

-- Backfill Opportunity wonAt from status history and current state.
UPDATE "opportunities" o
SET "wonAt" = COALESCE(
  o."wonAt",
  (
    SELECT MIN(al."createdAt")
    FROM "activity_logs" al
    WHERE al."entityType" = 'Opportunity'
      AND al."entityId" = o."id"
      AND (al."details" -> 'statusChange' ->> 'to') = 'won'
  ),
  CASE
    WHEN o."stage" = 'won'
      THEN COALESCE(o."closeDate", o."updatedAt")
    ELSE NULL
  END
);
