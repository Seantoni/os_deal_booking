-- CreateTable
CREATE TABLE "event_leads" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceSite" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventDate" TEXT,
    "eventPlace" TEXT,
    "promoter" TEXT,
    "imageUrl" TEXT,
    "price" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastScannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_leads_sourceUrl_key" ON "event_leads"("sourceUrl");

-- CreateIndex
CREATE INDEX "event_leads_sourceSite_idx" ON "event_leads"("sourceSite");

-- CreateIndex
CREATE INDEX "event_leads_status_idx" ON "event_leads"("status");

-- CreateIndex
CREATE INDEX "event_leads_firstSeenAt_idx" ON "event_leads"("firstSeenAt");

-- CreateIndex
CREATE INDEX "event_leads_lastScannedAt_idx" ON "event_leads"("lastScannedAt");

-- CreateIndex
CREATE INDEX "event_leads_eventName_idx" ON "event_leads"("eventName");
