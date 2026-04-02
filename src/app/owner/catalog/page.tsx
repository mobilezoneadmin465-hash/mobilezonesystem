import { toBrandDTO } from "@/lib/catalog-dto";
import { prisma } from "@/lib/prisma";
import { OwnerCatalogClient } from "@/components/owner/OwnerCatalogClient";
import { getT } from "@/lib/i18n/server";

export default async function OwnerCatalogPage() {
  const t = await getT();
  const [products, brands] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        id: string;
        brandId: string | null;
        brand: string;
        name: string;
        description: string | null;
        warehouseQty: number;
        unitPrice: string;
        unitCost: string;
        unitMrp: string;
      }>
    >`
      SELECT
        cp."id" AS "id",
        cp."brandId" AS "brandId",
        cp."brand" AS "brand",
        cp."name" AS "name",
        cp."description" AS "description",
        cp."warehouseQty" AS "warehouseQty",
        cp."unitPrice" AS "unitPrice",
        cp."unitCost" AS "unitCost",
        cp."unitMrp" AS "unitMrp"
      FROM "CatalogProduct" cp
      ORDER BY cp."brand" ASC, cp."name" ASC
    `,
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
  ]);

  const initial = products.map((p) => ({
    id: p.id,
    brandId: p.brandId,
    brand: p.brand,
    name: p.name,
    description: p.description,
    warehouseQty: p.warehouseQty,
    unitPrice: String(p.unitPrice),
    unitCost: String(p.unitCost),
    unitMrp: String(p.unitMrp),
  }));
  const brandDtos = brands.map(toBrandDTO);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
        {t("owner.catalog.warehousePageTitle")}
      </h1>
      <OwnerCatalogClient initial={initial} brands={brandDtos} />
    </div>
  );
}
