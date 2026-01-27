-- CreateTable
CREATE TABLE "sales_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "minBusinesses" INTEGER,
    "maxBusinesses" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "sales_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_campaigns" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "business_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_campaigns_businessId_idx" ON "business_campaigns"("businessId");

-- CreateIndex
CREATE INDEX "business_campaigns_campaignId_idx" ON "business_campaigns"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "business_campaigns_businessId_campaignId_key" ON "business_campaigns"("businessId", "campaignId");

-- AddForeignKey
ALTER TABLE "business_campaigns" ADD CONSTRAINT "business_campaigns_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_campaigns" ADD CONSTRAINT "business_campaigns_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "sales_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
