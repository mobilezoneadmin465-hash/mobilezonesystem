ALTER TABLE "ShopOrderLine"
ADD COLUMN "unitCost" DECIMAL(65,30) NOT NULL DEFAULT 0;

UPDATE "ShopOrderLine" AS sol
SET "unitCost" = cp."unitCost"
FROM "CatalogProduct" AS cp
WHERE cp."id" = sol."productId";
