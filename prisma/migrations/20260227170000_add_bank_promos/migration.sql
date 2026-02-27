-- CreateTable
CREATE TABLE "bank_promos" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceSite" TEXT NOT NULL DEFAULT 'bgeneral',
    "externalId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "discountText" TEXT NOT NULL,
    "discountPercent" INTEGER,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "conditions" TEXT,
    "lastScannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_promos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_promos_sourceUrl_key" ON "bank_promos"("sourceUrl");

-- CreateIndex
CREATE INDEX "bank_promos_sourceSite_idx" ON "bank_promos"("sourceSite");

-- CreateIndex
CREATE INDEX "bank_promos_businessName_idx" ON "bank_promos"("businessName");

-- CreateIndex
CREATE INDEX "bank_promos_lastScannedAt_idx" ON "bank_promos"("lastScannedAt");

-- CreateIndex
CREATE INDEX "bank_promos_startDate_idx" ON "bank_promos"("startDate");

-- CreateIndex
CREATE INDEX "bank_promos_endDate_idx" ON "bank_promos"("endDate");
