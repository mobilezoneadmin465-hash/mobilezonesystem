CREATE TABLE "ProductImei" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'WAREHOUSE',
    "srId" TEXT,
    "shopId" TEXT,
    "deliveryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductImei_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductImei_imei_key" ON "ProductImei"("imei");
CREATE INDEX "ProductImei_productId_location_idx" ON "ProductImei"("productId", "location");
CREATE INDEX "ProductImei_srId_productId_idx" ON "ProductImei"("srId", "productId");
CREATE INDEX "ProductImei_shopId_productId_idx" ON "ProductImei"("shopId", "productId");

ALTER TABLE "ProductImei"
ADD CONSTRAINT "ProductImei_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "CatalogProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
