import { catalogProductInclude, toBrandDTO, toOwnerCatalogProductDTO } from "@/lib/catalog-dto";
import { prisma } from "@/lib/prisma";
import { OwnerCatalogClient } from "@/components/owner/OwnerCatalogClient";
import { getT } from "@/lib/i18n/server";

export default async function OwnerCatalogPage() {
  const t = await getT();
  const [products, brands] = await Promise.all([
    prisma.catalogProduct.findMany({
      orderBy: [{ brand: "asc" }, { name: "asc" }],
      include: catalogProductInclude,
    }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
  ]);

  const initial = products.map(toOwnerCatalogProductDTO);
  const brandDtos = brands.map(toBrandDTO);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">{t("owner.catalog.warehousePageTitle")}</h1>
      <OwnerCatalogClient initial={initial} brands={brandDtos} />
    </div>
  );
}
