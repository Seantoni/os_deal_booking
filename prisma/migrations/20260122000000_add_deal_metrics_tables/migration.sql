-- CreateTable: DealMetrics (synced from external Oferta API)
CREATE TABLE "deal_metrics" (
    "id" TEXT NOT NULL,
    "externalDealId" INTEGER NOT NULL,
    "externalVendorId" TEXT,
    "quantitySold" INTEGER NOT NULL DEFAULT 0,
    "netRevenue" DECIMAL(12,2) NOT NULL,
    "margin" DECIMAL(12,2) NOT NULL,
    "dealUrl" TEXT,
    "runAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "externalUpdatedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DealMetricsSnapshot (historical tracking)
CREATE TABLE "deal_metrics_snapshots" (
    "id" TEXT NOT NULL,
    "dealMetricsId" TEXT NOT NULL,
    "quantitySold" INTEGER NOT NULL,
    "netRevenue" DECIMAL(12,2) NOT NULL,
    "margin" DECIMAL(12,2) NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_metrics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deal_metrics_externalDealId_key" ON "deal_metrics"("externalDealId");

-- CreateIndex
CREATE INDEX "deal_metrics_externalDealId_idx" ON "deal_metrics"("externalDealId");

-- CreateIndex
CREATE INDEX "deal_metrics_externalVendorId_idx" ON "deal_metrics"("externalVendorId");

-- CreateIndex
CREATE INDEX "deal_metrics_lastSyncedAt_idx" ON "deal_metrics"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "deal_metrics_snapshots_dealMetricsId_idx" ON "deal_metrics_snapshots"("dealMetricsId");

-- CreateIndex
CREATE INDEX "deal_metrics_snapshots_snapshotAt_idx" ON "deal_metrics_snapshots"("snapshotAt");

-- AddForeignKey
ALTER TABLE "deal_metrics_snapshots" ADD CONSTRAINT "deal_metrics_snapshots_dealMetricsId_fkey" FOREIGN KEY ("dealMetricsId") REFERENCES "deal_metrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
