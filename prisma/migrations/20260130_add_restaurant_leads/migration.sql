-- CreateTable
CREATE TABLE "restaurant_leads" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceSite" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cuisine" TEXT,
    "address" TEXT,
    "neighborhood" TEXT,
    "pricePerPerson" DECIMAL(10,2),
    "discount" TEXT,
    "votes" INTEGER,
    "foodRating" DECIMAL(3,1),
    "serviceRating" DECIMAL(3,1),
    "ambientRating" DECIMAL(3,1),
    "imageUrl" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastScannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_leads_sourceUrl_key" ON "restaurant_leads"("sourceUrl");

-- CreateIndex
CREATE INDEX "restaurant_leads_sourceSite_idx" ON "restaurant_leads"("sourceSite");

-- CreateIndex
CREATE INDEX "restaurant_leads_firstSeenAt_idx" ON "restaurant_leads"("firstSeenAt");

-- CreateIndex
CREATE INDEX "restaurant_leads_lastScannedAt_idx" ON "restaurant_leads"("lastScannedAt");

-- CreateIndex
CREATE INDEX "restaurant_leads_name_idx" ON "restaurant_leads"("name");

-- CreateIndex
CREATE INDEX "restaurant_leads_cuisine_idx" ON "restaurant_leads"("cuisine");
